import os
import re
import time
import random
import logging
from pathlib import Path
from typing import Optional, Tuple

import google.generativeai as genai
from pdf2image import convert_from_path, pdfinfo_from_path
from dotenv import load_dotenv

# Carga .env buscando desde el directorio actual hacia arriba
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
    def __init__(self, model_name="gemini-2.5-flash", rpm=8, max_retries=6, timeout=120):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY no configurada en .env")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.min_interval = 60.0 / max(1, rpm)
        self.max_retries = max_retries
        self.timeout = timeout
        self._last_call = 0.0
        logger.info(f"Extractor listo | modelo={model_name} rpm={rpm} reintentos={max_retries}")

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

    def _llamar_gemini(self, prompt, image, page_num):
        last_exc = None
        for attempt in range(1, self.max_retries + 1):
            try:
                self._throttle()
                try:
                    return self.model.generate_content([prompt, image], request_options={"timeout": self.timeout})
                except TypeError:
                    return self.model.generate_content([prompt, image])
            except Exception as e:
                last_exc = e
                if self._es_cuota_diaria(e):
                    logger.error(f"[p{page_num}] Cuota DIARIA agotada. Progreso guardado. Reintenta mañana.")
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
        if not getattr(response, "candidates", None):
            motivo = getattr(getattr(response, "prompt_feedback", None), "block_reason", "SIN_CANDIDATOS")
            return None, str(motivo)
        finish = getattr(response.candidates[0], "finish_reason", None)
        finish = finish.name if finish else "DESCONOCIDO"
        if finish == "SAFETY":
            return None, "SAFETY_FILTER"
        try:
            texto = response.text
            return (limpiar(texto), None) if texto and texto.strip() else (None, f"VACIA ({finish})")
        except (ValueError, AttributeError) as exc:
            return None, f"ERROR_TEXTO ({finish}): {exc}"

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
        logger.info(f"Extrayendo '{pdf_path}' | {total} págs | modo={modo} | dpi={dpi}")

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
                logger.error(f"[p{n}/{total}] Error convirtiendo imagen: {e}")
                continue

            bloque = ""
            cuota_diaria = False

            try:
                response = self._llamar_gemini(prompt, image, n)
                texto, motivo = self._get_text(response)

                if texto and not es_sospechosa(texto):
                    bloque = self._bloque_ok(n, texto)
                    logger.info(f"[p{n}/{total}] OK ({len(texto)} chars)")
                elif salvage and modo == "examenes":
                    logger.warning(f"[p{n}/{total}] Vacío/sospechoso ({motivo}). Intentando rescate...")
                    response2 = self._llamar_gemini(PROMPT_SALVAGE, image, n)
                    texto2, motivo2 = self._get_text(response2)
                    if texto2 and not es_sospechosa(texto2):
                        bloque = self._bloque_ok(n, texto2)
                        logger.info(f"[p{n}/{total}] Rescate OK ({len(texto2)} chars)")
                    else:
                        bloque = f"\n\n<!-- === PAGINA {n} NO_LEGIBLE ({motivo2 or motivo}) === -->\n\n"
                        logger.warning(f"[p{n}/{total}] No legible tras rescate")
                else:
                    bloque = f"\n\n<!-- === PAGINA {n} BLOQUEADA ({motivo}) === -->\n\n"
                    logger.warning(f"[p{n}/{total}] Bloqueada: {motivo}")

            except Exception as e:
                if self._es_cuota_diaria(e):
                    cuota_diaria = True
                else:
                    bloque = f"\n\n<!-- === PAGINA {n} FALLO: {e} === -->\n\n"
                    logger.error(f"[p{n}/{total}] Falló definitivamente: {e}")
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

        logger.info(f"Extracción finalizada | {len(texto_completo)} chars totales")
        return texto_completo