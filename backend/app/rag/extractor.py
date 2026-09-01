import base64
import io as _io
import os
import re
import threading
import time
import random
import logging
from pathlib import Path
from typing import Optional, Tuple

from pdf2image import convert_from_path, pdfinfo_from_path
from dotenv import load_dotenv

from app.core.llm import (
    MODELO_INGESTA, MODELO_VISION_GEMINI, generar_ingesta, generar_ingesta_gemini,
    get_gemini_vision, get_openai, texto_ingesta,
)
from app.rag.cost_tracker import cost_tracker


for candidate in [
    Path(__file__).resolve().parent / ".env",
    Path(__file__).resolve().parents[1] / ".env",
    Path(__file__).resolve().parents[2] / ".env",
    Path.cwd() / ".env",
]:
    if candidate.exists():
        load_dotenv(candidate)
        break
else:
    load_dotenv()

POPPLER_PATH = os.getenv("POPPLER_PATH") or None

# Más de ~1568 px de lado largo no mejora el OCR y sí cuesta más tokens de
# imagen, así que la página se reescala antes de mandarla.
MAX_LADO_IMAGEN = 1568
# JPEG en vez de PNG: una página escaneada pesa varias veces menos y el OCR
# no nota la diferencia a esta calidad.
CALIDAD_JPEG = 90

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

PROMPT_SILABO = (
    "Eres un sistema de extracción de datos académicos. "
    "Extrae toda la información de esta página a formato Markdown.\n\n"
    "REGLAS:\n"
    "1. Mantén la jerarquía visual (títulos, listas).\n"
    "2. Escribe TODAS las fórmulas matemáticas usando sintaxis LaTeX.\n"
    "3. Si hay tablas, usa el formato de tablas de Markdown.\n"
    "4. No omitas ningún tema, fórmula o inciso.\n"
    "5. Devuelve ÚNICAMENTE el Markdown."
)

PROMPT_EXAMENES = (
    "Eres un sistema experto en digitalizar exámenes universitarios escaneados de la UNI.\n"
    "Esta imagen es una página con uno o varios EJERCICIOS, posiblemente manuscritos.\n\n"
    "TU TAREA: transcribir fielmente CADA ENUNCIADO, SIN resolverlo.\n\n"
    "REGLAS:\n"
    "1. Cada ejercicio inicia con '### Ejercicio N'. Si no hay número, numéralos en orden.\n"
    "2. Toda notación matemática en LaTeX: $...$ en línea, $$...$$ en bloque.\n"
    "3. NO resuelvas. Solo el enunciado.\n"
    "4. Si hay encabezado de examen (curso, fecha, práctica N°), transcríbelo antes de los ejercicios.\n"
    "5. Mantén los incisos (a, b, c) dentro del mismo ejercicio.\n"
    "6. Ignora sellos, marcas de agua y anotaciones al margen.\n"
    "7. Si la página no tiene ejercicios legibles, devuelve cadena vacía.\n"
    "8. Devuelve ÚNICAMENTE el Markdown."
)

PROMPT_SALVAGE = (
    "Transcribe únicamente el texto legible de esta página académica. "
    "Si hay ejercicios, sepáralos con '### Ejercicio N'. "
    "Usa LaTeX para toda expresión matemática. "
    "No resuelvas nada. No inventes texto. "
    "Si algo no se distingue, omítelo."
)

MODOS = {"silabo": PROMPT_SILABO, "examenes": PROMPT_EXAMENES}

BLOQUE_RE = re.compile(
    r"<!-- === INICIO PAGINA (?P<n1>\d+) === -->\n\n(?P<contenido>.*?)\n\n<!-- === FIN PAGINA (?P=n1) === -->"
    r"|<!-- === PAGINA (?P<n2>\d+)[^\n]*=== -->",
    re.DOTALL,
)


def es_sospechosa(texto: str) -> bool:
    if not texto:
        return False
    t = texto.lower()
    return any(f in t for f in [
        "transcriba fielmente", "reglas estrictas", "no resuelvas los ejercicios",
        "transcribe cada ejercicio", "devuelve únicamente el markdown",
        "as an ai", "i cannot", "no puedo", "como ia",
    ])


def limpiar(texto: str) -> str:
    texto = texto.replace("\r", "")
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


class SyllabusExtractor:
    """OCR de páginas en cascada de tres niveles (ver docs/PLAN_CHATBOT.md):

        0. Texto nativo del PDF  -> HybridRouter (pypdf). Gratis, instantáneo.
                                    Lo decide quien llama, con hybrid=True.
        1. Gemini Vision         -> free tier. Para páginas escaneadas.
        2. OpenAI Vision         -> pagado. Solo cuando Gemini agota su cuota
                                    diaria, para que la corrida no se corte.

    El nivel 2 importa porque la cuota diaria de Gemini (1.000 req/día en el
    free tier) se agota a mitad de un backlog grande: sin este fallback la
    ingesta se detenía y había que esperar al reset del día siguiente.
    """

    def __init__(self, model_name=None, rpm=8, max_retries=6, timeout=120,
                 proveedor_vision=None, permitir_fallback_openai=True):
        # Gemini es el proveedor por defecto para el OCR de Vision (cuenta
        # separada de la de OpenAI, que se agota más rápido por volumen). Si
        # GEMINI_VISION_API_KEY no está configurada, cae a OpenAI para no
        # romper entornos que todavía no la tienen.
        self.proveedor_vision = proveedor_vision or ("gemini" if get_gemini_vision() is not None else "openai")

        if self.proveedor_vision == "gemini":
            if get_gemini_vision() is None:
                raise RuntimeError("GEMINI_VISION_API_KEY no configurada en .env")
            model_name = model_name or MODELO_VISION_GEMINI
        else:
            if get_openai() is None:
                raise RuntimeError("OPEN_AI_INGEST_API_KEY no configurada en .env")
            model_name = model_name or MODELO_INGESTA

        self.model_name = model_name
        # Proveedor EN USO. Arranca igual que proveedor_vision pero puede
        # cambiar a "openai" a mitad de corrida si Gemini agota su cuota
        # diaria; proveedor_vision guarda con cuál se empezó.
        self.proveedor_actual = self.proveedor_vision
        self.permitir_fallback_openai = permitir_fallback_openai
        self._lock_fallback = threading.Lock()

        self.min_interval = 60.0 / max(1, rpm)
        self.max_retries = max_retries
        self.timeout = timeout
        self._last_call = 0.0
        self.last_run_stats = {}
        logger.info(
            f"Extractor listo | proveedor={self.proveedor_vision} modelo={model_name} "
            f"rpm={rpm} reintentos={max_retries} fallback_openai={permitir_fallback_openai}"
        )

    def _cambiar_a_openai(self) -> bool:
        """Pasa el OCR a OpenAI tras agotarse la cuota diaria de Gemini.

        Devuelve True si a partir de ahora se usa OpenAI (recién cambiado o ya
        cambiado por otra página en paralelo), False si no hay a dónde caer.

        Va con lock porque el camino async procesa varias páginas a la vez y
        todas chocan contra la misma cuota casi al mismo tiempo: sin esto se
        registraría el cambio una vez por página en vuelo.
        """
        with self._lock_fallback:
            if self.proveedor_actual == "openai":
                return True
            if not self.permitir_fallback_openai or get_openai() is None:
                return False

            self.proveedor_actual = "openai"
            self.model_name = MODELO_INGESTA
            logger.warning(
                "[Fallback] Cuota diaria de Gemini agotada. El OCR continúa con "
                f"OpenAI ({MODELO_INGESTA}), que es de pago."
            )
            return True

    def _throttle(self):
        wait = self.min_interval - (time.monotonic() - self._last_call)
        if wait > 0:
            time.sleep(wait)
        self._last_call = time.monotonic()

    @staticmethod
    def _es_cuota_diaria(e: Exception) -> bool:
        s = str(e).lower().replace(" ", "").replace("-", "")
        return "perday" in s or "dailylimit" in s

    @staticmethod
    def _es_retryable(e: Exception) -> bool:
        s = str(e).lower()
        return any(k in s for k in ["429", "quota", "resourceexhausted", "503", "500", "timeout", "overloaded"])

    @staticmethod
    def _imagen_b64(image) -> str:
        """Página (PIL Image) reescalada y codificada en JPEG base64."""
        img = image.convert("RGB")
        lado = max(img.size)
        if lado > MAX_LADO_IMAGEN:
            factor = MAX_LADO_IMAGEN / lado
            img = img.resize((int(img.width * factor), int(img.height * factor)))
        buffer = _io.BytesIO()
        img.save(buffer, format="JPEG", quality=CALIDAD_JPEG)
        return base64.standard_b64encode(buffer.getvalue()).decode()

    def _llamar_modelo(self, prompt, image, page_num):
        # La imagen se codifica una sola vez aunque haya reintentos o cambio de
        # proveedor: el JPEG en base64 es idéntico para Gemini y para OpenAI.
        imagen_b64 = self._imagen_b64(image)
        last_exc = None
        for attempt in range(1, self.max_retries + 1):
            # Se resuelve en cada vuelta, no antes del bucle: otra página en
            # paralelo puede haber cambiado el proveedor mientras esperábamos.
            llamar = generar_ingesta_gemini if self.proveedor_actual == "gemini" else generar_ingesta
            try:
                self._throttle()
                # Se cuenta por proveedor: las páginas que atendió Gemini son
                # gratis y las de OpenAI se pagan, así que este desglose es lo
                # que permite saber cuánto costó una corrida.
                clave = f"vision_calls_{self.proveedor_actual}"
                self.last_run_stats[clave] = self.last_run_stats.get(clave, 0) + 1
                response = llamar(
                    prompt=prompt,
                    imagen_b64=imagen_b64,
                    max_tokens=8000,
                    modelo=self.model_name,
                )
                usage = getattr(response, "usage", None)
                cost_tracker.registrar_vision(
                    getattr(usage, "prompt_tokens", 0) or 0,
                    getattr(usage, "completion_tokens", 0) or 0,
                )
                return response
            except Exception as e:
                last_exc = e
                if self._es_cuota_diaria(e):
                    # Nivel 2 de la cascada: la cuota diaria de Gemini no se
                    # recupera esperando, así que reintentar contra él es
                    # tiempo perdido. Se pasa a OpenAI y se reintenta ya.
                    if self._cambiar_a_openai():
                        logger.info(f"[p{page_num}] Reintentando la página con OpenAI.")
                        continue
                    logger.error(f"[p{page_num}] Cuota DIARIA agotada y sin fallback. Progreso guardado. Reintenta mañana.")
                    raise
                if "safety" in str(e).lower() or "blocked" in str(e).lower():
                    raise
                if not self._es_retryable(e) or attempt >= self.max_retries:
                    raise
                wait = min(120, 15 * attempt) if "429" in str(e) or "quota" in str(e).lower() else min(60, 2 ** attempt)
                wait += random.uniform(0, 3)
                logger.warning(f"[p{page_num}] {type(e).__name__} — intento {attempt}/{self.max_retries}, esperando {wait:.1f}s")
                time.sleep(wait)
        raise RuntimeError(f"Página {page_num}: falló tras {self.max_retries} intentos") from last_exc

    @staticmethod
    def _get_text(response) -> Tuple[Optional[str], Optional[str]]:
        """(texto, None) si la página se leyó; (None, motivo) si no."""
        try:
            eleccion = response.choices[0]
        except (AttributeError, IndexError):
            return None, "SIN_RESPUESTA"
        motivo_corte = getattr(eleccion, "finish_reason", None) or "DESCONOCIDO"
        if motivo_corte == "content_filter":
            return None, "FILTRO_DE_CONTENIDO"
        try:
            texto = texto_ingesta(response)
        except (ValueError, AttributeError) as exc:
            return None, f"ERROR_TEXTO ({motivo_corte}): {exc}"
        if not texto or not texto.strip():
            return None, f"VACIA ({motivo_corte})"
        return limpiar(texto), None

    @staticmethod
    def _find_completed_pages(texto: str) -> set:
        return {int(n) for n in re.findall(r"INICIO PAGINA (\d+)", texto)}

    @staticmethod
    def _find_all_attempted(texto: str) -> set:
        return {int(n) for n in re.findall(r"PAGINA (\d+)\b", texto)}

    @staticmethod
    def _bloque_ok(n, texto):
        return f"\n\n<!-- === INICIO PAGINA {n} === -->\n\n{texto}\n\n<!-- === FIN PAGINA {n} === -->\n\n"

    @staticmethod
    def _append(path, content):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(content)

    def _cargar_progreso(self, output_path, skip_failed=False) -> Tuple[str, set]:
        if output_path and os.path.exists(output_path):
            texto = open(output_path, encoding="utf-8").read()
            completados = self._find_all_attempted(texto) if skip_failed else self._find_completed_pages(texto)
            logger.info(f"Reanudando: {len(completados)} páginas omitidas.")
            return texto, completados
        return "", set()

    def extract_text(self, pdf_path, modo="examenes", output_path=None, dpi=200, salvage=True, skip_failed=False):
        pdf_path = str(pdf_path)
        if not os.path.exists(pdf_path):
            logger.error(f"Archivo no encontrado: {pdf_path}")
            return ""

        try:
            total = int(pdfinfo_from_path(pdf_path, poppler_path=POPPLER_PATH)["Pages"])
        except Exception as e:
            logger.error(f"No se pudo leer el PDF: {e}")
            return ""

        if total > 30:
            logger.warning(f"El PDF tiene {total} páginas. Optimizado para hasta 30 — la cuota puede agotarse antes de terminar.")

        prompt = MODOS.get(modo, PROMPT_SILABO)
        texto_completo, done = self._cargar_progreso(output_path, skip_failed)
        logger.info(f"[Extracción] Iniciando '{pdf_path}' | {total} págs | modo={modo} | dpi={dpi}")
        if done:
            logger.info(f"[Checkpoint] {len(done)} página(s) encontrada(s) en caché local, se saltan llamadas a Vision.")

        for n in range(1, total + 1):
            if n in done:
                continue

            try:
                image = convert_from_path(pdf_path, dpi=dpi, first_page=n, last_page=n, poppler_path=POPPLER_PATH)[0]
            except Exception as e:
                bloque = f"\n\n<!-- === PAGINA {n} ERROR_CONVERSION: {e} === -->\n\n"
                texto_completo += bloque
                if output_path:
                    self._append(output_path, bloque)
                logger.error(f"[Extracción] ERROR página {n}/{total}: {e}")
                continue

            bloque = ""
            cuota_diaria = False

            try:
                response = self._llamar_modelo(prompt, image, n)
                texto, motivo = self._get_text(response)

                if texto and not es_sospechosa(texto):
                    bloque = self._bloque_ok(n, texto)
                    logger.info(f"[Extracción] Página {n}/{total} OK ({len(texto)} caracteres)")
                elif salvage and modo == "examenes":
                    logger.warning(f"[Extracción] Página {n}/{total} vacía/sospechosa ({motivo}). Intentando rescate...")
                    response2 = self._llamar_modelo(PROMPT_SALVAGE, image, n)
                    texto2, motivo2 = self._get_text(response2)
                    if texto2 and not es_sospechosa(texto2):
                        bloque = self._bloque_ok(n, texto2)
                        logger.info(f"[Extracción] Página {n}/{total} Rescate OK ({len(texto2)} caracteres)")
                    else:
                        bloque = f"\n\n<!-- === PAGINA {n} NO_LEGIBLE ({motivo2 or motivo}) === -->\n\n"
                        logger.warning(f"[Extracción] Página {n}/{total} No legible tras rescate")
                else:
                    bloque = f"\n\n<!-- === PAGINA {n} BLOQUEADA ({motivo}) === -->\n\n"
                    logger.warning(f"[Extracción] Página {n}/{total} Bloqueada: {motivo}")

            except Exception as e:
                if self._es_cuota_diaria(e):
                    cuota_diaria = True
                else:
                    bloque = f"\n\n<!-- === PAGINA {n} FALLO: {e} === -->\n\n"
                    logger.error(f"[Extracción] Página {n}/{total} Falló definitivamente: {e}")
            finally:
                try:
                    del image
                except Exception:
                    pass

            if bloque:
                texto_completo += bloque
                if output_path:
                    self._append(output_path, bloque)

            if cuota_diaria:
                break

        logger.info(f"[Extracción] Finalizada | {len(texto_completo)} caracteres totales")
        return texto_completo

    # ── Async extraction methods (Phase 2) ──────────────────────────

    async def extract_text_async(
        self,
        pdf_path: str,
        modo: str = "examenes",
        dpi: int = 200,
        salvage: bool = True,
        max_concurrency: int = 8,
        hybrid: bool = False,
        forzar_nativo: bool = False,
    ) -> str:
        """
        Extrae texto de un PDF de forma asincrona con checkpoints por pagina.

        Args:
            pdf_path: Ruta al PDF.
            modo: 'silabo' o 'examenes'.
            dpi: Resolucion de imagen.
            salvage: Si reintentar con prompt simplificado en fallos.
            max_concurrency: Maximo de paginas procesadas simultaneamente.
            hybrid: Si usar HybridRouter para extraccion nativa cuando sea posible.

        Returns:
            Texto Markdown completo (reensamblado en orden de pagina).
        """
        import asyncio
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        pdf_path = str(pdf_path)
        if not os.path.exists(pdf_path):
            logger.error(f"Archivo no encontrado: {pdf_path}")
            return ""

        try:
            total = int(pdfinfo_from_path(pdf_path, poppler_path=POPPLER_PATH)["Pages"])
        except Exception as e:
            logger.error(f"No se pudo leer el PDF: {e}")
            return ""

        router = None
        if hybrid:
            from app.rag.hybrid_router import HybridRouter
            router = HybridRouter()

        checkpoint = ExtractionCheckpoint(pdf_path)
        prompt = MODOS.get(modo, PROMPT_SILABO)

        return await self._run_async_extraction(
            pdf_path=pdf_path,
            total_pages=total,
            modo=modo,
            dpi=dpi,
            salvage=salvage,
            max_concurrency=max_concurrency,
            checkpoint=checkpoint,
            router=router,
            forzar_nativo=forzar_nativo,
        )

    async def _run_async_extraction(
        self,
        pdf_path: str,
        total_pages: int,
        modo: str,
        dpi: int,
        salvage: bool,
        max_concurrency: int,
        checkpoint,
        router=None,
        forzar_nativo: bool = False,
    ) -> str:
        """Core asincrono: lanza tareas por pagina con AdaptiveSemaphore."""
        import asyncio
        from app.rag.adaptive_semaphore import AdaptiveSemaphore

        prompt = MODOS.get(modo, PROMPT_SILABO)
        completed = checkpoint.completed_pages()
        self.last_run_stats = {
            "total_pages": total_pages,
            "resumed_pages": len(completed),
            "native_pages": 0,
            "vision_pages": 0,
            "vision_calls": 0,
            # Desglose por proveedor: gemini es gratis, openai se paga.
            "vision_calls_gemini": 0,
            "vision_calls_openai": 0,
            "completed_pages": len(completed),
            "failed_pages": 0,
        }
        if completed:
            logger.info(
                f"[Checkpoint] {len(completed)} pagina(s) encontrada(s) en "
                f"cache local, se saltan llamadas a Vision."
            )

        pending = [n for n in range(1, total_pages + 1) if n not in completed]
        if not pending:
            logger.info("[Resume] Todas las paginas ya estan procesadas. Nada que hacer.")
            return checkpoint.read_all()

        logger.info(
            f"[Extraccion Async] {len(pending)}/{total_pages} paginas pendientes "
            f"(concurrencia max: {max_concurrency})"
        )

        sem = AdaptiveSemaphore(initial=max_concurrency, min_concurrency=1)
        quota_exhausted = False
        rate_limits = 0
        RATE_LIMIT_THRESHOLD = 3  # reducir concurrencia tras N rate limits

        async def process_page(n: int):
            nonlocal quota_exhausted, rate_limits
            if quota_exhausted:
                return
            await sem.acquire()
            try:
                t_start = time.time()
                logger.info(f"[Async Extractor] Tarea iniciada para pagina {n}/{total_pages}...")
                try:
                    await self._extract_page_async(
                        page_num=n,
                        total=total_pages,
                        pdf_path=pdf_path,
                        prompt=prompt,
                        modo=modo,
                        dpi=dpi,
                        salvage=salvage,
                        checkpoint=checkpoint,
                        router=router,
                        forzar_nativo=forzar_nativo,
                    )
                    if n in checkpoint.completed_pages():
                        sem.maybe_recover()
                    elapsed = round(time.time() - t_start, 2)
                    logger.info(f"[Async Extractor] Pagina {n}/{total_pages} completada en {elapsed}s.")
                except Exception as e:
                    if self._es_cuota_diaria(e):
                        quota_exhausted = True
                        logger.error(f"[Cuota Agotada] Pagina {n}/{total_pages}. Deteniendo.")
                    elif "429" in str(e).lower() or "quota" in str(e).lower():
                        rate_limits += 1
                        if rate_limits >= RATE_LIMIT_THRESHOLD:
                            sem.reduce()
                            rate_limits = 0
                        logger.warning(f"[Rate Limit] Pagina {n}/{total_pages}. Concurrencia actual: {sem.current}")
                    else:
                        logger.error(f"[Extraccion Async] Pagina {n}/{total_pages} fallo: {e}")
            finally:
                sem.release()

        tasks = [process_page(n) for n in pending]
        await asyncio.gather(*tasks)

        result = checkpoint.read_all()
        final_completed = checkpoint.completed_pages()
        self.last_run_stats["completed_pages"] = len(final_completed)
        self.last_run_stats["failed_pages"] = total_pages - len(final_completed)

        if quota_exhausted and len(final_completed) < total_pages:
            logger.warning(
                f"[Cuota Agotada] Progreso salvado en checkpoints locales "
                f"({len(final_completed)}/{total_pages} paginas). "
                f"Ejecuta con --resume para continuar mas tarde."
            )

        s = self.last_run_stats
        logger.info(
            f"[Extraccion Async] Finalizada | {len(result)} caracteres totales | "
            f"{len(final_completed)}/{total_pages} paginas OK"
        )
        logger.info(
            f"[Cascada] nativo(gratis)={s['native_pages']} | "
            f"gemini(gratis)={s['vision_calls_gemini']} | "
            f"openai(pagado)={s['vision_calls_openai']} llamada(s)"
        )
        return result

    async def _extract_page_async(
        self,
        page_num: int,
        total: int,
        pdf_path: str,
        prompt: str,
        modo: str,
        dpi: int,
        salvage: bool,
        checkpoint,
        router=None,
        forzar_nativo: bool = False,
    ) -> None:
        """Extrae una sola pagina de forma asincrona y guarda checkpoint."""
        import asyncio
        from pdf2image import convert_from_path

        if forzar_nativo:
            from app.rag.hybrid_router import HybridRouter

            loop = asyncio.get_running_loop()
            native_text = await loop.run_in_executor(
                None, HybridRouter.extract_native_text, pdf_path, page_num
            )
            self.last_run_stats["native_pages"] += 1
            cost_tracker.registrar_nativo(1)
            checkpoint.save_page(page_num, self._bloque_ok(page_num, native_text))
            logger.info(
                f"[Nativo forzado] Pagina {page_num}/{total} guardada "
                f"({len(native_text)} chars, costo $0)"
            )
            return

        # Hybrid routing: si el router decide NATIVE, usar texto directo
        if router is not None:
            decision = await router.route_page_async(pdf_path, page_num)
            ruta = decision.route.upper()
            razon = decision.reason
            logger.info(
                f"[Hibrido] Pagina {page_num}/{total} -> Enrutada a {ruta} "
                f"(Razon: {razon})"
            )
            if decision.route == "native":
                self.last_run_stats["native_pages"] += 1
                cost_tracker.registrar_nativo(1)
                bloque = (
                    f"\n\n<!-- === INICIO PAGINA {page_num} === -->\n\n"
                    f"{decision.native_text}\n\n"
                    f"<!-- === FIN PAGINA {page_num} === -->\n\n"
                )
                checkpoint.save_page(page_num, bloque)
                logger.info(
                    f"[Checkpoint] Guardado archivo separado: pagina_{page_num:03d}.md "
                    f"({len(decision.native_text)} chars, costo $0, <50ms)"
                )
                return

        # Vision path
        self.last_run_stats["vision_pages"] += 1
        loop = asyncio.get_running_loop()
        try:
            image = await loop.run_in_executor(
                None,
                lambda: convert_from_path(
                    pdf_path, dpi=dpi, first_page=page_num, last_page=page_num,
                    poppler_path=POPPLER_PATH
                )[0]
            )
        except Exception as e:
            bloque = f"\n\n<!-- === PAGINA {page_num} ERROR_CONVERSION: {e} === -->\n\n"
            checkpoint.save_page(page_num, bloque)
            logger.error(f"[Extracción] ERROR pagina {page_num}/{total}: {e}")
            return

        bloque = ""
        try:
            self.last_run_stats["vision_calls"] += 1
            response = self._llamar_modelo(prompt, image, page_num)
            texto, motivo = self._get_text(response)

            if texto and not es_sospechosa(texto):
                bloque = self._bloque_ok(page_num, texto)
                logger.info(f"[Extracción] Pagina {page_num}/{total} OK ({len(texto)} caracteres)")
            elif salvage and modo == "examenes":
                logger.warning(f"[Extracción] Pagina {page_num}/{total} sospechosa. Rescate...")
                self.last_run_stats["vision_calls"] += 1
                response2 = self._llamar_modelo(PROMPT_SALVAGE, image, page_num)
                texto2, motivo2 = self._get_text(response2)
                if texto2 and not es_sospechosa(texto2):
                    bloque = self._bloque_ok(page_num, texto2)
                    logger.info(f"[Extracción] Pagina {page_num}/{total} Rescate OK")
                else:
                    bloque = f"\n\n<!-- === PAGINA {page_num} NO_LEGIBLE === -->\n\n"
            else:
                bloque = f"\n\n<!-- === PAGINA {page_num} BLOQUEADA ({motivo}) === -->\n\n"
        except Exception as e:
            raise
        finally:
            del image

        if bloque:
            checkpoint.save_page(page_num, bloque)
            logger.info(
                f"[Checkpoint] Guardado archivo separado: pagina_{page_num:03d}.md"
            )
