"""Banco de recursos académicos.

El frontend consume GET /api/recursos para la biblioteca de recursos y para
el tab "Banco de exámenes" de cada curso (filtrado por curso_id).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.auth_utils import get_current_user
from app.core.database import get_supabase
from app.core.tipos_recursos import normalizar_tipo

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recursos")
async def get_recursos(
    tipo: Optional[str] = Query(None),
    ciclo: Optional[int] = Query(None),
    curso_id: Optional[int] = Query(None),
    codigo_curso: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    facultad: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user_data=Depends(get_current_user),
):
    """Lista de recursos académicos, con filtros combinables."""
    user, token = user_data
    supabase = get_supabase(token)

    try:
        # Filas sin curso_id resuelto (huérfanas de la ingesta de Drive) no se
        # muestran en la biblioteca pública: quedan solo en la BD para
        # revisión manual hasta que se les asigne un curso real.
        query = supabase.table("recursos").select("*").not_.is_("curso_id", "null")
        if curso_id is not None:
            query = query.eq("curso_id", curso_id)
        if ciclo is not None:
            query = query.eq("ciclo", ciclo)
        if year is not None:
            query = query.eq("year", year)
        if tipo:
            query = query.eq("tipo", normalizar_tipo(tipo))

        recursos_resp = query.execute()
        recursos_data = recursos_resp.data or []
        if not recursos_data:
            return []

        curso_ids = {r["curso_id"] for r in recursos_data if r.get("curso_id") is not None}
        cursos_map = {}
        carreras_map = {}
        facultades_map = {}
        if curso_ids:
            cursos_resp = (
                supabase.table("cursos")
                .select("id, code, name, ciclo, carrera_id")
                .in_("id", list(curso_ids))
                .execute()
            )
            cursos_map = {c["id"]: c for c in (cursos_resp.data or [])}

            carrera_ids = {c["carrera_id"] for c in cursos_map.values() if c.get("carrera_id") is not None}
            if carrera_ids:
                carreras_resp = (
                    supabase.table("carreras")
                    .select("id, name, facultad_id")
                    .in_("id", list(carrera_ids))
                    .execute()
                )
                carreras_map = {c["id"]: c for c in (carreras_resp.data or [])}

                facultad_ids = {
                    c["facultad_id"] for c in carreras_map.values() if c.get("facultad_id") is not None
                }
                if facultad_ids:
                    facultades_resp = (
                        supabase.table("facultades")
                        .select("id, nombre")
                        .in_("id", list(facultad_ids))
                        .execute()
                    )
                    facultades_map = {f["id"]: f for f in (facultades_resp.data or [])}

        resultado = []
        for r in recursos_data:
            # curso siempre existe: la query ya excluyó curso_id NULL.
            curso = cursos_map.get(r.get("curso_id")) or {}
            codigo_curso_r = curso.get("code")
            nombre_curso_r = curso.get("name")
            carrera = carreras_map.get(curso.get("carrera_id"))
            facultad_obj = facultades_map.get(carrera.get("facultad_id")) if carrera else None
            facultad_nombre = facultad_obj.get("nombre") if facultad_obj else None

            resultado.append({
                "id": r["id"],
                "titulo": r.get("titulo"),
                "tipo": r.get("tipo"),
                "curso_id": r.get("curso_id"),
                "codigo_curso": codigo_curso_r,
                "nombre_curso": nombre_curso_r,
                "ciclo": r.get("ciclo"),
                "year": r.get("year"),
                "downloads": r.get("downloads") or 0,
                "rating": r.get("rating") or 0.0,
                "preview_url": r.get("preview_url"),
                "has_solucionario": r.get("has_solucionario") or False,
                "url_drive": r.get("url_drive"),
                "facultad_nombre": facultad_nombre,
                "created_at": r.get("created_at"),
            })

        if codigo_curso:
            needle = codigo_curso.lower()
            resultado = [r for r in resultado if needle in str(r["codigo_curso"] or "").lower()]

        if facultad and facultad.lower() != "all":
            resultado = [r for r in resultado if r["facultad_nombre"] == facultad]

        if search:
            needle = search.lower()
            resultado = [
                r for r in resultado
                if needle in str(r["titulo"] or "").lower()
                or needle in str(r["codigo_curso"] or "").lower()
                or needle in str(r["nombre_curso"] or "").lower()
            ]

        resultado.sort(key=lambda r: str(r["created_at"] or ""), reverse=True)
        return resultado
    except Exception as e:
        logger.error(f"Error obteniendo recursos: {e}")
        raise HTTPException(status_code=500, detail="Error interno al obtener los recursos.")
