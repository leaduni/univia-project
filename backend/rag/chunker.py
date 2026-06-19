# Divisor del texto en fragmentos
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter

class SyllabusChunker:
    def __init__(self, chunk_size=1200, chunk_overlap=200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        headers_to_split_on = [
            ("#", "Tema Principal"),
            ("##", "Subtema"),
            ("###", "Ejercicio_o_Seccion"),
        ]

        self.markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on,
            strip_headers = False
        )

        self.recursive_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )
    
    def chunk_text(self, markdown_text: str) -> list:
        if not markdown_text.strip():
            print("Texto vacio recibido en el chunker. ")
            return []
        
        print("Iniciando con el proceso de chunking ...")
        
        md_chunks = self.markdown_splitter.split_text(markdown_text)
        text_chunks = self.recursive_splitter.split_documents(md_chunks)

        chunks_to_supabase = []
        for doc in text_chunks:
            metadata = " | ".join([f"{k}: {v}" for k, v in doc.metadata.items()])
            rich_context = f"[{metadata}]\n{doc.page_content}" if metadata else doc.page_content

            chunks_to_supabase.append({
                "contenido": rich_context.strip()
            })
        
        print(f"Chunking completado. Se generaron {len(chunks_to_supabase)} fragmentos de texto. ")
        return chunks_to_supabase

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from extractor import SyllabusExtractor

    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    test_pdf = os.path.join(root_dir, "scrapeo", "silabos", "BF101-Fisica.pdf")

    extractor = SyllabusExtractor()
    texto_crudo = extractor.extract_text(test_pdf)

    if texto_crudo:
        chunker = SyllabusChunker()
        results = chunker.chunk_text(texto_crudo)

        if results:
            print(f"MOSTRAMOS EL FRAGMENTO N° 2: \n")
            print(results[1])