import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from app.core.actividad import TIPO_LOGIN, registrar_evento
from app.core.database import get_supabase, get_admin_client
from app.core.auth_utils import get_current_user
from app.core.exceptions import raise_field_error
from app.schemas.usuarios import (
    CambioPassword,
    PerfilUpdate,
    RegistroEstudiante,
    RegistroCompleto,
    LoginRequest,
    SolicitudRecuperacion,
    RestablecerPassword,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Destino del enlace de recuperación: debe apuntar al frontend, no a la API.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

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

    # Deja rastro del inicio de sesión para las estadísticas de actividad
    # (RF-21). Es best-effort: si falla, el login continúa igual.
    registrar_evento(get_supabase(token), user.id, TIPO_LOGIN)

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

@router.post("/auth/recuperar-password")
async def solicitar_recuperacion(data: SolicitudRecuperacion):
    """Envía el correo de recuperación de contraseña (RF-03).

    Supabase genera el enlace con token temporal y lo envía; el backend no
    almacena ni gestiona ese token.
    """
    try:
        get_supabase().auth.reset_password_for_email(
            data.email,
            options={"redirect_to": f"{FRONTEND_URL}/auth/restablecer-password"},
        )
    except Exception as e:
        # No se propaga el fallo: revelar que el envío falló delataría si el
        # correo existe. Queda en el log para poder diagnosticarlo.
        logger.error(f"[RECUPERACION] Error enviando correo a {data.email}: {e}")

    # Respuesta idéntica exista o no la cuenta, para no permitir enumeración.
    return {
        "status": "success",
        "message": (
            "Si el correo está registrado, recibirás un enlace para "
            "restablecer tu contraseña."
        ),
    }


@router.post("/auth/restablecer-password")
async def restablecer_password(
    data: RestablecerPassword,
    user_data=Depends(get_current_user),
):
    """Guarda la contraseña nueva tras abrir el enlace de recuperación (RF-03).

    El estudiante llega con la sesión que Supabase crea al validar el enlace,
    así que get_current_user ya acredita su identidad. Las condiciones de
    seguridad de la contraseña las aplica el schema (reglas de la Fase 1).
    """
    user, _token = user_data

    try:
        get_admin_client().auth.admin.update_user_by_id(
            user.id, {"password": data.password_nueva}
        )
    except Exception as e:
        logger.error(f"[RECUPERACION] Error actualizando contraseña de {user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar la contraseña. Solicita un enlace nuevo.",
        )

    logger.info(f"[RECUPERACION] Contraseña actualizada para {user.id}")
    return {
        "status": "success",
        "message": "Contraseña actualizada. Ya puedes iniciar sesión con ella.",
    }


@router.get("/usuarios/me")
async def get_profile(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    try:
        profile_response = (
            supabase.table("perfiles")
            .select("*")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(profile_response, "data", None) if profile_response else None
    except Exception as e:
        # El detalle queda en el log. Antes se devolvía str(e) al cliente, lo
        # que expone nombres de tablas y mensajes internos de Postgres.
        logger.error(f"[PERFIL] Error cargando perfil de {user.id}: {e}")
        perfil = None

    if perfil:
        return perfil

    # Sin fila en 'perfiles' (o con la consulta fallida) se responde lo que sí
    # consta en auth, para que la sesión siga siendo usable.
    return {
        "id": user.id,
        "email": user.email,
        "nombre_completo": user.user_metadata.get("nombre_completo", ""),
        "onboarding_completado": False,
    }


@router.put("/usuarios/perfil")
async def actualizar_datos_personales(
    data: PerfilUpdate,
    user_data=Depends(get_current_user),
):
    """Actualiza nombres y apellidos del estudiante (RF-PRF-02).

    El payload solo admite `nombre_completo`. El correo y el código no se
    tocan aquí ni por omisión: identifican al estudiante ante la universidad
    y su unicidad sostiene el registro y el login por código.
    """
    user, token = user_data
    supabase = get_supabase(token)

    try:
        resp = (
            supabase.table("perfiles")
            .update({"nombre_completo": data.nombre_completo, "updated_at": "now()"})
            .eq("id", user.id)
            .execute()
        )
        filas = getattr(resp, "data", None) or []
    except Exception as e:
        logger.error(f"[PERFIL] Error actualizando datos de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron guardar tus datos.")

    if not filas:
        # Sin filas afectadas el perfil no existe o RLS bloqueó la escritura;
        # devolver éxito haría creer al estudiante que su cambio se guardó.
        raise_field_error(
            "perfil",
            "No encontramos tu perfil para actualizarlo. Vuelve a iniciar sesión.",
            status_code=400,
        )

    return {
        "status": "success",
        "message": "Tus datos se actualizaron.",
        "usuario": filas[0],
    }


@router.put("/usuarios/password")
async def cambiar_password(
    data: CambioPassword,
    user_data=Depends(get_current_user),
):
    """Cambia la contraseña desde el perfil (RF-PRF-03).

    Exige la contraseña actual. A diferencia del flujo de recuperación —donde
    quien acredita al estudiante es el enlace del correo— aquí solo hay una
    sesión abierta: sin ese paso, un token robado bastaría para dejar al dueño
    fuera de su propia cuenta.
    """
    user, token = user_data

    if not user.email:
        raise HTTPException(
            status_code=400, detail="Tu cuenta no tiene un correo asociado."
        )

    if data.password_nueva == data.password_actual:
        raise_field_error(
            "password_nueva",
            "La contraseña nueva debe ser distinta de la actual.",
            status_code=400,
        )

    # La verificación va en un cliente aparte: autenticar sobre el cliente de
    # la sesión activa la reemplazaría.
    try:
        verificador = get_supabase()
        verificacion = verificador.auth.sign_in_with_password({
            "email": user.email,
            "password": data.password_actual,
        })
        credenciales_ok = bool(getattr(verificacion, "session", None))
    except Exception:
        credenciales_ok = False

    if not credenciales_ok:
        raise_field_error(
            "password_actual", "Tu contraseña actual no es correcta.", status_code=401
        )

    try:
        supabase = get_supabase(token)
        supabase.auth.update_user({"password": data.password_nueva})
    except Exception as e:
        logger.error(f"[PERFIL] Error cambiando contraseña de {user.id}: {e}")
        raise HTTPException(
            status_code=500, detail="No se pudo actualizar tu contraseña. Inténtalo de nuevo."
        )

    logger.info(f"[PERFIL] Contraseña cambiada por el propio usuario {user.id}")
    return {
        "status": "success",
        "message": "Tu contraseña se actualizó.",
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
