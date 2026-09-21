"""Notificación a desarrolladores: webhook de Discord con fallback SMTP.

Extraído de `app/routers/feedback.py` para que cualquier módulo (feedback,
solicitudes de sílabo, telemetría) notifique a los devs sin duplicar la lógica.

Contrato:
    despachar_notificacion_dev(
        asunto: str,            # texto corto del embed/heading
        detalle: str,           # cuerpo del mensaje (hasta 1500 chars en
                                #   Discord, 2048 es el límite real del campo,
                                #   pero 1500 evita cortes por escapes)
        campos: list[dict],     # campos opcionales del embed de Discord:
                                #   [{"name": ..., "value": ..., "inline": bool}]
        color: int,             # color decimal del embed
    )

Es best-effort y asíncrona por diseño: primero se persiste el ticket/solicitud
y se responde HTTP; el envío corre en segundo plano y jamás rompe la petición
principal. Es el mismo criterio que `app/core/actividad.py::registrar_evento`.

Configuración (.env):
    WEBHOOK_DISCORD_DEV   webhook del canal de Discord del equipo.
    DEV_NOTIFICATION_EMAILS  destinatarios SMTP (separados por coma).
    SMTP_HOST/PORT/USER/PASS/FROM.
Si no hay webhook configurado, se intenta SMTP; si tampoco, solo queda el log.
"""

import logging
import os
import smtplib
from email.message import EmailMessage
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Cliente HTTP persistente (keep-alive) para la notificación a devs. Reusa
# sockets entre peticiones y evita el handshake TCP/TLS en cada aviso.
_http_devs = httpx.AsyncClient(
    timeout=10.0,
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=30),
)


async def _enviar_webhook_discord(
    asunto: str,
    detalle: str,
    campos: Optional[list] = None,
    color: int = 11342943,
) -> bool:
    """Publica un embed en el canal de Discord de los devs.

    Devuelve True si Discord respondió 2xx. En cualquier otro caso loguea y
    devuelve False para que el llamador intente el fallback SMTP.
    """
    webhook = os.getenv("WEBHOOK_DISCORD_DEV", "").strip()
    if not webhook:
        logger.info("[NOTIF-DEVS] WEBHOOK_DISCORD_DEV no configurado; se cae a SMTP.")
        return False

    payload = {
        "content": f"**{asunto}**",
        "embeds": [
            {
                "title": asunto,
                # El límite del campo description del embed es 2048.
                "description": detalle[:1500],
                "color": color,
                "fields": campos or [],
            }
        ],
    }
    try:
        respuesta = await _http_devs.post(webhook, json=payload)
    except Exception as e:
        logger.error("[NOTIF-DEVS] Error llamando al webhook de Discord: %s", e)
        return False

    if respuesta.status_code >= 400:
        logger.warning(
            "[NOTIF-DEVS] Discord devolvió %s; se cae a SMTP.", respuesta.status_code
        )
        return False
    logger.info("[NOTIF-DEVS] Webhook Discord enviado: %s", asunto)
    return True


def _enviar_correo_devs(
    asunto: str,
    detalle: str,
) -> bool:
    """Fallback SMTP hacia DEV_NOTIFICATION_EMAILS."""
    destinos = [
        d.strip()
        for d in os.getenv("DEV_NOTIFICATION_EMAILS", "").split(",")
        if d.strip()
    ]
    if not destinos:
        logger.warning("[NOTIF-DEVS] DEV_NOTIFICATION_EMAILS no configurado.")
        return False
    host = os.getenv("SMTP_HOST", "")
    if not host:
        logger.warning("[NOTIF-DEVS] SMTP_HOST no configurado; no se envió notificación.")
        return False
    try:
        msg = EmailMessage()
        msg["Subject"] = f"[UniVia] {asunto}"
        msg["From"] = os.getenv("SMTP_FROM", "no-reply@univiap.pe")
        msg["To"] = ", ".join(destinos)
        msg.set_content(detalle)
        with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587"))) as s:
            s.starttls()
            usuario = os.getenv("SMTP_USER", "")
            if usuario:
                s.login(usuario, os.getenv("SMTP_PASS", ""))
            s.send_message(msg)
        logger.info("[NOTIF-DEVS] Notificación SMTP enviada a %s correo(s).", len(destinos))
        return True
    except Exception as e:
        logger.error("[NOTIF-DEVS] Error enviando correo: %s", e)
        return False


async def despachar_notificacion_dev(
    asunto: str,
    detalle: str,
    campos: Optional[list] = None,
    color: int = 11342943,
) -> None:
    """Discord con fallback SMTP. Nunca propaga errores (best-effort)."""
    try:
        if await _enviar_webhook_discord(asunto, detalle, campos, color):
            return
        _enviar_correo_devs(asunto, detalle)
    except Exception as e:  # noqa: BLE001
        logger.error("[NOTIF-DEVS] Error despachando notificación: %s", e)