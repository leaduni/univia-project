# Auditoría del pipeline `parse-matricula`

**Módulo:** Agenda / Carga Horaria  
**Archivo auditado:** [`backend/app/routers/agenda.py`](../../backend/app/routers/agenda.py)  
**Endpoint:** `POST /agenda/parse-matricula`  
**Fecha de auditoría:** 2026-09-24  
**Alcance:** inspección estática del flujo de datos. No se realizaron cambios en el código de aplicación.

## Resumen ejecutivo

El endpoint implementa una canalización híbrida:

1. Recibe un PDF como `UploadFile`.
2. Lee todo el archivo en memoria.
3. Extrae texto plano de cada página con `pdfplumber`.
4. Envía hasta 8.000 caracteres del texto a Gemini para identificar cursos y secciones.
5. Interpreta la respuesta de Gemini como JSON.
6. Busca en `carga_horaria` los bloques correspondientes a cada curso/sección.
7. Convierte día y horas a los formatos requeridos por la agenda.
8. Inserta cada bloque como un evento semanal individual en `agenda_eventos`.
9. Devuelve los eventos insertados y los cursos detectados.

No se usa `extract_tables()`, no hay expresiones regulares para el parseo de la matrícula y no existe una fecha de fin de semestre calculada en este endpoint.

## Pipeline detallado

### 1. Recepción del archivo

**Ubicación:** [`agenda.py`](../../backend/app/routers/agenda.py#L614)

El endpoint se declara como:

```python
@router.post("/parse-matricula")
async def parse_matricula(
    file: UploadFile = File(...),
    auth=Depends(get_current_user),
):
```

- El archivo llega mediante `multipart/form-data`.
- El usuario se obtiene mediante `get_current_user`.
- El cliente de Supabase se crea con el token del usuario: `sb = get_supabase(token)`.
- El archivo **no se guarda en un directorio temporal**.
- Se lee completamente en memoria mediante:

```python
pdf_bytes = io.BytesIO(await file.read())
```

La lectura se realiza dentro del bloque de extracción del PDF. Si ocurre un error, el endpoint registra el error y responde `400` con `"Error al leer el PDF."`.

### 2. Extracción con `pdfplumber`

**Ubicación:** [`agenda.py`](../../backend/app/routers/agenda.py#L628)

El módulo se importa dinámicamente:

```python
import pdfplumber
```

Si no está instalado, la respuesta es `500`.

La apertura y extracción son:

```python
with pdfplumber.open(pdf_bytes) as pdf:
    for page in pdf.pages:
        texto += (page.extract_text() or "") + "\n"
```

Hallazgos:

- Se usa `page.extract_text()`.
- **No** se usa `page.extract_tables()`.
- El resultado se acumula en la variable `texto`.
- Se agrega un salto de línea entre páginas.
- El PDF se procesa desde un objeto `BytesIO`; no se crea un archivo intermedio.
- Si el texto resultante está vacío o contiene únicamente espacios, se responde `400` con `"El PDF no contiene texto extraíble."`.

### 3. Transformación de datos: Gemini vs. algoritmo local

#### 3.1 Identificación y llamada a Gemini

**Ubicación:** [`agenda.py`](../../backend/app/routers/agenda.py#L645)

El parseo semántico de cursos se delega a Gemini:

```python
import google.generativeai as genai
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
modelo_nombre = os.getenv("GEMINI_GEN_MODEL", "gemini-2.0-flash")
modelo = genai.GenerativeModel(model_name=modelo_nombre)
```

- La clave se obtiene de `GEMINI_API_KEY`.
- El modelo se obtiene de `GEMINI_GEN_MODEL`.
- Si no se configura el modelo, el valor predeterminado es `gemini-2.0-flash`.
- Si falta la clave, la respuesta es `500`.
- Si falta la dependencia, la respuesta es `500`.

#### 3.2 Prompt exacto

El prompt enviado es:

```text
Analiza el siguiente texto extraído de una ficha de matrícula universitaria.
Extrae SOLO los cursos matriculados con su código y sección.
Responde EXCLUSIVAMENTE en formato JSON como una lista de objetos con las claves "course_code" y "section".
No incluyas explicaciones, solo el JSON.

Texto:
{texto[:8000]}
```

Observaciones:

- Solo se envían los primeros 8.000 caracteres del texto extraído.
- Se solicita una lista JSON de objetos.
- Cada objeto debe tener `course_code` y `section`.
- La configuración usa `max_output_tokens=2048`, `temperature=0.1` y `response_mime_type="application/json"`.
- La llamada bloqueante se ejecuta en un hilo mediante `asyncio.to_thread`.
- Un error de la API produce `502` con `"Error al procesar con IA."`.

#### 3.3 Procesamiento de la respuesta

La respuesta se toma de `resp_gemini.text` y se deserializa con `json.loads(raw)`.

Validaciones:

- La respuesta debe ser una lista.
- Si el JSON es inválido o la respuesta no es una lista, se registra una parte de la respuesta (`raw[:500]`) y se responde `422`.
- Si la lista está vacía, se responde `400` con `"No se detectaron cursos en el PDF."`.

No se observa un parser personalizado ni expresiones regulares (`re.match`, `re.search`, etc.) para extraer los cursos. La limpieza posterior es algorítmica y se limita a:

```python
code = item.get("course_code", "").strip().upper()
section = item.get("section", "").strip().upper()
```

Los elementos sin código o sección se omiten con `continue`.

### 4. Consulta de configuración y construcción del schema de agenda

#### 4.1 Fecha de inicio del semestre

**Ubicación:** [`agenda.py`](../../backend/app/routers/agenda.py#L705)

Se consulta `agenda_configuracion` usando el perfil del usuario:

```python
sb.table("agenda_configuracion") \
  .select("semester_start") \
  .eq("perfil_id", user.id) \
  .maybe_single() \
  .execute()
```

La fecha usada es:

```python
semester_start = (
    str(cfg["semester_start"])
    if cfg and cfg.get("semester_start")
    else date.today().isoformat()
)
```

- Si existe `semester_start`, se utiliza ese valor.
- Si no existe configuración, se usa la fecha actual del servidor.
- No se calcula ni se persiste una fecha de fin de semestre.
- La fecha de inicio solo sirve para obtener la primera fecha del calendario que corresponde al día de cada bloque.

#### 4.2 Etiqueta del evento

Antes de insertar eventos:

1. `_asegurar_etiquetas_defecto(sb, user.id)` crea etiquetas predeterminadas si el usuario no tiene ninguna.
2. Se consulta `agenda_etiquetas`.
3. Se selecciona la primera etiqueta cuyo nombre contenga `"clases"` sin distinguir mayúsculas/minúsculas.
4. Si no se encuentra, se usa la primera etiqueta disponible.
5. Si no existe ninguna, `etiqueta_id` queda en `None`.

#### 4.3 Búsqueda de bloques horarios

Para cada curso detectado se consulta `carga_horaria`:

```python
sb.table("carga_horaria") \
  .select("*") \
  .eq("codigo", code) \
  .eq("seccion", section) \
  .execute()
```

La consulta se realiza por cada elemento de `cursos_detectados`. Un curso puede devolver cero, uno o varios bloques.

#### 4.4 Conversión del día

**Ubicación:** [`agenda.py`](../../backend/app/routers/agenda.py#L563)

El helper `_day_code_to_weekday` transforma códigos internos a días ISO:

| Código | Día ISO |
|---|---:|
| `LU` | 1, lunes |
| `MA` | 2, martes |
| `MI` | 3, miércoles |
| `JU` | 4, jueves |
| `VI` | 5, viernes |
| `SA` | 6, sábado |

Un código desconocido cae por defecto en lunes (`1`).

`_first_date_for_day(semester_start, dia)`:

- Convierte `semester_start` con `date.fromisoformat`.
- Calcula el día ISO de la fecha inicial.
- Calcula la diferencia hasta el día objetivo.
- Si el día objetivo ya pasó dentro de la semana, suma siete días.
- Devuelve la primera fecha `YYYY-MM-DD` correspondiente al día del bloque.

No se contemplan domingos en el mapa; un valor desconocido termina tratado como lunes.

#### 4.5 Conversión de horas y duración

**Ubicación:** [`agenda.py`](../../backend/app/routers/agenda.py#L581)

El helper `_time_to_decimal` acepta `HH:MM` o `HH:MM:SS` y devuelve horas decimales:

```python
hi = _time_to_decimal(str(bloque["hora_inicio"]))
hf = _time_to_decimal(str(bloque["hora_fin"]))
duracion = round(hf - hi, 2)
```

Ejemplo: `08:30` se convierte en `8.5`.

#### 4.6 Mapeo de campos del evento

Por cada bloque se construye el siguiente payload:

| Campo de `agenda_eventos` | Valor / origen |
|---|---|
| `perfil_id` | `user.id` |
| `titulo` | `f"{code} - {label}"` |
| `subtitulo` | nombre del curso, sección, aula y docente |
| `tipo` | `"evento"` |
| `etiqueta_id` | etiqueta seleccionada de `agenda_etiquetas`, o `None` |
| `fecha_iso` | primera fecha del semestre que cae en el día del bloque |
| `hora_inicio` | `bloque["hora_inicio"]` convertido a decimal |
| `duracion` | `hora_fin - hora_inicio`, redondeada a dos decimales |
| `todo_el_dia` | `False` |
| `recurrencia` | `"weekly"` |
| `ubicacion` | `bloque.get("aula", "")` |

El título usa las etiquetas de `TIPO_LABELS`:

| `tipo_clase` | Etiqueta |
|---|---|
| `T` | `Teoría` |
| `P` | `Práctica` |
| `LAB` | `Laboratorio` |
| Otro valor | El valor original |

No existe un campo independiente `dia_semana` en el payload insertado. El día queda representado indirectamente por `fecha_iso`, y la repetición semanal por `recurrencia="weekly"`.

### 5. Persistencia en Supabase

**Ubicación:** [`agenda.py`](../../backend/app/routers/agenda.py#L760)

La inserción se ejecuta dentro del bucle de bloques:

```python
resp_ins = await _run(lambda: (
    sb.table("agenda_eventos").insert(payload).execute()
))
```

Por tanto:

- La persistencia se realiza con **peticiones individuales**.
- No se envía una lista completa a `.insert(...)`.
- Hay un `insert` por cada bloque encontrado en `carga_horaria`.
- Cada llamada está envuelta en `_run`, que ejecuta la operación síncrona de Supabase en un hilo aparte.
- Si la respuesta contiene filas, se toma la primera (`filas[0]`) y se agrega a `eventos_creados`.
- El resultado normalizado convierte `hora_inicio` y `duracion` a `float` y `fecha_iso` a `str` cuando están presentes.

No hay una transacción explícita que agrupe todos los inserts. Si falla una inserción después de que otras hayan sido exitosas, el endpoint puede dejar eventos parcialmente creados, según el comportamiento de `_run` y la excepción propagada por Supabase.

## Diagrama textual de la canalización

```text
UploadFile (multipart/form-data)
        |
        | await file.read()
        v
BytesIO en memoria
        |
        | pdfplumber.open(...)
        | page.extract_text()
        v
texto completo concatenado
        |
        | texto[:8000]
        | Gemini GenerativeModel.generate_content(...)
        v
JSON: [{"course_code": "...", "section": "..."}]
        |
        | json.loads + validación de lista
        v
cursos_detectados
        |
        | por curso: SELECT carga_horaria
        | codigo = code, seccion = section
        v
bloques horarios
        |
        | conversión día/fecha, horas decimales y payload
        v
agenda_eventos
        |
        | INSERT individual por bloque
        v
eventos_creados + cursos_detectados + mensaje
```

## Matriz de verificación

| Etapa | Resultado |
|---|---|
| Decorador `POST /parse-matricula` | Confirmado |
| Parámetro `UploadFile = File(...)` | Confirmado |
| Lectura en memoria con `await file.read()` | Confirmado |
| Archivo temporal en disco | No utilizado |
| `pdfplumber.open(...)` | Confirmado |
| `page.extract_text()` | Confirmado |
| `page.extract_tables()` | No utilizado |
| Llamada a Gemini | Confirmada |
| Prompt exacto | Documentado arriba |
| Respuesta JSON | `json.loads`, lista de objetos |
| Regex para parsear cursos | No utilizada |
| `titulo` | Generado como código + tipo de clase |
| Nombre del curso | En `subtitulo`, desde `carga_horaria.nombre_curso` |
| Día de la semana | Se convierte a fecha inicial; no se inserta como campo separado |
| Hora de inicio | Decimal |
| Hora de fin | Se usa para calcular duración; no se inserta como campo separado |
| Aula | En `ubicacion` y `subtitulo` |
| Sección | En `subtitulo`; también filtra la consulta |
| Fecha inicial de semestre | Desde `agenda_configuracion`, con fallback a hoy |
| Fecha final de semestre | No calculada |
| Tabla `agenda_eventos` | Confirmada |
| Inserción en bucle | Confirmada |
| Inserción en bloque | No utilizada para este endpoint |

## Conclusión

`parse-matricula` no es un parser de tablas PDF determinista. Es un pipeline híbrido en el que `pdfplumber` únicamente convierte el PDF a texto plano y Gemini identifica los cursos y secciones. La resolución de horarios y la construcción de eventos se realiza posteriormente con lógica Python y consultas a Supabase.

La persistencia se ejecuta evento por evento en `agenda_eventos`, dentro de un bucle anidado (curso → bloque horario), sin inserción masiva ni transacción explícita visible en este endpoint.
