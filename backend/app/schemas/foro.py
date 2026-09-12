"""Schemas del Foro (Fase 1: secciones, publicaciones y comentarios).

Contratos Pydantic para el router `app/routers/foro.py`. Siguen el estilo de
`schemas/onboarding.py`: validadores con mensajes claros y cotas defensivas.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

# Cota del cuerpo de una publicación/comentario. Libre de la cuota del LLM, pero
# no debe permitir volcados gigantes: el foro es texto de discusión, no archivos.
MAX_TITULO = 255
MAX_CUERPO = 20000
MAX_TAGS = 8
MAX_TAG_LEN = 30


def _limpiar_tag(tag: str) -> str:
    return tag.strip().lower()


class SeccionCreate(BaseModel):
    """Nueva sección del foro (global o por facultad). Solo moderadores."""

    tipo: str = Field(pattern="^(global|facultad)$")
    titulo: str = Field(min_length=1, max_length=MAX_TITULO)
    descripcion: Optional[str] = Field(default=None, max_length=1000)
    # Obligatorio cuando tipo = 'facultad'.
    facultad_id: Optional[int] = None

    @field_validator("titulo")
    @classmethod
    def validar_titulo(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("El título de la sección no puede estar vacío.")
        return t


class SeccionOut(BaseModel):
    id: int
    tipo: str
    titulo: str
    descripcion: Optional[str] = None
    facultad_id: Optional[int] = None
    activa: bool
    # Para la lista de secciones: nº de publicaciones por sección.
    num_publicaciones: int = 0
    # Nombre de la facultad, si el canal es por facultad (para la UI).
    facultad_nombre: Optional[str] = None


class PublicacionCreate(BaseModel):
    """Nueva publicación (hilo) dentro de una sección."""

    seccion_id: int = Field(gt=0)
    titulo: str = Field(min_length=1, max_length=MAX_TITULO)
    cuerpo: str = Field(min_length=1, max_length=MAX_CUERPO)
    tags: List[str] = Field(default_factory=list)

    @field_validator("titulo")
    @classmethod
    def validar_titulo(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("El título de la publicación no puede estar vacío.")
        return t

    @field_validator("cuerpo")
    @classmethod
    def validar_cuerpo(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("El cuerpo de la publicación no puede estar vacío.")
        return t

    @field_validator("tags")
    @classmethod
    def validar_tags(cls, v: List[str]) -> List[str]:
        limpias = [t for t in (_limpiar_tag(x) for x in v) if t]
        if len(limpias) > MAX_TAGS:
            raise ValueError(f"No puedes usar más de {MAX_TAGS} etiquetas.")
        if any(len(t) > MAX_TAG_LEN for t in limpias):
            raise ValueError(f"Cada etiqueta debe tener máximo {MAX_TAG_LEN} caracteres.")
        return list(dict.fromkeys(limpias))


class PublicacionOut(BaseModel):
    id: int
    seccion_id: int
    autor_perfil_id: str
    autor_nombre: Optional[str] = None
    titulo: str
    cuerpo: str
    tags: List[str] = Field(default_factory=list)
    estado: str
    created_at: datetime
    # Conteos para la lista de hilos.
    num_comentarios: int = 0
    # Puntuación del hilo (Fase 2).
    num_votos: int = 0
    mi_voto: int = 0
    # Sugerencia IA del bot (Fase 4). None si aún no hay.
    sugerencia_ia: Optional[dict] = None


class ComentarioCreate(BaseModel):
    """Nuevo comentario en una publicación (opcionalmente respuesta a otro)."""

    publicacion_id: int = Field(gt=0)
    parent_id: Optional[int] = None
    cuerpo: str = Field(min_length=1, max_length=MAX_CUERPO)

    @field_validator("cuerpo")
    @classmethod
    def validar_cuerpo(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("El comentario no puede estar vacío.")
        return t


class ComentarioOut(BaseModel):
    id: int
    publicacion_id: int
    autor_perfil_id: str
    autor_nombre: Optional[str] = None
    parent_id: Optional[int] = None
    cuerpo: str
    created_at: datetime
    # Puntuación del comentario (Fase 2).
    num_votos: int = 0
    mi_voto: int = 0
    # Marca de solución del hilo (Fase 4).
    es_solucion: bool = False


class VotoCreate(BaseModel):
    """Voto up/down sobre una publicación o un comentario.

    Exactamente uno de `publicacion_id` o `comentario_id` debe venir (nunca
    ambos ni ninguno), igual que el CHECK de la tabla foro_votos.
    """

    publicacion_id: Optional[int] = None
    comentario_id: Optional[int] = None
    valor: int = Field(ge=-1, le=1)

    @field_validator("valor")
    @classmethod
    def validar_valor(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("El voto debe ser 1 (up) o -1 (down).")
        return v

    @field_validator("publicacion_id", "comentario_id")
    @classmethod
    def validar_objetivo(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("El identificador del objetivo es inválido.")
        return v


class VotoOut(BaseModel):
    id: int
    autor_perfil_id: str
    publicacion_id: Optional[int] = None
    comentario_id: Optional[int] = None
    valor: int
    # Resultado tras aplicar el voto: puntuación total y voto vigente del usuario.
    num_votos: int = 0
    mi_voto: int = 0


class ResolverRequest(BaseModel):
    """Marca una respuesta (o la sugerencia IA) como la solución del hilo.

    Exactamente una de `comentario_id` o `aceptar_sugerencia_ia` debe venir.
    Solo el autor de la publicación puede llamar este endpoint.
    """

    comentario_id: Optional[int] = None
    aceptar_sugerencia_ia: bool = False


class ModeradorCreate(BaseModel):
    """Asigna un moderador. Solo vía backend (service_role)."""

    perfil_id: str = Field(min_length=36)