import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from app.rag.retriever import SyllabusRetriever

retriever = SyllabusRetriever()
print("Buscando Cálculo Diferencial (Curso ID 12)")
res1 = retriever.buscar_contexto_por_nombre("Derivadas", curso_nombre="Cálculo Diferencial", limit=3)
print("Diferencial:", res1)

print("Buscando Cálculo Integral (Curso ID 18)")
res2 = retriever.buscar_contexto_por_nombre("Integrales", curso_nombre="Cálculo Integral", limit=3)
print("Integral:", res2)

