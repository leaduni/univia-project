"""Chatbot flotante de UniVia.

El frontend abre la burbuja y conversa contra estos tres endpoints:

    POST /api/chatbot/conversaciones      -> abre un hilo
    GET  /api/chatbot/conversaciones      -> lista los hilos del estudiante
    GET  /api/chatbot/conversaciones/{id} -> reconstruye un hilo
    POST /api/chatbot/mensajes            -> manda un turno y recibe la respuesta por SSE

La generación va por Groq (free tier) y no por Claude: ver la nota de
separación de proveedores en app/core/llm.py.

Este módulo es el Paso 2 del plan (docs/PLAN_CHATBOT.md): deja el andamiaje de
conversación, persistencia y streaming funcionando de punta a punta con una
respuesta puramente conversacional. La clasificación de intención (Paso 3) y los
handlers que consultan recursos, RAG y estado académico (Paso 4) se enchufan
después en `_responder`, sin mover los endpoints.
"""

import asyncio
import json
import logging
import traceback
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.chatbot import intents
from app.core.auth_utils import get_current_user
from app.core.database import get_supabase
from app.core.llm import chatear, get_groq

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Parámetros de conversación
# ---------------------------------------------------------------------------

# Turnos de historial que se le reenvían al modelo. El free tier tiene ventana
# de contexto acotada y cada turno viaja completo en cada petición, así que la
# conversación se recorta a lo último dicho en vez de crecer sin techo.
MAX_TURNOS_CONTEXTO = 12

# Tope del mensaje del usuario. Evita que un pegado accidental de un PDF entero
# consuma la cuota diaria en una sola petición.
MAX_CARACTERES_MENSAJE = 4000

# Tope de la respuesta del bot.
MAX_TOKENS_RESPUESTA = 1024

# Largo del título que se deriva del primer mensaje para listar el hilo.
MAX_CARACTERES_TITULO = 60

# Prompt base. El Paso 5 del plan lo endurece con los guardarraíles finales;
# esto es lo mínimo para que el bot no se presente como un asistente genérico.
SYSTEM_PROMPT = """Eres el asistente de UniVia, una plataforma de orientación académica para estudiantes universitarios peruanos.

Reglas:
- Responde en español, con un tono cercano y directo. Nada de formalidad excesiva.
- Sé breve: dos o tres párrafos como máximo, salvo que te pidan detalle.
- Escribe las fórmulas en texto plano (por ejemplo "f'(g(x)) · g'(x)"), nunca en LaTeX ni con \\( \\).
- Nunca inventes notas, cursos, horarios ni datos del estudiante. Si no tienes el dato, dilo.
- Si te preguntan algo que no puedes resolver, dilo claramente en vez de improvisar."""


# ---------------------------------------------------------------------------
# Modelos
# ---------------------------------------------------------------------------

class NuevaConversacion(BaseModel):
    titulo: Optional[str] = Field(None, max_length=MAX_CARACTERES_TITULO)


class NuevoMensaje(BaseModel):
    mensaje: str = Field(..., min_length=1, max_length=MAX_CARACTERES_MENSAJE)
    # Opcional: si no viene, se abre un hilo nuevo y su id se anuncia en el
    # primer evento del stream. Ahorra al frontend un POST previo para el
    # primer mensaje, que es el caso más común.
    conversacion_id: Optional[int] = None


# ---------------------------------------------------------------------------
# Helpers de persistencia
# ---------------------------------------------------------------------------

def _titulo_desde(mensaje: str) -> str:
    """Título del hilo a partir del primer mensaje, recortado en limpio."""
    texto = " ".join(mensaje.split())
    if len(texto) <= MAX_CARACTERES_TITULO:
        return texto
    return texto[:MAX_CARACTERES_TITULO - 1].rstrip() + "…"


def _crear_conversacion(supabase, perfil_id: str, titulo: Optional[str]) -> int:
    resp = (
        supabase.table("chat_conversaciones")
        .insert({"perfil_id": perfil_id, "titulo": titulo})
        .execute()
    )
    filas = getattr(resp, "data", None) or []
    if not filas:
        raise HTTPException(status_code=500, detail="No se pudo crear la conversación.")
    return filas[0]["id"]


def _verificar_propiedad(supabase, conversacion_id: int, perfil_id: str) -> dict:
    """Confirma que el hilo existe y es del usuario.

    Las políticas RLS ya impiden leer un hilo ajeno, así que una conversación de
    otro usuario llega aquí como "no encontrada". Se responde 404 y no 403 a
    propósito: distinguirlos le confirmaría a quien sondea ids que ese hilo
    existe y es de alguien más.
    """
    resp = (
        supabase.table("chat_conversaciones")
        .select("id, titulo, created_at, updated_at")
        .eq("id", conversacion_id)
        .eq("perfil_id", perfil_id)
        .maybe_single()
        .execute()
    )
    fila = getattr(resp, "data", None) if resp else None
    if not fila:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    return fila


def _guardar_mensaje(
    supabase,
    conversacion_id: int,
    perfil_id: str,
    rol: str,
    contenido: str,
    intent: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    supabase.table("chat_mensajes").insert({
        "conversacion_id": conversacion_id,
        "perfil_id": perfil_id,
        "rol": rol,
        "contenido": contenido,
        "intent": intent,
        "metadata": metadata or {},
    }).execute()


def _historial(supabase, conversacion_id: int, limite: int = MAX_TURNOS_CONTEXTO) -> list:
    """Últimos turnos del hilo, en orden cronológico.

    Se piden los más recientes (created_at desc) y se invierte al final: el
    recorte tiene que quedarse con el final de la conversación, no con su
    principio, que es lo que daría un `order(asc).limit(n)`.
    """
    resp = (
        supabase.table("chat_mensajes")
        .select("rol, contenido")
        .eq("conversacion_id", conversacion_id)
        .order("created_at", desc=True)
        .limit(limite)
        .execute()
    )
    filas = getattr(resp, "data", None) or []
    return [{"role": f["rol"], "content": f["contenido"]} for f in reversed(filas)]


def _tocar_conversacion(supabase, conversacion_id: int, titulo: Optional[str] = None) -> None:
    """Mueve updated_at (y fija el título si aún no tenía).

    updated_at ordena la lista de hilos y es la columna sobre la que corta la
    retención de 30 días, así que un hilo activo tiene que refrescarla en cada
    turno o expiraría estando en uso.
    """
    cambios: dict = {"updated_at": "now()"}
    if titulo:
        cambios["titulo"] = titulo
    supabase.table("chat_conversaciones").update(cambios).eq("id", conversacion_id).execute()


# ---------------------------------------------------------------------------
# Generación
# ---------------------------------------------------------------------------

def _responder(mensajes: list):
    """Llama al modelo y devuelve el iterador de chunks.

    Punto de enganche del Paso 4: aquí es donde se inyectará el contexto propio
    de cada intent (tarjetas de recurso, fragmentos del RAG, expediente del
    estudiante) antes de generar. Hoy el intent ya viene clasificado y se
    registra, pero todas las ramas responden en modo conversación.
    """
    return chatear(
        mensajes,
        system=SYSTEM_PROMPT,
        max_tokens=MAX_TOKENS_RESPUESTA,
        stream=True,
    )


async def _chunks_sin_bloquear(mensajes: list) -> AsyncGenerator[str, None]:
    """Itera el stream de Groq sin bloquear el event loop.

    El SDK es síncrono: recorrerlo directamente dentro del generador async
    congelaría a todos los demás usuarios de la API mientras dura la respuesta.
    Se consume en un hilo aparte que va empujando los fragmentos a una cola, y
    el endpoint los recoge de ahí.
    """
    cola: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    FIN = object()

    def _consumir():
        try:
            for chunk in _responder(mensajes):  # type: ignore[union-attr]
                delta = chunk.choices[0].delta.content
                if delta:
                    loop.call_soon_threadsafe(cola.put_nowait, delta)
        except Exception as e:
            loop.call_soon_threadsafe(cola.put_nowait, e)
        finally:
            loop.call_soon_threadsafe(cola.put_nowait, FIN)

    tarea = loop.run_in_executor(None, _consumir)
    try:
        while True:
            item = await cola.get()
            if item is FIN:
                break
            if isinstance(item, Exception):
                raise item
            yield item
    finally:
        await tarea


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chatbot/conversaciones")
async def crear_conversacion(datos: NuevaConversacion, user_data=Depends(get_current_user)):
    """Abre un hilo vacío.

    No es obligatorio para chatear: POST /chatbot/mensajes sin conversacion_id
    abre uno solo. Existe para que el frontend pueda ofrecer "nueva conversación"
    de forma explícita.
    """
    user, token = user_data
    supabase = get_supabase(token)
    try:
        conversacion_id = _crear_conversacion(supabase, user.id, datos.titulo)
        return {"id": conversacion_id, "titulo": datos.titulo}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando conversación para {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo crear la conversación.")


@router.get("/chatbot/conversaciones")
async def listar_conversaciones(
    limit: int = Query(20, ge=1, le=50),
    user_data=Depends(get_current_user),
):
    """Hilos del estudiante, del más reciente al más viejo."""
    user, token = user_data
    supabase = get_supabase(token)
    try:
        resp = (
            supabase.table("chat_conversaciones")
            .select("id, titulo, created_at, updated_at")
            .eq("perfil_id", user.id)
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"items": getattr(resp, "data", None) or []}
    except Exception as e:
        logger.error(f"Error listando conversaciones de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron cargar las conversaciones.")


@router.get("/chatbot/conversaciones/{conversacion_id}")
async def obtener_conversacion(conversacion_id: int, user_data=Depends(get_current_user)):
    """Reconstruye un hilo completo para repintarlo al abrir la burbuja.

    Devuelve `metadata` de cada mensaje además del texto: ahí viajan las
    tarjetas de recurso descargable, que de otro modo se perderían al recargar.
    """
    user, token = user_data
    supabase = get_supabase(token)

    conversacion = _verificar_propiedad(supabase, conversacion_id, user.id)
    try:
        resp = (
            supabase.table("chat_mensajes")
            .select("id, rol, contenido, intent, metadata, created_at")
            .eq("conversacion_id", conversacion_id)
            .order("created_at")
            .execute()
        )
        return {**conversacion, "mensajes": getattr(resp, "data", None) or []}
    except Exception as e:
        logger.error(f"Error cargando la conversación {conversacion_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar la conversación.")


@router.delete("/chatbot/conversaciones/{conversacion_id}")
async def borrar_conversacion(conversacion_id: int, user_data=Depends(get_current_user)):
    """Borra un hilo. Los mensajes se van por el ON DELETE CASCADE."""
    user, token = user_data
    supabase = get_supabase(token)

    _verificar_propiedad(supabase, conversacion_id, user.id)
    try:
        supabase.table("chat_conversaciones").delete().eq("id", conversacion_id).execute()
        return {"ok": True}
    except Exception as e:
        logger.error(f"Error borrando la conversación {conversacion_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo borrar la conversación.")


@router.post("/chatbot/mensajes")
async def enviar_mensaje(datos: NuevoMensaje, user_data=Depends(get_current_user)):
    """Manda un turno y devuelve la respuesta por SSE, token a token.

    Eventos del stream:
        {"conversacion_id": N,  primero siempre, para que el frontend sepa a qué
         "intent": "..."}       hilo enganchar (sobre todo si lo creó esta misma
                                petición). El intent viaja aquí porque llega
                                antes que el texto y decide cómo se pinta el
                                turno (una respuesta de `recurso` se renderiza
                                como tarjetas, no como párrafo).
        {"delta": "..."}        fragmento de texto, conforme llega.
        {"done": true}          fin, con la respuesta completa.
        {"error": "..."}        algo falló a mitad del stream.
    """
    user, token = user_data
    supabase = get_supabase(token)

    if get_groq() is None:
        raise HTTPException(status_code=503, detail="El asistente no está disponible ahora mismo.")

    mensaje = datos.mensaje.strip()
    if not mensaje:
        raise HTTPException(status_code=422, detail="El mensaje está vacío.")

    # Todo lo que puede fallar con un código de estado propio se resuelve antes
    # de abrir el stream: una vez enviada la primera línea SSE la respuesta ya
    # es 200 y un error solo puede viajar como evento.
    try:
        if datos.conversacion_id is None:
            conversacion_id = _crear_conversacion(supabase, user.id, _titulo_desde(mensaje))
        else:
            conversacion_id = datos.conversacion_id
            _verificar_propiedad(supabase, conversacion_id, user.id)

        # El historial se lee ANTES de guardar el turno actual: si no, el
        # mensaje del usuario llegaría duplicado al modelo (una vez desde la
        # base y otra al anexarlo abajo).
        historial = _historial(supabase, conversacion_id)
        _guardar_mensaje(supabase, conversacion_id, user.id, "user", mensaje)
        _tocar_conversacion(supabase, conversacion_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preparando el turno de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo procesar el mensaje.")

    # De qué fuente sale la respuesta. Se resuelve fuera del generador para que
    # una caída del clasificador no aparezca a mitad del stream; `clasificar`
    # no lanza, así que en el peor caso devuelve el intent por defecto.
    intent = intents.clasificar(mensaje, historial)

    mensajes = historial + [{"role": "user", "content": mensaje}]

    async def event_generator() -> AsyncGenerator[str, None]:
        yield f"data: {json.dumps({'conversacion_id': conversacion_id, 'intent': intent})}\n\n"

        partes: list[str] = []
        try:
            async for delta in _chunks_sin_bloquear(mensajes):
                partes.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"

            respuesta = "".join(partes).strip()
            if not respuesta:
                yield f"data: {json.dumps({'error': 'El asistente no devolvió respuesta.'})}\n\n"
                return

            # Se persiste al final y no por fragmento: un turno a medias no es
            # un turno, y guardarlo dejaría el historial con respuestas cortadas
            # que después se le reenvían al modelo como si fueran válidas.
            try:
                _guardar_mensaje(
                    supabase, conversacion_id, user.id, "assistant", respuesta, intent=intent,
                )
                _tocar_conversacion(supabase, conversacion_id)
            except Exception as e:
                # La respuesta ya se le mostró al usuario; perderla del historial
                # es peor experiencia, pero no motivo para romper el turno.
                logger.error(f"No se pudo guardar la respuesta del asistente: {e}")

            yield f"data: {json.dumps({'done': True, 'respuesta': respuesta})}\n\n"

        except Exception as e:
            logger.error(f"Error en el stream del chatbot:\n{traceback.format_exc()}")
            # El detalle crudo puede traer la URL del proveedor o restos de la
            # petición; al usuario le va un mensaje accionable.
            mensaje_error = (
                "El asistente está saturado ahora mismo. Intenta de nuevo en unos segundos."
                if "rate" in str(e).lower() or "429" in str(e)
                else "Ocurrió un error generando la respuesta."
            )
            yield f"data: {json.dumps({'error': mensaje_error})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
