import fitz  # PyMuPDF
import os

<<<<<<< HEAD
pdf_path = "D:/Familia/Escritorio/Work/Univia/univia-project/scrapeo/BIC01-Intro Computación-I2.pdf"

=======
pdf_path = "ilide.info-silabo-de-calculo-diferencial-fiis-uni-pr_a1312fd05ec707b1423cc44543971b1d.pdf"
>>>>>>> 901f55b (Update back y front)

if not os.path.exists(pdf_path):
    print(f"Error: El archivo {pdf_path} no existe.")
else:
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    
    # Imprimir los primeros 2000 caracteres para analizar la estructura
    print("--- INICIO DEL TEXTO EXTRAÍDO ---")
    print(full_text[:5000]) 
    print("--- FIN DEL SNAPSHOT ---")
    
    # Guardar en txt para referencia
    with open("syllabus_extracted.txt", "w", encoding="utf-8") as f:
        f.write(full_text)
    print("\n[INFO] Texto completo guardado en 'syllabus_extracted.txt'")
