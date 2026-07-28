import logging
from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_supabase, get_admin_client
from app.core.auth_utils import get_current_user
from app.core.exceptions import raise_field_error
from app.schemas.usuarios import RegistroEstudiante, RegistroCompleto, LoginRequest

logger = logging.getLogger(__name__)
router = APIRouter()

# Mensaje único para credenciales inválidas: no revela si el correo o el código existe.
CREDENCIALES_INVALIDAS = "El correo/código o la contraseña son incorrectos."


def _resolver_email(identificador: str, es_email: bool) -> str | None:
    """Traduce un código universitario a su correo institucional (RF-01).

    Usa el cliente admin porque el login ocurre sin sesión activa y RLS
    bloquearía la lectura de 'perfiles' con la llave anónima.
    """
    if es_email:
        return identificador

    try:
        resp = (
            get_admin_client()
            .table("perfiles")
            .select("email")
            .eq("codigo_estudiante", identificador)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        logger.error(f"[LOGIN] Error resolviendo código {identificador}: {e}")
        return None

    data = getattr(resp, "data", None) if resp else None
    return data.get("email") if data else None


def _cargar_carrera_y_plan(token: str, carrera_id: int | None) -> tuple[dict | None, dict | None]:
    """Devuelve la carrera del estudiante y el resumen de su plan de estudios (RF-02).

    El plan se deriva del catálogo de cursos de la carrera; el avance del
    estudiante lo expone la Fase 3 y no se duplica aquí.
    """
    if not carrera_id:
        return None, None

    supabase = get_supabase(token)

    try:
        carrera_resp = (
            supabase.table("carreras")
            .select("id, name, codigo")
            .eq("id", carrera_id)
            .maybe_single()
            .execute()
        )
        carrera = getattr(carrera_resp, "data", None) if carrera_resp else None
    except Exception as e:
        logger.error(f"[LOGIN] Error cargando carrera {carrera_id}: {e}")
        return None, None

    try:
        cursos_resp = (
            supabase.table("cursos")
            .select("credits, ciclo")
            .eq("carrera_id", carrera_id)
            .execute()
        )
        cursos = getattr(cursos_resp, "data", None) or []
    except Exception as e:
        logger.error(f"[LOGIN] Error cargando plan de carrera {carrera_id}: {e}")
        return carrera, None

    if not cursos:
        return carrera, None

    ciclos = {c["ciclo"] for c in cursos if c.get("ciclo") is not None}
    plan = {
        "carrera_id": carrera_id,
        "total_cursos": len(cursos),
        "total_creditos": sum(c.get("credits") or 0 for c in cursos),
        "total_ciclos": max(ciclos) if ciclos else 0,
    }
    return carrera, plan


@router.post("/auth/login")
async def login(data: LoginRequest):
    """Inicia sesión con correo institucional o código universitario (RF-01).

    Devuelve la sesión junto con el perfil, la carrera y el plan de estudios
    asociados automáticamente (RF-02).
    """
    email = _resolver_email(data.identificador, data.es_email)
    if not email:
        raise_field_error("identificador", CREDENCIALES_INVALIDAS, status_code=401)

    try:
        auth_resp = get_supabase().auth.sign_in_with_password(
            {"email": email, "password": data.password}
        )
    except Exception as e:
        logger.warning(f"[LOGIN] Credenciales rechazadas para {email}: {e}")
        raise_field_error("identificador", CREDENCIALES_INVALIDAS, status_code=401)

    session = getattr(auth_resp, "session", None)
    user = getattr(auth_resp, "user", None)
    if not session or not user:
        raise_field_error("identificador", CREDENCIALES_INVALIDAS, status_code=401)

    token = session.access_token

    try:
        perfil_resp = (
            get_supabase(token)
            .table("perfiles")
            .select("*")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(perfil_resp, "data", None) if perfil_resp else None
    except Exception as e:
        logger.error(f"[LOGIN] Error cargando perfil de {user.id}: {e}")
        perfil = None

    if not perfil:
        # El perfil se crea en el registro; si falta, devolvemos lo mínimo de auth.
        perfil = {
            "id": user.id,
            "email": user.email,
            "nombre_completo": user.user_metadata.get("nombre_completo", ""),
            "onboarding_completado": False,
        }

    carrera, plan_estudios = _cargar_carrera_y_plan(token, perfil.get("carrera_id"))

    return {
        "status": "success",
        "access_token": token,
        "refresh_token": session.refresh_token,
        "expires_at": session.expires_at,
        "token_type": "bearer",
        "usuario": perfil,
        "carrera": carrera,
        "plan_estudios": plan_estudios,
        "onboarding_completado": bool(perfil.get("onboarding_completado")),
    }

@router.get("/usuarios/me")
async def get_profile(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    try:
        # Intentar obtener el perfil de la tabla 'perfiles'
        profile_response = supabase.table("perfiles").select("*").eq("id", user.id).single().execute()
        
        if not profile_response.data:
            # Si no existe (raro por el trigger), retornar datos básicos de auth
            return {
                "id": user.id,
                "email": user.email,
                "nombre_completo": user.user_metadata.get("nombre_completo", ""),
                "onboarding_completado": False
            }
            
        return profile_response.data
    except Exception as e:
        # En caso de error, retornar lo que sabemos del usuario de auth
        return {
            "id": user.id,
            "email": user.email,
            "nombre_completo": user.user_metadata.get("nombre_completo", ""),
            "onboarding_completado": False,
            "error_fetching_profile": str(e)
        }


@router.post("/auth/register", status_code=201)
async def register(
    data: RegistroEstudiante,
    user_data=Depends(get_current_user),
):
    user, token = user_data
    supabase = get_supabase(token)

    # Verificar duplicado de email (excluyendo al propio usuario)
    try:
        email_check = supabase.table("perfiles").select("id").eq("email", data.email).neq("id", user.id).maybe_single().execute()
    except Exception:
        email_check = None

    if email_check and getattr(email_check, 'data', None):
        raise_field_error("email", "Este correo institucional ya tiene una cuenta asociada.")

    # Verificar duplicado de codigo_estudiante (excluyendo al propio usuario)
    try:
        codigo_check = supabase.table("perfiles").select("id").eq("codigo_estudiante", data.codigo_estudiante).neq("id", user.id).maybe_single().execute()
    except Exception:
        codigo_check = None

    if codigo_check and getattr(codigo_check, 'data', None):
        raise_field_error("codigo_estudiante", "Este código universitario ya se encuentra registrado en el sistema.")

    payload = {
        "id": user.id,
        "email": data.email,
        "codigo_estudiante": data.codigo_estudiante,
        "nombre_completo": data.nombre_completo,
        "onboarding_completado": True,
        "updated_at": "now()",
    }
    print(f"[REGISTER] Upsert payload: {payload}")

    try:
        response = supabase.table("perfiles").upsert(
            payload,
            on_conflict="id",
        ).execute()
        print(f"[REGISTER] Upsert response: {response.data}")

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="No se pudo actualizar el perfil en la base de datos. La operación no afectó ninguna fila.",
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[REGISTER] Supabase error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al guardar el perfil en la base de datos: {str(e)}",
        )

    # Verificar que codigo_estudiante se haya guardado correctamente
    saved = response.data[0] if isinstance(response.data, list) else response.data
    if saved.get("codigo_estudiante") != data.codigo_estudiante:
        print(f"[REGISTER] WARNING: codigo_estudiante mismatch. Saved: {saved.get('codigo_estudiante')}, Expected: {data.codigo_estudiante}")

    return {"status": "success", "message": "Registro completado exitosamente"}


@router.post("/auth/register-user", status_code=201)
async def register_user(data: RegistroCompleto):
    supabase = get_supabase()

    # Verificar duplicado de email
    try:
        email_check = supabase.table("perfiles").select("id").eq("email", data.email).maybe_single().execute()
    except Exception:
        email_check = None
    if email_check and getattr(email_check, 'data', None):
        raise_field_error("email", "Este correo institucional ya tiene una cuenta asociada.")

    # Verificar duplicado de codigo_estudiante
    try:
        codigo_check = supabase.table("perfiles").select("id").eq("codigo_estudiante", data.codigo_estudiante).maybe_single().execute()
    except Exception:
        codigo_check = None
    if codigo_check and getattr(codigo_check, 'data', None):
        raise_field_error("codigo_estudiante", "Este código universitario ya se encuentra registrado en el sistema.")

    # Crear usuario en Supabase Auth (admin)
    try:
        admin = get_admin_client()
        user_resp = admin.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {
                "nombre_completo": data.nombre_completo,
                "codigo_estudiante": data.codigo_estudiante,
            }
        })
    except Exception as e:
        print(f"[REGISTER-USER] Error creating auth user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al crear el usuario de autenticación: {str(e)}")

    user_id = user_resp.user.id
    print(f"[REGISTER-USER] Auth user created: {user_id}")

    # Crear perfil en perfiles
    try:
        admin.table("perfiles").upsert({
            "id": user_id,
            "email": data.email,
            "codigo_estudiante": data.codigo_estudiante,
            "nombre_completo": data.nombre_completo,
            "onboarding_completado": False,
            "updated_at": "now()",
        }, on_conflict="id").execute()
        print(f"[REGISTER-USER] Profile created for user: {user_id}")
    except Exception as e:
        print(f"[REGISTER-USER] Error creating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al crear el perfil: {str(e)}")

    return {"status": "success", "message": "Registro completado exitosamente. Ya puedes iniciar sesión."}
