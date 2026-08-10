"""
Optimización de imágenes para reducir costo de tokens en Gemini Vision.

Convierte imágenes renderizadas de PDF a formatos más livianos (JPEG/WebP)
con DPI reducido, manteniendo un gate de validación de fidelidad.
"""
import io
import logging
from typing import Literal

from PIL import Image

logger = logging.getLogger(__name__)

FormatOption = Literal["jpeg", "webp"]


def optimizar_imagen(
    imagen_pil: Image.Image,
    formato: FormatOption = "jpeg",
    calidad: int = 85,
) -> bytes:
    """
    Convierte una imagen PIL a bytes optimizados.

    Args:
        imagen_pil: Imagen en memoria. Si es RGBA, se convierte a RGB
                    automáticamente (JPEG no soporta alpha).
        formato: 'jpeg' (más compatible) o 'webp' (mejor compresión).
        calidad: 1-100, default 85.

    Returns:
        Bytes de la imagen comprimida listos para enviar a Gemini.
    """
    # JPEG no soporta alpha → convertir RGBA a RGB
    if formato == "jpeg" and imagen_pil.mode == "RGBA":
        fondo = Image.new("RGB", imagen_pil.size, (255, 255, 255))
        fondo.paste(imagen_pil, mask=imagen_pil.split()[3])
        imagen_pil = fondo
    elif imagen_pil.mode not in ("RGB", "L"):
        imagen_pil = imagen_pil.convert("RGB")

    buf = io.BytesIO()
    if formato == "webp":
        imagen_pil.save(buf, format="WEBP", quality=calidad)
    else:
        imagen_pil.save(buf, format="JPEG", quality=calidad, optimize=True)

    return buf.getvalue()


def reducir_dpi(
    imagen_pil: Image.Image,
    dpi_original: int,
    dpi_objetivo: int = 150,
) -> Image.Image:
    """
    Reescala la imagen proporcionalmente para simular un DPI menor.

    factor = dpi_objetivo / dpi_original
    Nueva resolución = original * factor.

    Args:
        imagen_pil: Imagen PIL.
        dpi_original: DPI actual de la imagen.
        dpi_objetivo: DPI deseado (default 150).

    Returns:
        Nueva imagen PIL reescalada.
    """
    if dpi_objetivo >= dpi_original:
        return imagen_pil.copy()

    factor = dpi_objetivo / dpi_original
    nuevo_w = max(1, int(imagen_pil.width * factor))
    nuevo_h = max(1, int(imagen_pil.height * factor))

    return imagen_pil.resize((nuevo_w, nuevo_h), Image.LANCZOS)


def comparar_extraccion(
    texto_referencia: str,
    texto_optimizado: str,
) -> dict:
    """
    Compara dos extracciones de texto y devuelve métricas de fidelidad.

    Útil como gate de validación antes de habilitar la optimización
    de imágenes en producción.

    Returns:
        Dict con métricas: chars_referencia, chars_optimizado,
        chars_diferencia, chars_diferencia_pct, ratio_longitud,
        lineas_referencia, lineas_optimizado.
    """
    ref_chars = len(texto_referencia)
    opt_chars = len(texto_optimizado)

    # Diferencia carácter a carácter (solo hasta el largo del más corto)
    min_len = min(ref_chars, opt_chars)
    diffs = sum(
        1 for i in range(min_len)
        if texto_referencia[i] != texto_optimizado[i]
    )
    # Caracteres extra en el más largo también son diferencias
    diffs += abs(ref_chars - opt_chars)

    chars_diferencia_pct = (diffs / max(ref_chars, 1)) * 100 if ref_chars > 0 else 0.0
    ratio_longitud = opt_chars / ref_chars if ref_chars > 0 else 0.0

    return {
        "chars_referencia": ref_chars,
        "chars_optimizado": opt_chars,
        "chars_diferencia": diffs,
        "chars_diferencia_pct": round(chars_diferencia_pct, 2),
        "ratio_longitud": round(ratio_longitud, 4),
        "lineas_referencia": len(texto_referencia.splitlines()),
        "lineas_optimizado": len(texto_optimizado.splitlines()),
    }
