# Extractor de texto
import os
import time
import google.generativeai as genai 
from pdf2image import convert_from_path
from dotenv import load_dotenv

load_dotenv()

class SyllabusExtractor():
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Error obteniendo la API KEY. ")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    
    def extract_text(self, pdf_path: str) -> str:
        if not os.path.exists(pdf_path):
            print("Error: No se encontró la ruta del archivo. ")
            return ""

        print(f"Iniciando la extracción de {pdf_path} ... ")
        texto_completo = ""

        try:
            images = convert_from_path(pdf_path, dpi=200)
            prompt = (
                "Eres un sistema de extracción de datos académicos. "
                "Extrae toda la información de esta página a formato Markdown.\n\n"
                "REGLAS:\n"
                "1. Mantén la jerarquía visual (títulos, listas).\n"
                "2. Escribe TODAS las fórmulas matemáticas usando sintaxis LaTeX.\n"
                "3. Si hay tablas, usa el formato de tablas de Markdown.\n"
                "4. Extrae los datos con tus propias palabras si es necesario para mantener la coherencia, pero no omitas ningún tema, fórmula o inciso.\n"
                "5. Devuelve ÚNICAMENTE el Markdown."
            )

            for i, image in enumerate(images):
                response = self.model.generate_content([prompt, image])

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
        

if __name__ == "__main__":
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    test_pdf = os.path.join(root_dir, "scrapeo", "silabos", "BF101-Fisica.pdf")

    extractor = SyllabusExtractor()
    texto_extraido = extractor.extract_text(test_pdf)

    if texto_extraido:
        print(texto_extraido[:500] + "\n...")