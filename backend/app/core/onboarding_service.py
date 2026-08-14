"""
Onboarding RPC adapter — pure domain translation layer.

Translates the raw JSONB output of get_malla_onboarding() RPC
into domain models (CursoPrereqItem) without touching Supabase or PostgreSQL.
"""

from app.schemas.onboarding import CursoPrereqItem, PrerrequisitoFaltante


def build_onboarding_courses(
    rpc_rows: list[dict],
    carrera_id: int,
) -> list[CursoPrereqItem]:
    """
    Adaptador puro: traduce la respuesta JSON de la RPC al modelo de dominio.

    Args:
        rpc_rows: Lista de diccionarios retornada por get_malla_onboarding().
                  Cada fila contiene: curso_id, code, name, credits, ciclo,
                  tipo, status, prerrequisito_ids, prerrequisitos_faltantes.
        carrera_id: ID de la carrera para completar el modelo.

    Returns:
        Lista de CursoPrereqItem lista para serializar al frontend.

    Raises:
        ValueError: Si una fila de la RPC carece de campos obligatorios.
    """
    cursos: list[CursoPrereqItem] = []

    for row in rpc_rows:
        # Validate mandatory fields
        missing = [
            f for f in ("curso_id", "code", "name", "credits", "ciclo", "status")
            if row.get(f) is None
        ]
        if missing:
            raise ValueError(
                f"RPC row missing required fields: {missing}. Row: {row}"
            )

        # Build PrerrequisitoFaltante list from JSONB
        faltantes_raw = row.get("prerrequisitos_faltantes") or []
        faltantes = [
            PrerrequisitoFaltante(
                id=f["id"],
                code=f["code"],
                name=f["name"],
            )
            for f in faltantes_raw
        ]

        cursos.append(
            CursoPrereqItem(
                id=row["curso_id"],
                code=row["code"],
                name=row["name"],
                credits=row["credits"],
                ciclo=row["ciclo"],
                carrera_id=carrera_id,
                prerrequisito_ids=row.get("prerrequisito_ids") or [],
                status=row["status"],
                prerrequisitos_faltantes=faltantes,
            )
        )

    return cursos
