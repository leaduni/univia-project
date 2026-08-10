# Spec: Fase 1 — Quick Wins del Pipeline RAG

- **Estado:** ESPECIFICACIÓN
- **Fecha:** 2026-08-10
- **Referencias:**
  - Diagnóstico: `docs/diagnostics/chunking-pipeline-analysis.md`
  - Riesgos y trade-offs: `docs/diagnostics/ARQUITECTURA_RAG_OPTIMIZACION.md`
- **Archivos afectados:**
  - `backend/app/rag/embedder.py` — Hitos 1.1 y 1.2
  - `backend/app/rag/extractor.py` — Hito 1.3
  - `backend/app/rag/chunker.py` — sin cambios en Fase 1
  - `backend/app/rag/ingest.py` — sin cambios en Fase 1

---

## Hito 1.1 — Embedder Dinámico con Backoff Exponencial + Jitter

### Objetivo

Eliminar el `time.sleep(2)` fijo en `SyllabusEmbedder.embedding_generator()` y reemplazarlo por un mecanismo de rate-limiting adaptativo que solo espere cuando la API responde con HTTP 429.

### Cambios en la interfaz

#### Constructor

```python
class SyllabusEmbedder:
    def __init__(
        self,
        model_name: str = "models/gemini-embedding-2",
        expected_dimensions: int = 1536,
        batch_size: int = 20,          # ← nuevo: configurable, default 20
        max_retries: int = 5,          # ← nuevo
        base_delay: float = 1.0,       # ← nuevo: delay base para backoff
        max_delay: float = 60.0,       # ← nuevo: cota superior de espera
    ):
```

#### Método principal

```python
def embedding_generator(self, chunks: list) -> list:
    """
    Convierte una lista de chunks en embeddings usando Gemini Embedding.

    Comportamiento:
    - Procesa en lotes de tamaño self.batch_size.
    - Ante HTTP 200: avanza al siguiente lote SIN sleep.
    - Ante HTTP 429: aplica backoff exponencial con jitter y reintenta hasta max_retries.
    - Ante otro error no recuperable: loggea, corta el lote actual y continúa con el siguiente.
    - Devuelve solo los chunks que se vectorizaron exitosamente (degradación elegante).

    Returns:
        Lista de dicts con estructura {contenido, embedding}, misma forma que el actual.
        Puede ser más corta que la entrada si algunos lotes fallaron definitivamente.
    """
```

#### Algoritmo de backoff

```python
def _backoff_delay(attempt: int, base: float, max_delay: float) -> float:
    """
    Calcula delay = min(max_delay, base * 2^attempt) + random.uniform(0, 1).
    El jitter (0-1s) evita el efecto "thundering herd" cuando múltiples workers
    reintentan simultáneamente.
    """
```

### Contrato de tests (TDD)

| ID | Test | Assert |
|---|---|---|
| T1.1.1 | Lote exitoso (HTTP 200) no ejecuta sleep | Mockear `embed_content` para éxito inmediato. Verificar que `time.sleep` NO fue llamado. |
| T1.1.2 | HTTP 429 → reintenta con backoff y eventualmente éxito | Mockear 429 en intentos 1-2, 200 en intento 3. Verificar 3 llamadas totales y delays calculados con jitter. |
| T1.1.3 | HTTP 429 agota max_retries → lote se salta | Mockear 429 en los 5 intentos. Verificar que el lote NO se incluye en el resultado. |
| T1.1.4 | Error no recuperable (500) → corta lote, continúa | Mockear 500. Verificar que el lote se salta y los lotes siguientes se procesan. |
| T1.1.5 | batch_size configurable se respeta | Instanciar con batch_size=7, pasar 21 chunks. Verificar 3 lotes exactos. |
| T1.1.6 | Degradación elegante: resultado parcial si algunos lotes fallan | 3 lotes: lote 1 OK, lote 2 429×5 (falla), lote 3 OK. Verificar len(resultado) = 2*batch_size. |

---

## Hito 1.2 — Infraestructura de Caché de Embeddings

### Objetivo

Evitar llamadas redundantes a Gemini Embedding cuando el mismo contenido de chunk ya fue vectorizado previamente. Se usa un hash SHA-256 del texto normalizado como clave de caché.

### Diseño

#### Módulo nuevo: `backend/app/rag/embedding_cache.py`

```python
import hashlib
from typing import Optional

def hash_chunk(contenido: str) -> str:
    """
    Calcula SHA-256 del contenido normalizado (strip + lower + espacios colapsados).
    La normalización asegura que variaciones triviales de whitespace no generen
    hashes distintos para contenido semánticamente idéntico.

    Returns:
        String hexadecimal de 64 caracteres.
    """

def normalizar(texto: str) -> str:
    """
    strip() + lower() + re.sub(r'\s+', ' ', texto).
    """

class EmbeddingCache:
    def __init__(self, supabase_client):
        """
        Recibe un cliente de Supabase ya autenticado.
        La tabla 'embedding_cache' se asume creada (ver SQL abajo).
        """

    def lookup(self, chunk_hash: str) -> Optional[list[float]]:
        """
        Busca un embedding por hash en la tabla embedding_cache.
        Returns: lista de 1536 floats si existe, None si no.
        """

    def store(self, chunk_hash: str, embedding: list[float]) -> None:
        """
        Inserta (hash, embedding) en embedding_cache.
        Usa upsert para ser idempotente ante re-procesamientos.
        """
```

#### Tabla SQL nueva

```sql
CREATE TABLE IF NOT EXISTS public.embedding_cache (
    chunk_hash text PRIMARY KEY,
    embedding  vector(1536) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- La búsqueda es por clave exacta (hash), no por similitud:
CREATE INDEX IF NOT EXISTS embedding_cache_hash_idx
ON public.embedding_cache (chunk_hash);
```

#### Integración en `SyllabusEmbedder.embedding_generator()`

Antes de llamar a `embed_content` para cada lote:
1. Calcular `hash_chunk()` para cada chunk del lote.
2. Para los chunks con hit en caché: usar el embedding cacheado, no llamar a la API.
3. Para los MISS: llamar a la API con esos chunks. Al recibir respuesta, guardar en caché.
4. Reensamblar el lote en orden original.

### Contrato de tests (TDD)

| ID | Test | Assert |
|---|---|---|
| T1.2.1 | `hash_chunk` es determinista | Mismo contenido → mismo hash. |
| T1.2.2 | `hash_chunk` es inmune a whitespace | "Hola  mundo" y "Hola mundo" producen mismo hash (por normalización). |
| T1.2.3 | `hash_chunk` es sensible a cambios reales | "Hola" ≠ "hola" (antes de normalizar) pero normalización las vuelve igual. "Cálculo I" ≠ "Cálculo II". |
| T1.2.4 | Cache HIT: no llama a la API | Mockear caché con hit. Verificar 0 llamadas a `embed_content`. |
| T1.2.5 | Cache MISS + API éxito → guarda en caché | Mockear caché miss + API 200. Verificar que `cache.store()` fue llamado. |
| T1.2.6 | Lote mixto: 3 HIT + 2 MISS → solo llama API para los 2 | Verificar que `embed_content` recibe solo 2 textos. |

---

## Hito 1.3 — Validador de Payloads de Imagen (WebP/JPEG + DPI reducido)

### Objetivo

Agregar un helper de preprocesamiento de imágenes que convierta las páginas PDF renderizadas a un formato más liviano (JPEG calidad 85 o WebP) con DPI reducido (150), *solo si no degrada la calidad de extracción*. El comportamiento default del extractor no cambia hasta que se valide el gate.

### Diseño

#### Módulo nuevo: `backend/app/rag/image_optimizer.py`

```python
from PIL import Image
from io import BytesIO
from typing import Literal

FormatOption = Literal["jpeg", "webp"]

def optimizar_imagen(
    imagen_pil: Image.Image,
    formato: FormatOption = "jpeg",
    calidad: int = 85,
) -> bytes:
    """
    Convierte una imagen PIL a bytes optimizados.

    Args:
        imagen_pil: Imagen en memoria (RGB).
        formato: 'jpeg' (más compatible) o 'webp' (mejor compresión).
        calidad: 1-100, default 85.

    Returns:
        Bytes de la imagen comprimida listos para enviar a Gemini.
    """

def reducir_dpi(
    imagen_pil: Image.Image,
    dpi_original: int,
    dpi_objetivo: int = 150,
) -> Image.Image:
    """
    Reescala la imagen proporcionalmente para simular un DPI menor.

    factor = dpi_objetivo / dpi_original
    Nueva resolución = original * factor.
    """

def comparar_extraccion(
    texto_referencia: str,   # salida de Gemini a 200 DPI PNG
    texto_optimizado: str,   # salida de Gemini a 150 DPI JPEG
) -> dict:
    """
    Compara dos extracciones y devuelve métricas de fidelidad.

    Returns:
        {
            "chars_referencia": int,
            "chars_optimizado": int,
            "chars_diferencia": int,
            "chars_diferencia_pct": float,
            "ratio_longitud": float,
            "lineas_referencia": int,
            "lineas_optimizado": int,
        }
    """
```

### Gate de validación

Antes de habilitar la optimización en producción, se debe correr el script `backend/scripts_manuales/validar_optimizacion_imagenes.py` sobre una muestra de 15-20 páginas con contenido matemático denso. El criterio de aprobación es:

```
chars_diferencia_pct < 5%  Y  ratio_longitud entre 0.90 y 1.10
```

### Contrato de tests (TDD)

| ID | Test | Assert |
|---|---|---|
| T1.3.1 | `optimizar_imagen` produce bytes JPEG válidos | Bytes no vacíos, `PIL.Image.open(BytesIO(result))` no lanza excepción. |
| T1.3.2 | `optimizar_imagen` con WebP produce bytes WebP válidos | Ídem con formato='webp'. |
| T1.3.3 | `reducir_dpi` escala correctamente | Imagen 1000×800 a 200 DPI → 750×600 a 150 DPI (factor 0.75). |
| T1.3.4 | `comparar_extraccion` detecta diferencia nula | Mismo texto → chars_diferencia=0, ratio=1.0. |
| T1.3.5 | `comparar_extraccion` detecta diferencia significativa | Textos con 20% de divergencia → chars_diferencia_pct ≈ 20. |
| T1.3.6 | Imagen RGB se mantiene RGB después de optimizar | Verificar mode == 'RGB'. |
| T1.3.7 | Imagen RGBA se convierte a RGB antes de JPEG | JPEG no soporta alpha → debe convertir sin error. |

---

## Orden de ejecución TDD

```
Fase 1 — Hito 1.2 (Caché)   → T1.2.1–T1.2.6   [independiente, sin dependencias de API]
Fase 2 — Hito 1.1 (Embedder) → T1.1.1–T1.1.6   [depende de Hito 1.2 para el método embedding_generator]
Fase 3 — Hito 1.3 (Imágenes) → T1.3.1–T1.3.7   [independiente, puro procesamiento de imágenes]
```

---

## Dependencias nuevas

```txt
# requirements.txt (añadir si no existen)
Pillow>=10.0.0    # para image_optimizer.py (Hito 1.3)
```

---

## Criterios de aceptación de la Fase 1

- [ ] `time.sleep(2)` fijo ELIMINADO de `embedder.py`
- [ ] Backoff exponencial con jitter implementado y testeado (6 tests T1.1.x)
- [ ] `EmbeddingCache` funcional con tabla `embedding_cache` (6 tests T1.2.x)
- [ ] `image_optimizer.py` con funciones de conversión y gate de comparación (7 tests T1.3.x)
- [ ] `pytest backend/tests/rag/` — 19/19 tests en verde
- [ ] Cero cambios en `chunker.py`, `ingest.py` o `extractor.py` (excepto integración de `image_optimizer` como helper, sin modificar el flujo principal)
