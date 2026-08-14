"""
Router hibrido: decide si una pagina PDF se extrae con texto nativo (pypdf)
o se envia a Gemini Vision.

Heuristica compuesta de 4 criterios (anti-falsos positivos):
  1. Conteo minimo de caracteres (>100)
  2. Proporcion de glifos corruptos (cid:, caracteres no mapeados)
  3. Proporcion de area cubierta por imagenes XObject
  4. Si pasa todo -> ruta NATIVE (costo $0, <50ms)
"""
import logging
import re
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# Patrones de corrupcion comunes en PDFs LaTeX mal exportados
CORRUPTION_PATTERNS = [
    re.compile(r"\(cid:\d+\)", re.IGNORECASE),
    re.compile(r"\\u[0-9a-fA-F]{4}"),  # unicode escapes sin resolver
    re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]"),  # caracteres de control (excepto \t \n)
]


@dataclass
class RoutingDecision:
    route: str  # "native" | "vision"
    native_text: Optional[str] = None
    reason: str = ""
    metrics: dict = field(default_factory=dict)


class HybridRouter:
    """
    Decide si una pagina debe extraerse con texto nativo o Gemini Vision.

    La heuristica compuesta evita falsos positivos del criterio simple
    de conteo de caracteres (riesgo A.1 del ARQUITECTURA_RAG).
    """

    def __init__(
        self,
        min_chars: int = 100,
        max_corruption_ratio: float = 0.03,
        max_image_area_ratio: float = 0.20,
    ):
        self.min_chars = min_chars
        self.max_corruption_ratio = max_corruption_ratio
        self.max_image_area_ratio = max_image_area_ratio

    def route_page(self, pdf_path: str, page_num: int) -> RoutingDecision:
        """
        Evalua una pagina y decide la ruta de extraccion.

        Returns:
            RoutingDecision con route='native' (texto directo) o 'vision' (Gemini).
        """
        native_text = self.extract_native_text(pdf_path, page_num)
        corruption = self.corruption_ratio(native_text)
        image_area = self.image_area_ratio(pdf_path, page_num)

        return self._decide(native_text, corruption, image_area)

    def _decide(
        self,
        native_text: str,
        corruption: float,
        image_area: float,
    ) -> RoutingDecision:
        """Logica pura de decision (testeable sin PDF real)."""
        chars = len(native_text)
        metrics = {
            "chars": chars,
            "corruption": round(corruption, 4),
            "image_area": round(image_area, 4),
        }

        if chars < self.min_chars:
            return RoutingDecision(
                route="vision",
                reason=f"Texto muy corto ({chars} chars < {self.min_chars})",
                metrics=metrics,
            )

        if corruption > self.max_corruption_ratio:
            return RoutingDecision(
                route="vision",
                reason=f"Alta corrupcion ({corruption:.2%} > {self.max_corruption_ratio:.0%})",
                metrics=metrics,
            )

        if image_area > self.max_image_area_ratio:
            return RoutingDecision(
                route="vision",
                reason=f"Alta densidad de imagenes ({image_area:.0%} > {self.max_image_area_ratio:.0%})",
                metrics=metrics,
            )

        return RoutingDecision(
            route="native",
            native_text=native_text,
            reason="Texto nativo limpio y completo",
            metrics=metrics,
        )

    @staticmethod
    def extract_native_text(pdf_path: str, page_num: int) -> str:
        """Extrae texto nativo de una pagina usando pypdf."""
        try:
            from pypdf import PdfReader

            reader = PdfReader(pdf_path)
            if page_num < 1 or page_num > len(reader.pages):
                return ""
            page = reader.pages[page_num - 1]
            text = page.extract_text() or ""
            return text.strip()
        except Exception as e:
            logger.warning(f"pypdf fallo en pagina {page_num}: {e}")
            return ""

    @staticmethod
    def corruption_ratio(text: str) -> float:
        """
        Detecta caracteres corruptos: secuencias (cid:...), glifos no
        mapeados, caracteres de control inesperados.
        """
        if not text:
            return 0.0
        corrupt = 0
        for pattern in CORRUPTION_PATTERNS:
            corrupt += len(pattern.findall(text))
        return min(1.0, corrupt / max(len(text), 1))

    @staticmethod
    def image_area_ratio(pdf_path: str, page_num: int) -> float:
        """
        Calcula la proporcion del area de la pagina cubierta por
        imagenes XObject.
        """
        try:
            from pypdf import PdfReader

            reader = PdfReader(pdf_path)
            if page_num < 1 or page_num > len(reader.pages):
                return 0.0
            page = reader.pages[page_num - 1]

            # Obtener dimensiones de la pagina
            mediabox = page.mediabox
            if not mediabox:
                return 0.0
            page_w = float(mediabox.width)
            page_h = float(mediabox.height)
            page_area = page_w * page_h
            if page_area <= 0:
                return 0.0

            # Sumar areas de imagenes en /Resources/XObject
            image_area = 0.0
            resources = page.get("/Resources", {})
            xobjects = resources.get("/XObject", {})
            if isinstance(xobjects, dict):
                for obj in xobjects.values():
                    subtype = obj.get("/Subtype", "")
                    if subtype == "/Image":
                        w = float(obj.get("/Width", 0))
                        h = float(obj.get("/Height", 0))
                        image_area += w * h

            return min(1.0, image_area / page_area)
        except Exception:
            return 0.0
