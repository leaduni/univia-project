from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import logging
import asyncio
from datetime import datetime, time
from typing import List, Optional
import re
from pydantic import BaseModel

from app.core.auth_utils import get_current_user
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/horarios", tags=["Horarios"])

async def _run(func):
    return await asyncio.to_thread(func)

class SeccionInscribirReq(BaseModel):
    seccion_id: str

@router.get("/disponibles")
async def get_secciones_disponibles(user_data=Depends(get_current_user)):
    """
    Retorna las secciones y sus bloques horarios, filtradas solo a los cursos
    que el estudiante marcó como "en curso" (in_progress).
    """
    user, token = user_data
    sb = get_supabase(token)

    try:
        # Los cursos "en curso" se guardan en `progreso_cursos` durante el
        # onboarding (status = 'in_progress'). Solo mostramos secciones de esos.
        resp_progreso = await _run(lambda: sb.table("progreso_cursos")
                                   .select("curso_id")
                                   .eq("perfil_id", user.id)
                                   .eq("status", "in_progress")
                                   .execute())
        
        cursos_in_progress = [row["curso_id"] for row in (getattr(resp_progreso, "data", []) or [])]
        
        if not cursos_in_progress:
            return []

        # Luego obtenemos las secciones y bloques para esos cursos
        resp_secciones = await _run(lambda: sb.table("malla_secciones")
                                    .select("*, malla_bloques_horario(*), cursos(name, code)")
                                    .in_("curso_id", cursos_in_progress)
                                    .execute())
        
        return getattr(resp_secciones, "data", [])
        
    except Exception as e:
        logger.error(f"Error cargando secciones disponibles: {e}")
        raise HTTPException(status_code=500, detail="Error al cargar horarios disponibles")


@router.post("/inscribir")
async def inscribir_seccion(req: SeccionInscribirReq, user_data=Depends(get_current_user)):
    """
    Inscribe al estudiante en una sección específica. 
    Permite solo 1 sección por curso_id.
    """
    user, token = user_data
    sb = get_supabase(token)

    try:
        # 1. Obtener la sección que se quiere inscribir para saber a qué curso pertenece
        resp_seccion = await _run(lambda: sb.table("malla_secciones").select("curso_id").eq("id", req.seccion_id).single().execute())
        seccion_data = getattr(resp_seccion, "data", None)
        if not seccion_data:
            raise HTTPException(status_code=404, detail="Sección no encontrada")
        
        curso_id = seccion_data["curso_id"]

        # 2. Obtener inscripciones previas de este estudiante
        resp_inscripciones = await _run(lambda: sb.table("horario_estudiante")
                                        .select("seccion_id, malla_secciones!inner(curso_id)")
                                        .eq("perfil_id", user.id)
                                        .execute())
        
        inscripciones_actuales = getattr(resp_inscripciones, "data", [])
        
        seccion_previa_id = None
        otras_secciones_ids = []
        for ins in inscripciones_actuales:
            if ins.get("malla_secciones", {}).get("curso_id") == curso_id:
                seccion_previa_id = ins["seccion_id"]
            else:
                otras_secciones_ids.append(ins["seccion_id"])
        
        if seccion_previa_id == req.seccion_id:
            return {"status": "ok", "message": "Ya estabas inscrito en esta sección"}

        # 3. Validar Cruces de Horario (Solapamiento)
        # 3.1 Obtener bloques de la sección objetivo
        resp_bloques_target = await _run(lambda: sb.table("malla_bloques_horario")
                                         .select("*")
                                         .eq("seccion_id", req.seccion_id)
                                         .execute())
        bloques_target = getattr(resp_bloques_target, "data", [])

        if otras_secciones_ids and bloques_target:
            # 3.2 Obtener bloques de las secciones ya inscritas (excluyendo el curso que se va a reemplazar)
            resp_bloques_actuales = await _run(lambda: sb.table("malla_bloques_horario")
                                               .select("*, malla_secciones(codigo_completo)")
                                               .in_("seccion_id", otras_secciones_ids)
                                               .execute())
            bloques_actuales = getattr(resp_bloques_actuales, "data", [])

            # Función helper para parsear 'HH:MM:SS' a datetime.time
            def parse_time(t_str: str) -> time:
                return datetime.strptime(t_str, "%H:%M:%S").time()

            # 3.3 Comprobar colisiones
            for b_tgt in bloques_target:
                t_ini_tgt = parse_time(b_tgt["hora_inicio"])
                t_fin_tgt = parse_time(b_tgt["hora_fin"])
                tipo_tgt = str(b_tgt.get("tipo", "")).upper()

                for b_act in bloques_actuales:
                    if b_tgt["dia_semana"] != b_act["dia_semana"]:
                        continue
                    
                    t_ini_act = parse_time(b_act["hora_inicio"])
                    t_fin_act = parse_time(b_act["hora_fin"])
                    tipo_act = str(b_act.get("tipo", "")).upper()

                    # ¿Hay solapamiento de tiempo?
                    # overlap_condition: Max(ini1, ini2) < Min(fin1, fin2)
                    max_ini = max(t_ini_tgt, t_ini_act)
                    min_fin = min(t_fin_tgt, t_fin_act)

                    if max_ini < min_fin:
                        # Reglas de negocio:
                        # Permitido: TEORIA vs PRACTICA / LAB
                        # Prohibido: TEORIA vs TEORIA, PRACTICA vs PRACTICA, LAB vs LAB
                        if tipo_tgt == tipo_act:
                            codigo_curso_cruce = b_act.get("malla_secciones", {}).get("codigo_completo", "desconocido")
                            raise HTTPException(
                                status_code=409,
                                detail=f"Cruce de horario detectado ({tipo_tgt} vs {tipo_act}) el día {b_tgt['dia_semana']} con el curso {codigo_curso_cruce}."
                            )

        # 4. Eliminar inscripción previa de este mismo curso si existía
        if seccion_previa_id:
            await _run(lambda: sb.table("horario_estudiante")
                       .delete()
                       .eq("perfil_id", user.id)
                       .eq("seccion_id", seccion_previa_id)
                       .execute())
            
        # 5. Inscribir en la nueva sección
        await _run(lambda: sb.table("horario_estudiante")
                   .insert({"perfil_id": user.id, "seccion_id": req.seccion_id})
                   .execute())
        
        return {"status": "ok", "message": "Inscrito con éxito"}
        
    except Exception as e:
        logger.error(f"Error al inscribir sección: {e}")
        raise HTTPException(status_code=500, detail="Error al inscribir sección")


@router.get("/evaluaciones")
async def get_evaluaciones(user_data=Depends(get_current_user)):
    """
    Retorna las evaluaciones asociadas a las secciones en las que el alumno
    está actualmente inscrito.
    """
    user, token = user_data
    sb = get_supabase(token)

    try:
        # Traer las secciones del estudiante
        resp_inscripciones = await _run(lambda: sb.table("horario_estudiante")
                                        .select("seccion_id")
                                        .eq("perfil_id", user.id)
                                        .execute())
        
        secciones_ids = [row["seccion_id"] for row in (getattr(resp_inscripciones, "data", []) or [])]
        if not secciones_ids:
            return []

        # Traer evaluaciones de esas secciones
        resp_evals = await _run(lambda: sb.table("evaluaciones_bloque")
                                .select("*, malla_secciones(codigo_completo, cursos(name))")
                                .in_("seccion_id", secciones_ids)
                                .execute())
        
        return getattr(resp_evals, "data", [])
        
    except Exception as e:
        logger.error(f"Error cargando evaluaciones de horario: {e}")
        raise HTTPException(status_code=500, detail="Error al cargar evaluaciones")

@router.post("/importar-pdf")
async def importar_pdf(file: UploadFile = File(...), user_data=Depends(get_current_user)):
    """
    Recibe un PDF de matrícula, extrae los códigos de sección (ej. BMA02-U)
    e inscribe automáticamente al alumno.
    """
    user, token = user_data
    sb = get_supabase(token)
    
    try:
        import pdfplumber
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber no está instalado en el servidor.")

    texto_completo = ""
    try:
        import io
        pdf_bytes = io.BytesIO(await file.read())
        with pdfplumber.open(pdf_bytes) as pdf:
            for page in pdf.pages:
                texto_completo += page.extract_text() + "\n"
    except Exception as e:
        logger.error(f"Error leyendo PDF: {e}")
        raise HTTPException(status_code=400, detail="Error al leer el archivo PDF.")

    # Buscar códigos de sección (ej. 3 letras, 2 números, guión, 1 letra)
    # Ej: BEF01-U, BMA02-X
    patron = r"\b[A-Z]{3}\d{2}-[A-Z]\b"
    codigos_encontrados = list(set(re.findall(patron, texto_completo)))

    if not codigos_encontrados:
        raise HTTPException(status_code=400, detail="No se encontraron códigos de sección (ej. BEF01-U) en el PDF.")

    try:
        # Buscar IDs de esas secciones en la BD
        resp_secciones = await _run(lambda: sb.table("malla_secciones")
                                    .select("id, codigo_completo")
                                    .in_("codigo_completo", codigos_encontrados)
                                    .execute())
        
        secciones_db = getattr(resp_secciones, "data", [])
        if not secciones_db:
            raise HTTPException(status_code=404, detail="Ninguno de los códigos del PDF existe en la base de datos.")

        # Inscribir al estudiante en las secciones encontradas
        inscripciones_exitosas = []
        for sec in secciones_db:
            sec_id = sec["id"]
            cod = sec["codigo_completo"]
            
            # Verificar si ya está inscrito
            resp_check = await _run(lambda: sb.table("horario_estudiante")
                                    .select("seccion_id")
                                    .eq("perfil_id", user.id)
                                    .eq("seccion_id", sec_id)
                                    .execute())
            if not getattr(resp_check, "data", []):
                # Inscribir
                await _run(lambda: sb.table("horario_estudiante")
                           .insert({"perfil_id": user.id, "seccion_id": sec_id})
                           .execute())
                inscripciones_exitosas.append(cod)

        return {
            "status": "ok",
            "codigos_detectados": codigos_encontrados,
            "inscripciones_exitosas": inscripciones_exitosas,
            "message": f"Se procesaron {len(inscripciones_exitosas)} inscripciones nuevas."
        }

    except Exception as e:
        logger.error(f"Error en BD al importar PDF: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar la inscripción en la base de datos.")
