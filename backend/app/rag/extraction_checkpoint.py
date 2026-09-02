"""
Checkpoints independientes por pagina para extraccion async-safe.

Cada pagina se guarda en un archivo separado (pagina_001.md, pagina_002.md...)
dentro de un directorio {pdf_name}_checkpoints/. Esto permite que tareas
asincronas escriban en paralelo sin conflictos de orden ni locking.
"""
import logging
import shutil
from pathlib import Path
from typing import Set

logger = logging.getLogger(__name__)


class ExtractionCheckpoint:
    """Maneja checkpoints por pagina en directorio dedicado."""

    def __init__(self, pdf_path: str):
        self.pdf_path = Path(pdf_path)
        self.checkpoint_dir = self.pdf_path.parent / f"{self.pdf_path.stem}_checkpoints"

    def ensure_dir(self) -> None:
        """Crea el directorio de checkpoints si no existe."""
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

    def page_path(self, page_num: int) -> Path:
        """Ruta del archivo para la pagina N: '.../pagina_003.md'."""
        return self.checkpoint_dir / f"pagina_{page_num:03d}.md"

    def completed_pages(self) -> Set[int]:
        """Escanea el directorio y devuelve los numeros de pagina completados."""
        if not self.checkpoint_dir.exists():
            return set()
        pages = set()
        for path in self.checkpoint_dir.glob("pagina_*.*"):
            if path.suffix not in {".md", ".txt", ".json"}:
                continue
            try:
                pages.add(int(path.stem.split("_", 1)[1]))
            except (IndexError, ValueError):
                continue
        return pages

    def page_exists(self, page_num: int) -> bool:
        """True si la pagina ya tiene checkpoint."""
        return self.page_path(page_num).exists()

    def save_page(self, page_num: int, content: str) -> None:
        """Guarda el contenido extraido de una pagina en su archivo."""
        self.ensure_dir()
        self.page_path(page_num).write_text(content, encoding="utf-8")

    def read_all(self) -> str:
        """
        Reensambla el texto completo en orden de pagina (1, 2, 3...).
        """
        if not self.checkpoint_dir.exists():
            return ""
        completed = sorted(self.completed_pages())
        parts = []
        for n in completed:
            p = self.page_path(n)
            if p.exists():
                parts.append(p.read_text(encoding="utf-8"))
        return "\n".join(parts)

    def cleanup(self) -> None:
        """Elimina el directorio de checkpoints y su contenido."""
        if self.checkpoint_dir.exists():
            shutil.rmtree(self.checkpoint_dir)
