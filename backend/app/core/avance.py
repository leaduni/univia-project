"""Cálculo del avance de carrera (RF-07).

Única definición de 'cuánto llevo de mi carrera' en todo el backend.

Antes vivía duplicada y con dos reglas distintas: el resumen del onboarding lo
calculaba sobre créditos y el dashboard sobre cantidad de cursos. Para un
estudiante con cursos de 2 y de 5 créditos esos dos números no coinciden, así
que la misma persona veía un avance en una pantalla y otro en otra.

RF-07 fija la regla: el avance se mide sobre el total de créditos del plan.
"""

import logging
from typing import Dict, Iterable, Mapping, Optional, Set

logger = logging.getLogger(__name__)

# Estados de progreso_cursos que cuentan como curso llevado.
ESTADO_APROBADO = "completed"
ESTADO_EN_CURSO = "in_progress"


class AvanceCarrera:
    """Resultado del cálculo de avance, listo para serializar."""

    def __init__(
        self,
        creditos_aprobados: int = 0,
        creditos_totales: int = 0,
        creditos_en_curso: int = 0,
        cursos_aprobados: int = 0,
        cursos_en_curso: int = 0,
        cursos_totales: int = 0,
    ):
        self.creditos_aprobados = creditos_aprobados
        self.creditos_totales = creditos_totales
        self.creditos_en_curso = creditos_en_curso
        self.cursos_aprobados = cursos_aprobados
        self.cursos_en_curso = cursos_en_curso
        self.cursos_totales = cursos_totales

    @property
    def porcentaje_avance(self) -> float:
        """Avance sobre créditos del plan (RF-07). 0.0 si el plan está vacío."""
        if not self.creditos_totales:
            return 0.0
        return round(self.creditos_aprobados / self.creditos_totales * 100, 1)

    @property
    def creditos_restantes(self) -> int:
        return max(self.creditos_totales - self.creditos_aprobados, 0)

    def to_dict(self) -> dict:
        return {
            "porcentaje_avance": self.porcentaje_avance,
            "creditos_aprobados": self.creditos_aprobados,
            "creditos_en_curso": self.creditos_en_curso,
            "creditos_totales": self.creditos_totales,
            "creditos_restantes": self.creditos_restantes,
            "cursos_aprobados": self.cursos_aprobados,
            "cursos_en_curso": self.cursos_en_curso,
            "cursos_totales": self.cursos_totales,
        }


def calcular_avance(
    cursos: Mapping, progreso: Mapping
) -> AvanceCarrera:
    """Avance del estudiante a partir del catálogo de su carrera y su progreso.

    Función pura: no consulta la base. Recibe lo ya leído para poder probarse
    sin Supabase y para que quien la llame decida cómo obtener los datos.

    Args:
        cursos: {curso_id: {"credits": int, ...}} de la carrera del estudiante.
        progreso: {curso_id: status} tomado de progreso_cursos.

    Nota: los ids de ambos mapas deben ser del mismo tipo. Un progreso con
    claves int contra un catálogo con claves str no cruza nada y devolvería
    0% en silencio.
    """
    avance = AvanceCarrera(cursos_totales=len(cursos))

    for curso_id, curso in cursos.items():
        creditos = (curso or {}).get("credits") or 0
        avance.creditos_totales += creditos

        estado = progreso.get(curso_id)
        if estado == ESTADO_APROBADO:
            avance.cursos_aprobados += 1
            avance.creditos_aprobados += creditos
        elif estado == ESTADO_EN_CURSO:
            avance.cursos_en_curso += 1
            avance.creditos_en_curso += creditos

    # Un progreso que apunta a cursos fuera del catálogo suele ser un cambio de
    # carrera mal migrado: no rompe el cálculo, pero conviene saberlo.
    huerfanos = set(progreso) - set(cursos)
    if huerfanos:
        logger.warning(
            f"{len(huerfanos)} curso(s) con progreso fuera del catálogo de la carrera; "
            "no cuentan para el avance."
        )

    return avance


def cargar_avance(supabase, perfil_id, carrera_id) -> AvanceCarrera:
    """Lee catálogo y progreso desde Supabase y devuelve el avance."""
    try:
        cursos_resp = (
            supabase.table("cursos")
            .select("id, credits")
            .eq("carrera_id", carrera_id)
            .execute()
        )
        cursos = {c["id"]: c for c in (getattr(cursos_resp, "data", None) or [])}

        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status")
            .eq("perfil_id", perfil_id)
            .execute()
        )
        progreso = {
            p["curso_id"]: p["status"]
            for p in (getattr(progreso_resp, "data", None) or [])
        }
    except Exception as e:
        logger.error(f"Error cargando avance de {perfil_id}: {e}")
        raise

    return calcular_avance(cursos, progreso)
