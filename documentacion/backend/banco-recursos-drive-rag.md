# Banco de Recursos + Integración Drive + RAG de evaluaciones

Resumen de la rama `feature/rebrand-courses-evaluations` (sesión del 2026-07-29/30).
Cubre tres frentes relacionados: poblar el banco de recursos desde Drive, conectar
esos recursos al RAG que usa el generador de evaluaciones, y un fix puntual de
LaTeX en ese mismo generador. Se agrega también un hallazgo aparte (rutas de
aprendizaje faltantes) con una solución parcial en curso.

---

## 1. Banco de Recursos (biblioteca + tab por curso)

**Antes:** `GET /api/recursos` era un stub que devolvía `[]`. El tipo `Recurso`
del frontend no coincidía con las columnas reales de la tabla, y el botón
"Descargar" no tenía `onClick`. El tab "Banco de exámenes" de cada curso usaba
datos 100% inventados construidos en `cursos.py`.

**Ahora:**

| Archivo | Qué hace |
|---|---|
| `base_de_datos/esquema/migracion_fase4_recursos.sql` | Agrega `url_drive`, `drive_file_id`, `nombre_curso`, `codigo_curso` a `recursos` + índices. **Ya ejecutada en Supabase.** |
| `backend/app/core/tipos_recursos.py` | Normalización canónica de `tipo` (Examen/Practica/Silabo/PDF/Compendio/Libro/Apunte/Video), compartida entre el endpoint y los scripts de ingesta |
| `backend/scripts_manuales/ingestar_recursos_drive.py` | Barre la carpeta pública de Drive (`1EY6Bm0NXTm85VkVLIC7T4-lilubKDQDV`), matchea carpetas a cursos por prefijo de código, infiere `tipo`/`year` del nombre de archivo, hace upsert idempotente en `recursos` |
| `backend/app/routers/recursos.py` | Endpoint real: filtros `tipo/curso_id/ciclo/year/facultad/codigo_curso/search`, enriquecido con joins a `cursos`→`carreras`→`facultades`. Excluye recursos con `curso_id NULL` (huérfanos, ver abajo) |
| `frontend/types/recurso.ts`, `lib/api-service.ts` | Tipo y filtros alineados al shape real de la API |
| `frontend/components/recursos-biblioteca.tsx`, `recursos/recurso-card.tsx` | Biblioteca funcional con filtros reales; Descargar/Previsualizar abren `url_drive` |
| `frontend/components/learning-path/exam-bank.tsx` | El tab "Banco de exámenes" ahora pide `getRecursos({curso_id})` en vez de datos inventados; mantiene el merge de planchas locales de Geometría Analítica |

**Recursos huérfanos:** cuando el código de una carpeta de Drive no matchea
ningún curso de la malla, el recurso se guarda igual (para no perder nada) pero
con `curso_id = NULL`. Por pedido explícito, **no se muestran en la biblioteca
pública** — quedan en la base para revisión manual. Hoy son ~460 de 1456 filas.

**Estado de datos (última corrida):** 1456 recursos totales, 996 con curso
asignado (51 cursos). El heurístico de `tipo` se corrigió para reconocer
abreviaturas de la UNI (`PC1-4` = Práctica Calificada, `EP/EF/ES` = Examen
Parcial/Final/Sustitutorio) que originalmente caían todas en el balde
genérico "PDF".

### Bug de LaTeX corregido (efecto colateral, mismo módulo de evaluaciones)

En `backend/app/routers/evaluaciones.py`, el sanitizador de LaTeX
(`_sanitizar_latex_str`) borraba `\lfloor`/`\rfloor`/`\lceil`/`\rceil` sueltos
pensando que eran restos de una matriz mal cerrada, pero si venían precedidos
de `\left`/`\right` (el modelo confundiendo piso/techo con valor absoluto) los
dejaba huérfanos — `\left`/`\right` sin delimitador rompen KaTeX y se veía el
LaTeX crudo en rojo. Ahora esos casos se convierten a `\left|`/`\right|`
(barras de valor absoluto válidas) antes de la limpieza genérica.

---

## 2. Conexión Drive → RAG de evaluaciones (`resource_chunks`)

El generador de evaluaciones (`/api/evaluaciones/generar-stream`) usa RAG real:
`SyllabusRetriever.buscar_contexto_por_nombre` → RPC
`search_resource_chunks_by_nombre` (`base_de_datos/rag/rag_search_by_nombre.sql`)
sobre `resource_chunks` (texto + embeddings). Esa tabla **no se llenaba desde
Drive** — solo desde `backend/app/rag/cargar_compendio.py`, un script manual que
además crea su propia fila en `recursos` en vez de reusar una existente.

**Nuevo:** `backend/scripts_manuales/generar_chunks_desde_drive.py` reutiliza
`SyllabusExtractor` / `SyllabusChunker` / `SyllabusEmbedder` / `SyllabusIngestor`
tal cual, pero:
- Toma recursos ya existentes con `tipo in (Examen, Practica)` y `curso_id`
  resuelto (los que sirven de "ejercicio real" para el prompt).
- **Deduplica por `drive_file_id`**: un mismo PDF compartido entre carreras
  (mismo código de curso) se procesa una sola vez — `search_resource_chunks_by_nombre`
  empareja por **nombre** de curso, no por `curso_id`, así que un solo
  `recurso_id` embebido sirve para todas las variantes de carrera.
- Es **idempotente/reanudable**: salta cualquier `recurso_id` que ya tenga
  chunks. Si Gemini agota su cuota diaria, se detiene solo tras 3 fallos
  seguidos con un mensaje claro — se retoma corriendo el script de nuevo,
  sin flags.

**Estado a la fecha:** 62 archivos únicos candidatos (Examen/Practica con curso
resuelto). Procesados hasta ahora: **43 recursos con chunks**, cubriendo 5 de
51 cursos con recursos (Química I, Física I, Geometría Analítica, Cálculo
Diferencial, Introducción al Pensamiento y a la Ing. de Sistemas).
**Quedan ~19 archivos únicos pendientes** — correr
`python scripts_manuales/generar_chunks_desde_drive.py` (opcionalmente con
`--limit N` para tandas chicas) cuando la cuota de Gemini lo permita.

---

## 3. Rutas de aprendizaje faltantes (hallazgo nuevo, en curso)

Al revisar el tab "Ruta de aprendizaje" se encontró que **33 de 59 cursos no
tienen ninguna fila en `learning_path_steps`** — la tabla se generó una sola
vez (`base_de_datos/semillas/generate_learning_paths_sql.py`) para solo 10
códigos de curso hardcodeados, a partir de CSVs de sílabos procesados a mano.

**Nuevo (parcial):** `backend/scripts_manuales/generar_silabos_faltantes.py`
extiende esa idea a cualquier curso que tenga un recurso tipo Silabo real en
Drive: extrae el sílabo con `SyllabusExtractor` (modo `"silabo"`), lo estructura
en unidades semanales con OpenAI (mismo patrón de generación JSON que
`evaluaciones.py`), e inserta en `learning_path_steps` — deduplicando por
`drive_file_id` igual que el script de RAG, ya que acá si hace falta insertar
una fila por cada `curso_id` real (no hay búsqueda por nombre para esta tabla).

**Alcance real:** de los 33 cursos sin ruta, **16 tienen** un recurso tipo
Silabo disponible (los otros 17 no tienen sílabo en Drive — ahí no hay de
dónde generar nada por ahora). Contando códigos compartidos entre carreras son
menos PDFs únicos a procesar.

**Estado:** el script se escribió y se probó (1 archivo) pero **no se corrió
en serio** — se agotó la cuota diaria de Gemini antes de tener un caso
exitoso completo. Queda pendiente correrlo cuando haya cuota disponible.

---

## 4. Pendientes / cómo continuar

1. **Correr `generar_chunks_desde_drive.py`** hasta cubrir los ~19 archivos
   Examen/Practica que faltan (reanudable, sin flags).
2. **Correr `generar_silabos_faltantes.py`** para los 16 cursos con sílabo
   disponible (aún sin un caso exitoso confirmado — revisar el primer
   resultado con cuidado antes de soltar el resto).
3. Ambos comparten `GEMINI_INGEST_API_KEY` — sin facturación activa la cuota se agota enseguida.
   No conviene correr los dos scripts a la vez: se agota más rápido.
4. Los 17 cursos sin sílabo en Drive y los recursos huérfanos (`curso_id NULL`)
   quedan sin resolver — necesitan que alguien suba el material faltante a
   Drive o corrija el nombre de la carpeta para que matchee un curso real;
   no es algo que se arregle con código.

## Archivos clave de esta sesión

- `base_de_datos/esquema/migracion_fase4_recursos.sql` (nuevo, ya aplicada)
- `backend/app/core/tipos_recursos.py` (nuevo)
- `backend/scripts_manuales/ingestar_recursos_drive.py` (nuevo)
- `backend/scripts_manuales/generar_chunks_desde_drive.py` (nuevo)
- `backend/scripts_manuales/generar_silabos_faltantes.py` (nuevo, sin validar en serio)
- `backend/app/routers/recursos.py` (reescrito)
- `backend/app/routers/cursos.py` (se quitó el bloque `exam_bank` inventado)
- `backend/app/routers/evaluaciones.py` (fix del sanitizador LaTeX)
- `frontend/types/recurso.ts`, `lib/api-service.ts`, `lib/mockData.ts`,
  `components/recursos-biblioteca.tsx`, `components/recursos/recurso-card.tsx`,
  `components/dashboard/recent-resources.tsx`,
  `components/learning-path.tsx`, `components/learning-path/exam-bank.tsx`
