import fitz
import os

silabos_dir = "scrapeo/silabos"
output_file = "scrapeo/all_syllabi_text.txt"

with open(output_file, "w", encoding="utf-8") as out:
    if not os.path.exists(silabos_dir):
        print(f"Directory {silabos_dir} not found.")
        exit()

    files = [f for f in os.listdir(silabos_dir) if f.lower().endswith('.pdf')]
    
    for filename in files:
        path = os.path.join(silabos_dir, filename)
        try:
            doc = fitz.open(path)
            text = ""
            for page in doc:
                text += page.get_text()
            
            out.write(f"=== START FILE: {filename} ===\n")
            out.write(text)
            out.write(f"\n=== END FILE: {filename} ===\n\n")
            print(f"Processed {filename}")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

print(f"All text extracted to {output_file}")
