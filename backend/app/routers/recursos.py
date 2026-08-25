"""Banco de recursos académicos.

El frontend consume GET /api/recursos para la biblioteca de recursos y para
el tab "Banco de exámenes" de cada curso (filtrado por curso_id).
"""

import logging
from typing import Optional, Tuple, List

from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.auth_utils import get_current_user
from app.core.database import get_supabase
from app.core.tipos_recursos import normalizar_tipo

logger = logging.getLogger(__name__)
router = APIRouter()


def _alcance_de_facultad(supabase, user) -> Tuple[Optional[List[int]], Optional[str]]:
    """Cursos visibles para el estudiante y el nombre de su facultad.

    La biblioteca está acotada a la facultad a la que pertenece el estudiante:
    un alumno de FIIS no tiene por qué toparse con el material de FIM. La
    facultad no se guarda en `perfiles`, se deriva de la carrera
    (`perfiles.carrera_id -> carreras.facultad_id`), que es la única fuente de
    verdad y no puede quedar desincronizada.

    Devuelve `(None, None)` cuando no se puede resolver (perfil sin carrera,
    es decir onboarding sin terminar): quien llama decide qué hacer.
    """
    try:
        perfil_resp = (
            supabase.table("perfiles")
            .select("carrera_id")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(perfil_resp, "data", None) if perfil_resp else None
        carrera_id = (perfil or {}).get("carrera_id")
        if not carrera_id:
            return None, None

        carrera_resp = (
            supabase.table("carreras")
            .select("facultad_id")
            .eq("id", carrera_id)
            .maybe_single()
            .execute()
        )
        carrera = getattr(carrera_resp, "data", None) if carrera_resp else None
        facultad_id = (carrera or {}).get("facultad_id")
        if not facultad_id:
            return None, None

        facultad_resp = (
            supabase.table("facultades")
            .select("nombre")
            .eq("id", facultad_id)
            .maybe_single()
            .execute()
        )
        facultad = getattr(facultad_resp, "data", None) if facultad_resp else None
        facultad_nombre = (facultad or {}).get("nombre")

        # Un curso pertenece a la facultad si aparece en alguna malla de
        # alguna de sus carreras. Se recorre por malla_cursos y no por una
        # columna en `cursos` porque un mismo curso (Cálculo, Física) lo
        # comparten varias carreras.
        carreras_resp = (
            supabase.table("carreras").select("id").eq("facultad_id", facultad_id).execute()
        )
        carrera_ids = [c["id"] for c in (getattr(carreras_resp, "data", None) or [])]
        if not carrera_ids:
            return [], facultad_nombre

        mallas_resp = (
            supabase.table("mallas").select("id").in_("carrera_id", carrera_ids).execute()
        )
        malla_ids = [m["id"] for m in (getattr(mallas_resp, "data", None) or [])]
        if not malla_ids:
            return [], facultad_nombre

        mc_resp = (
            supabase.table("malla_cursos").select("curso_id").in_("malla_id", malla_ids).execute()
        )
        curso_ids = sorted(
            {
                mc["curso_id"]
                for mc in (getattr(mc_resp, "data", None) or [])
                if mc.get("curso_id") is not None
            }
        )
        return curso_ids, facultad_nombre
    except Exception as e:
        logger.error(f"Error resolviendo la facultad de {user.id}: {e}")
        return None, None


@router.get("/recursos")
async def get_recursos(
    tipo: Optional[str] = Query(None),
    ciclo: Optional[int] = Query(None),
    curso_id: Optional[int] = Query(None),
    codigo_curso: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    facultad: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    orden: str = Query("recent", pattern="^(recent|downloaded|rated)$"),
    mis_cursos: bool = Query(False, description="Solo material de los cursos que el estudiante lleva ahora."),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_data=Depends(get_current_user),
):
    """Página de recursos académicos, con filtros combinables.

    Devuelve `{items, total, sin_cursos_activos, facultad}`. `total` cuenta
    documentos ya agrupados (un PDF compartido por varias carreras es una sola
    tarjeta), que es lo que la biblioteca pagina.

    Todo el listado está acotado a la facultad del estudiante, en las dos
    vistas ("mis cursos" y "todo el banco").
    """
    user, token = user_data
    supabase = get_supabase(token)

    try:
        cursos_facultad, facultad_usuario = _alcance_de_facultad(supabase, user)
        vacia = {
            "items": [],
            "total": 0,
            "sin_cursos_activos": False,
            "facultad": facultad_usuario,
        }

        # Sin facultad resoluble no hay alcance que aplicar. Se devuelve vacío
        # en vez de todo el banco: fallar abierto aquí mostraría material de
        # otras facultades, que es justo lo que este filtro evita.
        if cursos_facultad is None:
            logger.info(f"Recursos sin facultad resoluble para {user.id}; se omite el listado.")
            return vacia
        if not cursos_facultad:
            return vacia

        # Filas sin curso_id resuelto (huérfanas de la ingesta de Drive) no se
        # muestran en la biblioteca pública: quedan solo en la BD para
        # revisión manual hasta que se les asigne un curso real.
        query = (
            supabase.table("recursos")
            .select("*")
            .not_.is_("curso_id", "null")
            .in_("curso_id", cursos_facultad)
        )

        if mis_cursos:
            # Se filtra contra la BD y no después de agrupar: el objetivo de
            # esta vista es no traerse el banco entero de la universidad.
            progreso_resp = (
                supabase.table("progreso_cursos")
                .select("curso_id")
                .eq("perfil_id", user.id)
                .eq("status", "in_progress")
                .execute()
            )
            mis_curso_ids = [
                p["curso_id"]
                for p in (getattr(progreso_resp, "data", None) or [])
                if p.get("curso_id") is not None
            ]
            # Sin matrícula activa no hay nada que mostrar, pero tampoco es un
            # banco vacío: el frontend distingue ambos casos con esta bandera.
            if not mis_curso_ids:
                return {**vacia, "sin_cursos_activos": True}

            # Se cruza en Python en vez de encadenar un segundo .in_ sobre la
            # misma columna: así el alcance de facultad se respeta explícitamente
            # y no depende de cómo PostgREST combine dos filtros iguales.
            permitidos = set(cursos_facultad)
            mis_curso_ids = [cid for cid in mis_curso_ids if cid in permitidos]
            if not mis_curso_ids:
                return {**vacia, "sin_cursos_activos": True}
            query = query.in_("curso_id", mis_curso_ids)

        if curso_id is not None:
            query = query.eq("curso_id", curso_id)
        if ciclo is not None:
            query = query.eq("ciclo", ciclo)
        if year is not None:
            query = query.eq("year", year)
        if tipo:
            # El selector de categorías permite marcar varios chips a la vez.
            tipos = [normalizar_tipo(t) for t in tipo.split(",") if t.strip()]
            if len(tipos) == 1:
                query = query.eq("tipo", tipos[0])
            elif tipos:
                query = query.in_("tipo", tipos)

        recursos_resp = query.execute()
        recursos_data = recursos_resp.data or []
        if not recursos_data:
            return vacia

        curso_ids = {r["curso_id"] for r in recursos_data if r.get("curso_id") is not None}
        cursos_map = {}
        carreras_map = {}
        facultades_map = {}
        if curso_ids:
            cursos_resp = (
                supabase.table("cursos")
                .select("id, code, name")
                .in_("id", list(curso_ids))
                .execute()
            )
            cursos_dict = {c["id"]: c for c in (cursos_resp.data or [])}

            mc_resp = (
                supabase.table("malla_cursos")
                .select("curso_id, ciclo, mallas(carrera_id)")
                .in_("curso_id", list(curso_ids))
                .execute()
            )
            mc_data = getattr(mc_resp, "data", None) or []

            cursos_map = {}
            for cid in curso_ids:
                c_info = cursos_dict.get(cid) or {}
                mc_filas = [m for m in mc_data if m.get("curso_id") == cid]
                carrera_id = None
                ciclo_mc = None
                if mc_filas:
                    ciclo_mc = mc_filas[0].get("ciclo")
                    malla_obj = mc_filas[0].get("mallas") or {}
                    carrera_id = malla_obj.get("carrera_id") if isinstance(malla_obj, dict) else None

                cursos_map[cid] = {
                    "id": cid,
                    "code": c_info.get("code"),
                    "name": c_info.get("name"),
                    "ciclo": ciclo_mc,
                    "carrera_id": carrera_id,
                }

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

        # El mismo documento de Drive (drive_file_id) se ingiere una vez por
        # curso (ingestar_recursos_drive.py, on_conflict drive_file_id+curso_id),
        # así que un PDF compartido por varias carreras existe como N filas.
        # En la biblioteca debe mostrarse una sola tarjeta por documento, con sus
        # cursos como especialidades. Ordenamos por created_at desc antes de
        # agrupar: la primera fila de cada grupo es la principal y define el orden.
        filas_ordenadas = sorted(
            recursos_data, key=lambda r: str(r.get("created_at") or ""), reverse=True
        )

        grupos: dict = {}
        for r in filas_ordenadas:
            # curso siempre existe: la query ya excluyó curso_id NULL.
            curso = cursos_map.get(r.get("curso_id")) or {}
            codigo_curso_r = curso.get("code")
            nombre_curso_r = curso.get("name")
            carrera = carreras_map.get(curso.get("carrera_id"))
            facultad_obj = facultades_map.get(carrera.get("facultad_id")) if carrera else None
            facultad_nombre = facultad_obj.get("nombre") if facultad_obj else None

            item = {
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
                "url_solucionario": r.get("url_solucionario"),
                "drive_id_solucionario": r.get("drive_id_solucionario"),
                "url_drive": r.get("url_drive"),
                "facultad_nombre": facultad_nombre,
                "created_at": r.get("created_at"),
                "drive_file_id": r.get("drive_file_id"),
            }
            especialidad = {
                "curso_id": item["curso_id"],
                "codigo_curso": item["codigo_curso"],
                "nombre_curso": item["nombre_curso"],
                "facultad_nombre": item["facultad_nombre"],
            }

            # Recursos sin drive_file_id (ej. compendios de cargar_compendio.py)
            # no se agrupan: cada fila es su propio documento.
            clave = item.get("drive_file_id") or f"id:{item['id']}"
            if clave in grupos:
                grupos[clave]["especialidades"].append(especialidad)
            else:
                grupos[clave] = {**item, "especialidades": [especialidad]}

        # Agrupamiento dinámico de solucionarios con su documento principal (por nomenclatura o BD).
        # Unifica "FS1 Tipler_Solucionario" en la tarjeta principal "FS1 Tipler".
        import re

        def normalizar_nombre_base(titulo: str) -> tuple[str, bool]:
            """Retorna (titulo_normalizado, es_solucionario)."""
            t = (titulo or "").strip()
            es_sol = bool(re.search(r"(?:^|[\s_/\-\(\[\{])(solucionario|resuelto)(?:[\s_/\-\)\]\}]|$)", t, re.IGNORECASE))
            if es_sol:
                base = re.sub(r"(?i)(?:[\s_/\-]*\b(solucionario|resuelto)\b[\s_/\-]*|^\s*(solucionario|resuelto)\s*[\-:_]*\s*)", " ", t).strip()
                base = re.sub(r"\s+", " ", base)
                return base, True
            return t, False

        base_map = {}
        for k, g in grupos.items():
            base_name, is_sol = normalizar_nombre_base(g.get("titulo") or "")
            clean_key = base_name.lower()
            if not is_sol and clean_key:
                base_map[clean_key] = k

        claves_a_remover = set()
        for k, g in list(grupos.items()):
            base_name, is_sol = normalizar_nombre_base(g.get("titulo") or "")
            clean_key = base_name.lower()

            if is_sol:
                target_key = base_map.get(clean_key)
                if not target_key:
                    for b_key, b_k in base_map.items():
                        if b_key in clean_key or clean_key in b_key:
                            target_key = b_k
                            break

                if target_key and target_key != k:
                    principal = grupos[target_key]
                    principal["has_solucionario"] = True
                    principal["url_solucionario"] = principal.get("url_solucionario") or g.get("url_drive")
                    principal["drive_id_solucionario"] = principal.get("drive_id_solucionario") or g.get("drive_file_id")

                    esp_existentes = {(e["curso_id"], e["codigo_curso"]) for e in principal["especialidades"]}
                    for esp in g.get("especialidades", []):
                        if (esp["curso_id"], esp["codigo_curso"]) not in esp_existentes:
                            principal["especialidades"].append(esp)
                            esp_existentes.add((esp["curso_id"], esp["codigo_curso"]))

                    claves_a_remover.add(k)

        for k in claves_a_remover:
            grupos.pop(k, None)

        # Los post-filtros operan sobre el documento agrupado: una tarjeta
        # sobrevive si CUALQUIERA de sus cursos coincide con el filtro.
        if codigo_curso:
            needle = codigo_curso.lower()
            grupos = {
                k: g for k, g in grupos.items()
                if any(needle in str(e["codigo_curso"] or "").lower() for e in g["especialidades"])
            }

        if facultad and facultad.lower() != "all":
            grupos = {
                k: g for k, g in grupos.items()
                if any(e["facultad_nombre"] == facultad for e in g["especialidades"])
            }

        if search:
            needle = search.lower()
            grupos = {
                k: g for k, g in grupos.items()
                if needle in str(g["titulo"] or "").lower()
                or any(
                    needle in str(e["codigo_curso"] or "").lower()
                    or needle in str(e["nombre_curso"] or "").lower()
                    for e in g["especialidades"]
                )
            }

        resultado = list(grupos.values())

        # El orden se aplica sobre el documento agrupado y antes de cortar la
        # página: ordenar solo la página visible daría un listado incoherente
        # al avanzar.
        if orden == "downloaded":
            clave_orden = lambda r: (r.get("downloads") or 0, str(r.get("created_at") or ""))
        elif orden == "rated":
            clave_orden = lambda r: (r.get("rating") or 0.0, str(r.get("created_at") or ""))
        else:
            clave_orden = lambda r: str(r.get("created_at") or "")
        resultado.sort(key=clave_orden, reverse=True)

        total = len(resultado)
        return {
            "items": resultado[offset : offset + limit],
            "total": total,
            "sin_cursos_activos": False,
            "facultad": facultad_usuario,
        }
    except Exception as e:
        logger.error(f"Error obteniendo recursos: {e}")
        raise HTTPException(status_code=500, detail="Error interno al obtener los recursos.")
