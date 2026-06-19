# Extractor de texto
import os
import time
import json
import base64
import requests
import google.generativeai as genai
from pdf2image import convert_from_path
from dotenv import load_dotenv

load_dotenv()

# Prompt genérico: para sílabos, apuntes, libros (contenido teórico estructurado).
PROMPT_SILABO = (
    "Eres un sistema de extracción de datos académicos. "
    "Extrae toda la información de esta página a formato Markdown.\n\n"
    "REGLAS:\n"
    "1. Mantén la jerarquía visual (títulos, listas).\n"
    "2. Escribe TODAS las fórmulas matemáticas usando sintaxis LaTeX.\n"
    "3. Si hay tablas, usa el formato de tablas de Markdown.\n"
    "4. Extrae los datos con tus propias palabras si es necesario para mantener la coherencia, pero no omitas ningún tema, fórmula o inciso.\n"
    "5. Devuelve ÚNICAMENTE el Markdown."
)

# Prompt especializado: para compendios/exámenes (fotos de prácticas calificadas
# de la UNI con ejercicios manuscritos y notación matemática densa).
PROMPT_EXAMENES = (
    "Eres un sistema experto en digitalizar exámenes universitarios escaneados "
    "(prácticas calificadas, parciales, finales) de la Universidad Nacional de Ingeniería.\n"
    "Esta imagen es una página de un examen con uno o varios EJERCICIOS, posiblemente manuscritos.\n\n"
    "TU TAREA: transcribir fielmente CADA ENUNCIADO de ejercicio, SIN resolverlo.\n\n"
    "REGLAS ESTRICTAS:\n"
    "1. Transcribe cada ejercicio como una unidad independiente. Inicia cada uno con un encabezado markdown de tercer nivel que incluya su número, por ejemplo: '### Ejercicio 1'. Si la página no muestra el número, numéralos en orden de aparición.\n"
    "2. Escribe TODA la notación matemática usando sintaxis LaTeX limpia: $...$ para fórmulas en línea y $$...$$ para fórmulas en bloque. Respeta vectores (\\\\vec{AB}), proyecciones, ángulos, fracciones, integrales, límites, derivadas, etc.\n"
    "3. NO resuelvas los ejercicios. NO agregues soluciones, pasos, ni respuestas. Solo el enunciado tal como aparece.\n"
    "4. Si la página contiene un encabezado de examen (curso, código, práctica N°, fecha), transcríbelo al inicio como texto normal antes de los ejercicios.\n"
    "5. Si un ejercicio tiene incisos (a, b, c), mantenlos dentro del mismo ejercicio.\n"
    "6. Ignora elementos decorativos, sellos, marcas de agua o anotaciones al margen que no sean parte del enunciado.\n"
    "7. Si la página no contiene ningún ejercicio legible (portada, página en blanco), devuelve una cadena vacía.\n"
    "8. Devuelve ÚNICAMENTE el Markdown, sin comentarios adicionales."
)

MODOS_EXTRACCION = {
    "silabo": PROMPT_SILABO,
    "examenes": PROMPT_EXAMENES,
}

# Prompt para OLLAMA (igual al de examenes, pero sin características de Gemini)
PROMPT_EXAMENES_OLLAMA = (
    "Eres un sistema experto en digitalizar exámenes universitarios escaneados "
    "(prácticas calificadas, parciales, finales) de la Universidad Nacional de Ingeniería.\n"
    "Esta imagen es una página de un examen con uno o varios EJERCICIOS, posiblemente manuscritos.\n\n"
    "TU TAREA: transcribir fielmente CADA ENUNCIADO de ejercicio, SIN resolverlo.\n\n"
    "REGLAS ESTRICTAS:\n"
    "1. Transcribe cada ejercicio como una unidad independiente. Inicia cada uno con un encabezado markdown de tercer nivel que incluya su número, por ejemplo: '### Ejercicio 1'. Si la página no muestra el número, numéralos en orden de aparición.\n"
    "2. Escribe TODA la notación matemática usando sintaxis LaTeX limpia: $...$ para fórmulas en línea y $$...$$ para fórmulas en bloque. Respeta vectores, proyecciones, ángulos, fracciones, integrales, límites, derivadas, etc.\n"
    "3. NO resuelvas los ejercicios. NO agregues soluciones, pasos, ni respuestas. Solo el enunciado tal como aparece.\n"
    "4. Si la página contiene un encabezado de examen (curso, código, práctica N°, fecha), transcríbelo al inicio como texto normal antes de los ejercicios.\n"
    "5. Si un ejercicio tiene incisos (a, b, c), mantenlos dentro del mismo ejercicio.\n"
    "6. Ignora elementos decorativos, sellos, marcas de agua o anotaciones al margen que no sean parte del enunciado.\n"
    "7. Si la página no contiene ningún ejercicio legible (portada, página en blanco), devuelve una cadena vacía.\n"
    "8. Devuelve ÚNICAMENTE el Markdown, sin comentarios adicionales."
)


def _es_respuesta_sospechosa(texto: str, prompt: str) -> bool:
    """Heurística para detectar alucinaciones obvias de modelos de visión locales:
    cuando el modelo no "lee" la imagen y en su lugar repite (eco) fragmentos
    del propio prompt de instrucciones, o devuelve meta-comentarios sobre la tarea
    en vez de transcribir contenido real.
    """
    if not texto:
        return False

    texto_lower = texto.lower()

    # Eco literal de frases características del prompt de instrucciones.
    frases_prompt = [
        "transcriba fielmente",
        "reglas estrictas",
        "no resuelvas los ejercicios",
        "transcribe cada ejercicio",
        "devuelve únicamente el markdown",
        "ignora elementos decorativos",
    ]
    if any(frase in texto_lower for frase in frases_prompt):
        return True

    # Meta-comentarios típicos de un modelo "explicando" en vez de transcribir.
    frases_meta = [
        "this transcription follows",
        "assumes that the image provided",
        "i have transcribed",
        "as an ai",
        "i cannot",
    ]
    if any(frase in texto_lower for frase in frases_meta):
        return True

    return False


class SyllabusExtractor():
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Error obteniendo la API KEY. ")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def extract_text(self, pdf_path: str, modo: str = "silabo") -> str:
        if not os.path.exists(pdf_path):
            print("Error: No se encontró la ruta del archivo. ")
            return ""

        prompt = MODOS_EXTRACCION.get(modo, PROMPT_SILABO)
        print(f"Iniciando la extracción de {pdf_path} (modo: {modo}) ... ")
        texto_completo = ""

        try:
            images = convert_from_path(pdf_path, dpi=200)

            for i, image in enumerate(images):
                response = None
                intentos = 0
                max_intentos = 5

                # Reintentos con backoff ante errores de cuota (429), como en el embedder.
                while intentos < max_intentos:
                    try:
                        response = self.model.generate_content([prompt, image])
                        break
                    except Exception as e:
                        error_str = str(e)
                        if "429" in error_str or "Quota" in error_str or "quota" in error_str:
                            intentos += 1
                            espera = 15 * intentos
                            print(f"Límite de cuota detectado en la página {i + 1}. "
                                  f"Esperando {espera}s (intento {intentos}/{max_intentos})")
                            time.sleep(espera)
                        else:
                            print(f"Error inesperado en la página {i + 1}: {e}")
                            break

                if response is None:
                    print(f"Advertencia: no se pudo extraer la página {i + 1} (cuota agotada o error). Se omite.")
                    texto_completo += f"\n\n<!-- === PAGINA {i + 1} OMITIDA (sin respuesta) === -->\n\n"
                    time.sleep(5)
                    continue

                try:
                    texto_generado = response.text.strip()
                    texto_completo += f"\n\n<!-- === INICIO PAGINA {i + 1} === -->\n\n"
                    texto_completo += texto_generado
                    texto_completo += f"\n\n<!-- === FIN PAGINA {i + 1} === -->\n\n"
                except ValueError:
                    motivo = response.candidates[0].finish_reason.name if response.candidates else "Desconocido"
                    print(f"Error: Gemini bloqueó la página {i + 1}. Motivo: {motivo}")
                    texto_completo += f"\n\n<!-- === PAGINA {i + 1} BLOQUEADA POR FILTRO ({motivo}) === -->\n\n"

                time.sleep(5)
            
            print(f"Extraccion completada. Se extrajeron {len(texto_completo)} caracteres. ")
            return texto_completo

        except Exception as e:
            print(f"Ocurrio un error inesperado durante la extraccion: {e}")
            return ""

    def extract_text_ollama(self, pdf_path: str, ollama_url: str = "http://127.0.0.1:11434", modelo: str = "llava", modo: str = "examenes") -> str:
        """Extrae texto de PDF usando OLLAMA (modelo visión-lenguaje local, sin cuota).

        Args:
            pdf_path: ruta al PDF
            ollama_url: URL del servidor OLLAMA (default: localhost:11434)
            modelo: nombre del modelo OLLAMA (default: llava; opciones: qwen2-vl, etc)
            modo: modo de extracción ("examenes" o "silabo")
        """
        if not os.path.exists(pdf_path):
            print("Error: No se encontró la ruta del archivo. ")
            return ""

        prompt = PROMPT_EXAMENES_OLLAMA if modo == "examenes" else PROMPT_SILABO
        print(f"Iniciando extracción de {pdf_path} (modo: {modo}, OLLAMA: {modelo}) ... ")
        texto_completo = ""

        try:
            images = convert_from_path(pdf_path, dpi=200)

            for i, image in enumerate(images):
                # Convertir imagen PIL a base64 para enviar a OLLAMA
                import io
                img_buffer = io.BytesIO()
                image.save(img_buffer, format="PNG")
                img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')

                print(f"Procesando página {i + 1}/{len(images)}...")

                try:
                    # Enviar a OLLAMA vía HTTP. temperature=0 reduce alucinación
                    # (queremos transcripción fiel, no creatividad).
                    response = requests.post(
                        f"{ollama_url}/api/generate",
                        json={
                            "model": modelo,
                            "prompt": prompt,
                            "images": [img_base64],
                            "stream": False,
                            "options": {
                                "temperature": 0,
                                "top_p": 0.1,
                            },
                        },
                        timeout=300,  # 5 min timeout por página
                    )
                    response.raise_for_status()
                    data = response.json()

                    if data.get("response"):
                        texto_generado = data["response"].strip()
                        if _es_respuesta_sospechosa(texto_generado, prompt):
                            print(f"Advertencia: la página {i + 1} parece alucinada (repite el prompt o es eco). Se omite.")
                            texto_completo += f"\n\n<!-- === PAGINA {i + 1} DESCARTADA (alucinación detectada) === -->\n\n"
                        elif texto_generado:
                            texto_completo += f"\n\n<!-- === INICIO PAGINA {i + 1} === -->\n\n"
                            texto_completo += texto_generado
                            texto_completo += f"\n\n<!-- === FIN PAGINA {i + 1} === -->\n\n"
                        else:
                            print(f"Advertencia: página {i + 1} devolvió texto vacío (portada/blanca?)")
                            texto_completo += f"\n\n<!-- === PAGINA {i + 1} VACIA === -->\n\n"
                    else:
                        print(f"Advertencia: sin respuesta válida de OLLAMA para página {i + 1}")
                        texto_completo += f"\n\n<!-- === PAGINA {i + 1} SIN RESPUESTA === -->\n\n"

                except requests.exceptions.ConnectionError:
                    print(f"Error: no se pudo conectar a OLLAMA en {ollama_url}. ¿Está corriendo 'ollama serve'?")
                    raise
                except requests.exceptions.Timeout:
                    print(f"Timeout en página {i + 1}. OLLAMA tardó más de 5 min (modelo lento o sistema sobrecargado).")
                    texto_completo += f"\n\n<!-- === PAGINA {i + 1} TIMEOUT === -->\n\n"
                except Exception as e:
                    print(f"Error procesando página {i + 1}: {e}")
                    texto_completo += f"\n\n<!-- === PAGINA {i + 1} ERROR === -->\n\n"

                time.sleep(2)  # Pequeña pausa entre páginas para no saturar OLLAMA

            print(f"Extracción completada. Se extrajeron {len(texto_completo)} caracteres. ")
            return texto_completo

        except Exception as e:
            print(f"Ocurrió un error inesperado durante la extracción: {e}")
            return ""


if __name__ == "__main__":
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    test_pdf = os.path.join(root_dir, "scrapeo", "silabos", "BF101-Fisica.pdf")

    extractor = SyllabusExtractor()
    texto_extraido = extractor.extract_text(test_pdf)

    if texto_extraido:
        print(texto_extraido[:500] + "\n...")