"""
Pydantic models for Resources
"""
from pydantic import BaseModel
from typing import Optional

class Recurso(BaseModel):
    id: int
    title: str
    code: str
    semester: str
    type: str  # "Examen", "Práctica", "Libro", "Apunte"
    ciclo: int
    facultad: str
    year: int
    downloads: int
    rating: float
    preview: bool
    hasSolucionario: bool
