# Chatbot de UniVia: funcionamiento completo de extremo a extremo

## 1. Propósito de este documento

Este documento explica cómo funciona el chatbot de UniVia desde que la aplicación
se carga hasta que el asistente responde, incluyendo qué ocurre cuando el usuario
envía un segundo mensaje relacionado con el anterior.

El documento describe el comportamiento que se observa en el código actual. No
modifica ningún archivo de código ni sustituye la lectura de los archivos fuente.
Las rutas se expresan relativas a la raíz del repositorio:

- Frontend: `frontend/`
- Backend: `backend/`
- Base de datos: `base_de_datos/`

## 2. Resumen mental del sistema

El chatbot tiene cinco capas:

1. **Interfaz:** una burbuja flotante y un panel de conversación.
2. **Estado del frontend:** mensajes visibles, conversación activa, estado de
   streaming y recuperación del historial.
3. **Cliente HTTP/SSE:** envía el token de Supabase y consume la respuesta
   fragmento a fragmento.
4. **Backend FastAPI:** autentica, persiste el turno, recupera el historial,
   clasifica la intención, consulta la fuente adecuada y genera la respuesta.
5. **Datos y modelo:** Supabase contiene historial, catálogo, progreso y
   documentos; Groq genera la clasificación y el texto; el RAG busca fragmentos
   relevantes del material académico.

El flujo central es:

```text
Usuario autenticado
  -> ChatBubble
  -> ChatPanel
  -> enviarMensajeChat()
  -> POST /api/chatbot/mensajes
  -> autenticación Supabase
  -> crear o validar conversación
  -> leer últimos turnos
  -> guardar mensaje del usuario
  -> reformular seguimiento contextual
  -> clasificar intención
  -> ejecutar handler
  -> cargar contexto académico del usuario
  -> construir prompt
  -> Groq en streaming
  -> eventos SSE
  -> actualizar burbuja en tiempo real
  -> guardar respuesta completa
```

## 3. Archivos que intervienen

### 3.1. Montaje y UI del frontend

- `frontend/app/layout.tsx`
  - Monta `<ChatBubble />` en el layout raíz.
  - Lo hace fuera de `DashboardLayout` para que el componente no se destruya
    al navegar entre páginas.
  - También monta `AuthProvider`, que entrega la sesión y el usuario.

- `frontend/components/chat/chat-bubble.tsx`
  - Es el contenedor principal y la composición del chatbot.
  - Decide si debe mostrarse.
  - Mantiene el estado de mensajes y conversación.
  - Abre, cierra, limpia y expande el panel.
  - Recupera el hilo desde `localStorage` y la API.
  - Inicia y cancela el streaming.

- `frontend/components/chat/chat-panel.tsx`
  - Es la presentación del panel.
  - Dibuja historial, sugerencias, input, botón de envío y botón de detener.
  - No habla directamente con el backend.

- `frontend/components/chat/message-bubble.tsx`
  - Dibuja una burbuja de usuario o asistente.
  - Muestra los tres puntos mientras no ha llegado el primer fragmento.
  - Renderiza Markdown en respuestas del asistente.
  - Muestra tarjetas de recursos descargables.

- `frontend/components/chat/chat-skeleton.tsx`
  - Placeholder mientras se recupera el historial.

- `frontend/components/chat/use-smart-scroll.ts`
  - Mantiene el scroll al final cuando corresponde.
  - Permite que el usuario lea mensajes anteriores sin ser llevado
    automáticamente al final.

- `frontend/components/chat/use-gsap-chat.ts`
  - Solo controla animaciones de apertura, cierre y entrada de mensajes.
  - No participa en la lógica de negocio.

### 3.2. Contrato y comunicación del frontend

- `frontend/types/chatbot.ts`
  - Define las intenciones, adjuntos y forma interna de un mensaje.
  - `MensajeChat` es el modelo que usa la UI; no es exactamente la fila cruda de
    la base de datos.

- `frontend/lib/chatbot-service.ts`
  - Ejecuta `POST /api/chatbot/mensajes`.
  - Envía el texto, el `conversacion_id` y el token Bearer.
  - Lee el cuerpo como stream SSE.
  - Expone tres callbacks:
    - `onCabecera`: recibe conversación, intención y adjuntos.
    - `onDelta`: recibe cada fragmento de texto.
    - `onError`: recibe errores enviados dentro del stream.

- `frontend/lib/api-service.ts`
  - Su método `obtenerConversacionChat(id)` ejecuta
    `GET /api/chatbot/conversaciones/{id}` para recuperar el historial.

### 3.3. Entrada del backend

- `backend/app/main.py`
  - Registra `chatbot.router` con el prefijo `/api`.
  - Por eso las rutas declaradas como `/chatbot/...` se consumen como
    `/api/chatbot/...`.
  - Configura CORS, hosts permitidos y manejadores de errores globales.

- `backend/app/routers/chatbot.py`
  - Es el orquestador del turno.
  - Define modelos de entrada, endpoints, persistencia, historial, prompt y
    streaming.

- `backend/app/core/auth_utils.py`
  - Extrae el header `Authorization: Bearer <token>`.
  - Valida el token con Supabase Auth.
  - Devuelve `(user, token)` al router.

- `backend/app/core/database.py`
  - Proporciona el cliente Supabase usado por los endpoints.

### 3.4. Decisión y ejecución de la respuesta

- `backend/app/chatbot/intents.py`
  - Decide la intención.
  - También resuelve referencias a turnos anteriores y reformula consultas
    anafóricas.

- `backend/app/chatbot/handlers.py`
  - Contiene la mayoría de las ramas de negocio.
  - Cada handler devuelve un `Contexto` con:
    - instrucciones adicionales para el modelo;
    - datos verificados que se inyectan en el prompt;
    - adjuntos para la UI y la persistencia;
    - o una respuesta fija que no necesita modelo.

- `backend/app/chatbot/consultas.py`
  - Resuelve consultas relacionales de docentes y prerrequisitos.

- `backend/app/chatbot/skills.py`
  - Define instrucciones para quiz, cronograma y flashcards.

- `backend/app/chatbot/user_context.py`
  - Carga perfil, malla, progreso, avance, cursos activos, prerrequisitos y
    recomendación académica.

- `backend/app/core/llm.py`
  - Crea el cliente de Groq y llama al modelo de chat.
  - El chatbot usa la interfaz compatible con OpenAI de Groq.

- `backend/app/chatbot/prompts/system.md`
  - Prompt base del asistente.
  - Define identidad, tono, formato, fuentes autorizadas y reglas de
    seguridad/anti-invención.

### 3.5. RAG y base de datos

- `backend/app/rag/retriever.py`
  - Construye un `SyllabusRetriever`.
  - Vectoriza la pregunta y llama a la RPC de búsqueda del chatbot.

- `backend/app/rag/embedder.py`
  - Genera el embedding de la pregunta con el proveedor configurado.
  - Debe usar el mismo espacio vectorial que se usó para ingerir documentos.

- `base_de_datos/rag/rag_search_chatbot_hybrid.sql`
  - Define `search_chatbot_resource_chunks`.
  - Fusiona búsqueda semántica y búsqueda de texto completo.
  - Filtra por curso o profesor cuando corresponde.

- `base_de_datos/esquema/migracion_fase8_chatbot.sql`
  - Define `chat_conversaciones` y `chat_mensajes`.
  - Añade índices, RLS y retención de 30 días.

## 4. Qué ocurre al abrir la aplicación

### 4.1. Montaje inicial

1. Next.js renderiza `frontend/app/layout.tsx`.
2. Se crea el `AuthProvider`.
3. Se monta `ChatBubble` en todas las páginas que usan ese layout.
4. `ChatBubble` recibe:
   - `user`;
   - `session`;
   - `session.access_token`;
   - el estado de conexión de `useOnline()`.

### 4.2. Condición para mostrar la burbuja

`ChatBubble` devuelve `null` y no muestra nada si falta cualquiera de estas
condiciones:

- no hay usuario autenticado;
- el onboarding no está completo;
- no existe `session.access_token`.

El motivo es que varias consultas del bot necesitan carrera, malla y datos del
estudiante. El chatbot no se ofrece como si pudiera responder correctamente
cuando todavía falta esa configuración.

### 4.3. Recuperación automática del hilo

Cuando existe `user.id`, el componente busca en `localStorage` la clave:

```text
univia_chat_conversacion_<userId>
```

El valor guardado es el número de la conversación activa.

Si existe:

1. Activa `cargandoHistorial`.
2. Llama a `apiService.obtenerConversacionChat(id)`.
3. El cliente ejecuta `GET /api/chatbot/conversaciones/{id}`.
4. El backend autentica al usuario.
5. Verifica que la conversación pertenece a ese usuario.
6. Consulta `chat_mensajes` ordenados por `created_at`.
7. Devuelve mensajes, `intent` y `metadata`.
8. `mapearMensajeGuardado()` transforma cada fila al shape `MensajeChat`.
9. `ChatBubble` guarda el `conversacionId` en un `ref` y repinta el panel.

Si el hilo no existe, fue eliminado o expiró:

- el backend responde 404;
- el cliente devuelve `null`;
- se borra el id de `localStorage`;
- el chatbot comienza un hilo nuevo.

El fallo de recuperación no rompe la pantalla: se descarta el identificador
viejo y el usuario puede continuar.

## 5. Qué ocurre al pulsar la burbuja

1. El usuario pulsa el botón fijo del FAB.
2. `alternar()` decide entre `abrirChat()` y `cerrarChat()`.
3. `abrirChat()`:
   - marca que el usuario ya interactuó;
   - elimina el indicador de mensajes no vistos;
   - pone `abierto = true`.
4. Se monta el overlay oscuro y el panel.
5. GSAP anima la entrada, salvo que el usuario prefiera reducir movimiento.
6. `ChatPanel` recibe por props:
   - mensajes;
   - estado de carga;
   - estado de streaming;
   - callbacks de envío, cancelación, limpieza y cierre;
   - estado de conexión.
7. Si no hay mensajes:
   - muestra “¿En qué te ayudo?”;
   - muestra sugerencias rápidas.
8. Al montar el panel, el textarea recibe foco.

Cerrar con X, Escape o clic fuera únicamente oculta el panel. No borra el
historial ni cambia la conversación activa.

## 6. Qué ocurre al escribir y enviar

### 6.1. Validaciones del frontend

El `textarea`:

- limita el texto a 4000 caracteres;
- crece hasta cinco filas;
- deshabilita la entrada si no hay conexión;
- deshabilita la entrada mientras otra respuesta está en streaming.

Enter envía el mensaje. Shift+Enter inserta una nueva línea.

El botón de sugerencia primero actualiza el input y, en el siguiente ciclo del
event loop, dispara el envío.

### 6.2. Estado optimista

`ChatBubble.enviar(texto)` crea dos ids temporales:

- uno para el mensaje del usuario;
- otro para la futura respuesta del asistente.

Antes de recibir la red, agrega:

```text
user      -> contenido = texto
assistant -> contenido = "", enCurso = true
```

Por eso el usuario ve inmediatamente su mensaje y los tres puntos del asistente.

### 6.3. Caso sin conexión

Si `useOnline()` indica que no hay red:

1. No se ejecuta `fetch`.
2. Se agrega el mensaje del usuario.
3. Se agrega un mensaje de error del asistente.
4. Se guarda `textoOrigen`.
5. La UI permite pulsar “Reintentar”.

## 7. Comunicación HTTP del turno

`enviarMensajeChat()` ejecuta:

```http
POST /api/chatbot/mensajes
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

Body:

```json
{
  "mensaje": "texto escrito por el usuario",
  "conversacion_id": 123
}
```

En el primer mensaje `conversacion_id` puede omitirse. El backend abrirá el hilo
automáticamente.

El cliente usa un `AbortController` propio y otro para el timeout de conexión:

- espera hasta 45 segundos por las cabeceras iniciales;
- una vez recibidas las cabeceras, permite que el stream continúe;
- si el usuario pulsa detener, aborta la petición;
- si el componente se desmonta durante logout/navegación, aborta el turno.

No utiliza `fetchWithAuth()` porque ese helper está diseñado para respuestas
JSON completas y no para leer un stream token a token.

## 8. Autenticación en el backend

Antes de ejecutar el endpoint:

1. FastAPI ejecuta `get_current_user`.
2. `extraer_token()` exige el esquema Bearer.
3. Supabase Auth valida el token.
4. Si el token es válido, el router recibe `user` y `token`.
5. `get_supabase(token)` crea un cliente que consulta Supabase en el contexto de
   la sesión del usuario.
6. Las políticas RLS limitan la lectura y escritura al propio perfil.

Errores de autenticación:

- header ausente: 401;
- formato inválido: 401;
- sesión vencida o inválida: 401.

## 9. Preparación del turno en `POST /api/chatbot/mensajes`

El endpoint `enviar_mensaje()` sigue esta secuencia exacta.

### 9.1. Validaciones iniciales

1. Comprueba que `get_groq()` devuelve un cliente.
2. Si no hay `GROQ_API_KEY`, responde 503.
3. Recorta espacios del mensaje.
4. Si queda vacío, responde 422.
5. Pydantic impide superar 4000 caracteres.

Estos errores ocurren antes de abrir el stream, por lo que son respuestas HTTP
normales y no eventos SSE parciales.

### 9.2. Crear o validar conversación

Si `conversacion_id` es `null`:

1. `_titulo_desde(mensaje)` convierte el primer mensaje en un título.
2. Lo limita a 60 caracteres.
3. `_crear_conversacion()` inserta una fila en `chat_conversaciones`.
4. Se obtiene el id generado.

Si sí llega un id:

1. Se usa ese hilo.
2. `_verificar_propiedad()` busca la conversación por `id` y `perfil_id`.
3. Si no pertenece al usuario, se responde 404.

El uso de 404 en vez de 403 evita confirmar que existe un hilo de otra persona.

### 9.3. Leer historial antes de guardar el mensaje actual

`_historial()`:

1. Consulta `chat_mensajes` del hilo.
2. Ordena por `created_at DESC`.
3. Toma como máximo 12 turnos.
4. Invierte las filas para devolverlas en orden cronológico.
5. Limita cada contenido a 4000 caracteres.
6. Conserva `metadata` para resolver referencias posteriores.

El historial se lee antes de insertar el mensaje actual. Así el mensaje actual no
se duplica al construir la lista que se enviará a Groq.

Después:

1. `_guardar_mensaje()` inserta el mensaje como `rol = user`.
2. `_tocar_conversacion()` actualiza `updated_at`.

La respuesta HTTP todavía no se ha enviado. Esto permite resolver la
clasificación y los handlers antes de abrir el stream visible.

## 10. Seguimientos y mensajes relacionados con el anterior

Este es el mecanismo que permite entender mensajes como:

```text
Usuario: ¿Tienes exámenes de Cálculo II?
Asistente: [muestra resultados]
Usuario: ¿Y de ese curso?
```

### 10.1. Detección de referencias implícitas

`intents._es_anforico()` busca pronombres y expresiones como:

- ella, él, eso, esa, ese;
- de ella, de él;
- dicho, anterior, mencionado;
- ese curso;
- el profesor anterior;
- “sus cursos”, “otras materias”.

Si el mensaje no contiene una referencia implícita o no hay historial, se utiliza
el texto literal.

### 10.2. Reformulación para buscar

Si hay una referencia:

1. `reformular_consulta()` toma hasta cuatro turnos recientes.
2. Incluye el texto resumido de usuario y asistente.
3. Incluye entidades verificadas guardadas en `metadata`.
4. Llama al modelo clasificador con `PROMPT_REESCRITURA`.
5. Pide sustituir “ese curso” o “ella” por la entidad concreta.
6. Devuelve una consulta apta para buscar en RAG.

El mensaje original sigue siendo el que se persiste y el que se muestra. Solo
`mensaje_rag` se usa para mejorar la recuperación.

Si la llamada de reformulación falla, se conserva el mensaje literal; no se
rompe el turno.

### 10.3. Slots contextuales

`resolver_slots_contextuales()` busca en el `metadata` del último mensaje del
asistente:

- `curso_id`;
- `profesor_id`;
- `recurso_id`;
- tipo de documento;
- año;
- docente;
- curso;
- referencias `[F#]`.

Con eso puede heredar un contexto confirmado.

Ejemplos:

- “¿Y ese curso?” hereda `curso_id`.
- “¿Tienes otros de ella?” hereda `profesor_id`.
- “¿Y el examen anterior?” hereda `recurso_id`.

Si hay varios documentos y no se puede saber cuál significa “ese”, devuelve
`recurso_ambiguo`. El backend responde una pregunta de aclaración en lugar de
adivinar.

## 11. Clasificación de intención

`intents.clasificar(mensaje_rag, historial)` usa un modelo pequeño de Groq con
temperatura 0 para elegir una etiqueta.

Las intenciones disponibles son:

- `recurso`: pide un archivo descargable.
- `duda_academica`: pregunta por teoría, ejercicios o contenido.
- `estado_academico`: pregunta por sus notas, avance o cursos.
- `navegacion_ayuda`: pregunta cómo usar la plataforma.
- `catalogo`: pregunta por facultades, carreras o catálogo.
- `general`: saludo, cultura general o conversación.
- `soporte_humano`: reporta un problema o necesita una persona.
- `quiz`: pide preguntas de práctica.
- `cronograma`: pide organización de estudio.
- `flashcards`: pide tarjetas de repaso.
- `consulta_docentes`: pregunta quién dicta una materia.
- `consulta_prerrequisitos`: pregunta qué debe aprobar antes.

### 11.1. Contexto usado por el clasificador

El clasificador recibe:

- hasta cuatro turnos previos;
- cada turno recortado a 200 caracteres;
- la consulta actual, normalmente ya reformulada.

No recibe todo el historial porque su trabajo es decidir la rama, no responder.

### 11.2. Reintentos y rescates

Ante un error 429:

- espera el tiempo sugerido por Groq, como máximo cinco segundos;
- reintenta hasta dos veces.

Si falla definitivamente, devuelve `general`.

Antes de aceptar `general`, aplica rescates por palabras clave:

- facultades/carreras/catálogo -> `catalogo`;
- ejercicios/exámenes/teoría/profesores -> `duda_academica`.

Esto evita que una salida extraña del modelo desvíe una consulta estructurada a
una respuesta genérica.

## 12. Construcción del contexto por handler

`handlers.construir_contexto()` combina el intent clasificado con los slots
contextuales y elige el handler.

Si una referencia contextual es más confiable que la etiqueta original, puede
corregir la rama:

- seguimiento de docente -> `consulta_docentes`;
- `profesor_id` con `general` -> `consulta_docentes`;
- `recurso_id` o `curso_id` con `general` -> `recurso`;
- consulta abierta de contenido con `general` -> `duda_academica`.

Cada handler devuelve un `Contexto`:

```text
system_extra  instrucciones específicas para el modelo
bloque        datos verificados que se anteponen al mensaje
adjuntos      datos que viajan a la UI y se guardan en metadata
respuesta_fija respuesta completa sin llamar al modelo
```

### 12.1. `recurso`

Función principal: `_handler_recurso()`.

1. Obtiene los cursos visibles para la facultad del estudiante.
2. Detecta curso por código o por palabras significativas del nombre.
3. Detecta tipo:
   - examen, parcial, final, plancha, solucionario -> `Examen`;
   - práctica -> `Practica`;
   - sílabo -> `Silabo`;
   - compendio, libro o apunte.
4. Consulta `recursos`.
5. Exige `url_drive` no nulo para no mostrar tarjetas inutilizables.
6. Ordena por año descendente.
7. Limita a cinco recursos.
8. Devuelve `adjuntos.recursos` y `adjuntos.curso`.

El texto del modelo solo presenta el hallazgo. Las tarjetas reales las dibuja el
frontend con los enlaces de `url_drive`.

Si no hay curso:

- si parece una búsqueda abierta de contenido, cae a RAG;
- si no, pide el nombre o código del curso.

### 12.2. `duda_academica`

Función principal: `_handler_duda_academica()`.

1. Intenta resolver curso y profesor.
2. Si hay un recurso heredado, puede recuperar exactamente sus chunks.
3. Si no, crea `SyllabusRetriever`.
4. Vectoriza la pregunta con `SyllabusEmbedder`.
5. Llama a `search_chatbot_resource_chunks`.
6. Aplica filtros opcionales de curso y profesor.
7. Usa un umbral más estricto cuando hay curso.
8. Usa más candidatos y umbral más flexible en búsquedas abiertas.
9. Limita el número de chunks por recurso.
10. Empaqueta hasta cuatro fragmentos y como máximo 6000 caracteres.
11. Etiqueta cada fuente como `[F1]`, `[F2]`, etc.
12. Guarda referencias estructuradas en `adjuntos`.

Si no hay fragmentos:

- no se inventa que el RAG encontró material;
- el modelo puede responder con conocimiento general;
- debe aclarar que la respuesta no proviene del material del curso;
- si la consulta es abierta, pide curso o tema para buscar mejor.

### 12.3. `estado_academico`

Función principal: `_handler_estado_academico()`.

1. Obtiene carrera y malla del perfil.
2. Consulta avance con `cargar_avance()`.
3. Consulta créditos de `malla_cursos`.
4. Consulta estados y notas de `progreso_cursos`.
5. Calcula promedio ponderado.
6. Busca nombres de cursos en estado `in_progress`.
7. Inyecta porcentaje, créditos, cursos aprobados, cursos totales, promedio y
   cursos actuales.

El prompt de esta rama ordena usar únicamente números reales del expediente.
Si falta onboarding, responde pidiendo completarlo y no inventa datos.

### 12.4. `catalogo`

Función principal: `_handler_catalogo()`.

1. Consulta facultades.
2. Trae carreras anidadas.
3. Construye una lista de datos registrados.
4. Ordena la respuesta a partir de ese bloque.

El modelo no debe añadir facultades o carreras que no estén en el bloque.

### 12.5. `navegacion_ayuda`

Función principal: `_handler_navegacion_ayuda()`.

No consulta la base de datos. Usa `MAPA_DE_LA_APP`, un texto fijo que describe:

- Dashboard;
- Malla;
- Curso;
- Recursos;
- Perfil;
- Onboarding.

El modelo explica dónde está una función basándose únicamente en ese mapa.

### 12.6. `consulta_docentes`

Funciones principales en `consultas.py`:

- `_handler_consulta_docentes()`;
- `_contexto_docente_identificado()`;
- `_contexto_docentes_por_facultad()`.

Para un curso:

1. Carga el catálogo global de cursos.
2. Detecta el curso.
3. Consulta `curso_profesores`.
4. Obtiene nombres desde `profesores`.
5. Devuelve los docentes verificados.

Para un docente:

1. Resuelve el nombre con `_resolver_profesor()`.
2. Consulta su registro.
3. Consulta todos sus cursos mediante `curso_profesores`.

Para un listado por facultad:

1. Resuelve la facultad.
2. Obtiene carreras, mallas y cursos.
3. Obtiene relaciones curso-profesor.
4. Agrupa por profesor.
5. Devuelve una vista previa de hasta 25 docentes.

Cuando corresponde, la consulta relacional se combina con un fallback RAG para
aportar contenido académico adicional sin presentar el RAG como asignación
oficial.

### 12.7. `consulta_prerrequisitos`

Función principal: `_handler_consulta_prerrequisitos()` en `consultas.py`.

1. Obtiene la malla del estudiante.
2. Carga `malla_cursos`.
3. Detecta el curso solicitado.
4. Carga `malla_curso_prerrequisitos`.
5. Construye el mapa con `build_prereq_map_from_malla()`.
6. Consulta el progreso para saber qué prerrequisitos están completados.
7. Usa `direct_prereq_info()`.
8. Devuelve la lista marcando pendientes.

Si el curso no tiene prerrequisitos, lo dice explícitamente. Si falta onboarding,
no inventa requisitos.

### 12.8. `quiz`, `cronograma` y `flashcards`

Están en `backend/app/chatbot/skills.py`.

Estas funciones no consultan datos del estudiante. Devuelven instrucciones para
que el modelo:

- genere un quiz de 3 a 5 preguntas con soluciones desplegables;
- genere un cronograma por días o semanas;
- genere entre 5 y 10 tarjetas con frente y reverso.

Si faltan datos importantes, el modelo debe pedir precisión sin inventar fechas,
exámenes o material real.

### 12.9. `soporte_humano`

Función: `_handler_soporte_humano()`.

Es la única rama con `respuesta_fija`.

- No llama a Groq para redactar.
- Usa `SOPORTE_CONTACTO` si existe.
- Si no existe, indica usar la sección de soporte.
- Pide pantalla y acción realizada para facilitar el diagnóstico.

### 12.10. `general`

Función: `_handler_general()`.

No añade datos de Supabase ni RAG. El modelo responde con el prompt base y el
historial permitido.

## 13. Contexto académico común del usuario

Después del handler, el router llama a `cargar_contexto_usuario()`.

Esta función intenta cargar:

1. `perfiles`:
   - nombre;
   - carrera;
   - malla;
   - ciclo actual.
2. `mallas` si debe resolver una malla vigente desde la carrera.
3. `malla_cursos`:
   - cursos;
   - créditos;
   - ciclo.
4. `progreso_cursos`:
   - estado;
   - nota.
5. `malla_curso_prerrequisitos`.
6. Cálculos de avance, créditos, cursos aprobados y promedio.
7. Cursos activos.
8. Diagnóstico académico y recomendación.

Si una consulta falla, el contexto se degrada con los datos que sí se pudieron
obtener. El chatbot no debe convertir una consulta secundaria fallida en una
excepción total.

Cuando hay contexto disponible, el router lo antepone a `system_extra`:

```text
CONTEXTO DEL USUARIO ACTUAL
- Nombre
- Avance
- Créditos
- Cursos activos
- Recomendación académica
```

El prompt base ordena no inventar ni extender estos datos.

## 14. Construcción final del prompt

El router crea la lista final `mensajes` así:

1. Copia los últimos turnos del historial con roles `user` y `assistant`.
2. Construye el turno actual.
3. Si el handler devolvió `bloque`, lo antepone al mensaje.
4. Añade el mensaje original o reformulado según corresponda.

Conceptualmente:

```text
[
  {"role": "user", "content": "..."},
  {"role": "assistant", "content": "..."},
  {"role": "user", "content": "DATOS VERIFICADOS...\n\nmensaje actual"}
]
```

Luego `_responder()` combina:

1. `SYSTEM_PROMPT` de `backend/app/chatbot/prompts/system.md`;
2. `system_extra` del handler y del contexto del usuario;
3. la lista de mensajes.

El prompt base exige español, respuestas breves, formato Markdown, protección
contra datos inventados y no exposición de información de otros estudiantes.

## 15. Generación y streaming SSE

### 15.1. Proveedor

`backend/app/core/llm.py`:

1. `get_groq()` lee `GROQ_API_KEY`.
2. Crea un cliente OpenAI-compatible con base URL de Groq.
3. Lo guarda en caché para reutilizarlo.
4. `chatear()` llama a `client.chat.completions.create()`.
5. El chatbot usa `stream=True`.
6. El límite de salida es `MAX_TOKENS_RESPUESTA = 1024`.

### 15.2. No bloquear FastAPI

El SDK es síncrono, pero el endpoint es asíncrono. Por eso
`_chunks_sin_bloquear()`:

1. Crea una `asyncio.Queue`.
2. Ejecuta el consumo del SDK en un executor.
3. El hilo de trabajo coloca cada delta en la cola.
4. El generador asíncrono lee la cola.
5. El endpoint puede enviar cada fragmento sin bloquear el event loop.

### 15.3. Eventos enviados

El primer evento siempre es la cabecera:

```text
data: {"conversacion_id": 123, "intent": "duda_academica", "adjuntos": {...}}
```

Después llegan fragmentos:

```text
data: {"delta": "texto parcial"}
```

Al terminar:

```text
data: {"done": true, "respuesta": "respuesta completa"}
```

Si ocurre un error:

```text
data: {"error": "mensaje accionable"}
```

La cabecera llega antes que el texto para que el frontend sepa a qué hilo
pertenece la respuesta y pueda preparar tarjetas de recursos.

## 16. Cómo el frontend pinta la respuesta

`chatbot-service.ts` lee bytes con `response.body.getReader()`.

1. `TextDecoder` convierte bytes a texto.
2. Se acumula el contenido en un buffer.
3. Se separan eventos por doble salto de línea.
4. Se busca la línea `data: `.
5. Se parsea JSON.
6. Si contiene `conversacion_id`, llama `onCabecera`.
7. Si contiene `delta`, llama `onDelta`.
8. Si contiene `error`, llama `onError`.
9. El evento `done` no necesita tratamiento adicional.

`ChatBubble` responde:

- cabecera:
  - actualiza `conversacionIdRef`;
  - guarda el id en `localStorage`;
  - asigna intent y adjuntos al mensaje asistente.
- delta:
  - concatena el fragmento al contenido existente.
- error:
  - marca la burbuja como error;
  - guarda el texto original para reintentar.
- final:
  - marca `enCurso = false`;
  - habilita de nuevo el input.

El resultado se ve como escritura progresiva, no como una respuesta que aparece
de golpe.

## 17. Persistencia de la respuesta

El backend acumula todos los deltas en `partes`.

1. Une los fragmentos.
2. Hace `strip()`.
3. Si la respuesta está vacía, emite error.
4. Si tiene contenido, `_persistir()` inserta:
   - `conversacion_id`;
   - `perfil_id`;
   - `rol = assistant`;
   - texto completo;
   - `intent`;
   - `metadata = contexto.adjuntos`.
5. Actualiza `updated_at`.
6. Envía el evento `done`.

No guarda cada token. Solo guarda la respuesta completa. Así un stream
interrumpido no queda almacenado como respuesta válida incompleta.

Un fallo al persistir la respuesta se registra en logs, pero no se vuelve a
romper un turno que ya se mostró al usuario.

## 18. Cómo funciona exactamente el siguiente mensaje

Cuando el usuario vuelve a escribir:

1. `conversacionIdRef.current` ya contiene el id recibido en la primera
   cabecera SSE.
2. El frontend envía el mismo `conversacion_id`.
3. El backend valida que el hilo siga perteneciendo al usuario.
4. Lee los últimos 12 turnos guardados.
5. El nuevo mensaje todavía no está en el historial leído.
6. Guarda el nuevo mensaje de usuario.
7. Detecta si depende de un turno anterior.
8. Reformula la consulta si contiene anáforas.
9. Recupera slots verificados desde `metadata`.
10. Clasifica el nuevo intent usando también hasta cuatro turnos recientes.
11. El handler puede reutilizar curso, docente o recurso anterior.
12. Se vuelve a cargar el contexto académico actual.
13. Se arma un prompt nuevo con historial reciente y contexto nuevo.
14. Groq genera la nueva respuesta.
15. La respuesta se transmite y se guarda como otro mensaje.

La conversación no se mantiene únicamente en memoria del navegador: la base de
datos es la fuente que permite reconstruirla después de recargar la página.

## 19. Modelo de datos del historial

### `chat_conversaciones`

- `id`: identificador del hilo.
- `perfil_id`: propietario.
- `titulo`: resumen derivado del primer mensaje.
- `created_at`: fecha de creación.
- `updated_at`: última actividad.

### `chat_mensajes`

- `id`: identificador del turno.
- `conversacion_id`: hilo al que pertenece.
- `perfil_id`: propietario desnormalizado para RLS eficiente.
- `rol`: `user` o `assistant`.
- `contenido`: texto completo.
- `intent`: intención de la respuesta del asistente.
- `metadata`: adjuntos y entidades verificadas.
- `created_at`: fecha del turno.

`metadata` es importante para dos cosas:

1. reconstruir tarjetas de recursos después de recargar;
2. resolver mensajes posteriores como “ese curso”, “ella” o “el examen
   anterior”.

## 20. Seguridad y privacidad

La migración SQL habilita RLS en ambas tablas.

Un usuario solo puede:

- seleccionar sus conversaciones;
- insertar sus conversaciones;
- actualizar sus conversaciones;
- eliminar sus conversaciones;
- seleccionar sus mensajes;
- insertar sus mensajes;
- eliminar sus mensajes.

No existe actualización de mensajes ya escritos. Esto preserva el registro de
qué intent respondió cada turno.

El backend además verifica explícitamente `id + perfil_id` antes de trabajar con
un hilo.

El prompt impide:

- revelar notas de otro estudiante;
- inventar cursos, horarios, contactos o requisitos;
- prometer cambios administrativos;
- resolver por cuenta propia casos sensibles;
- hacerse pasar por personal de UniVia.

## 21. Retención y limpieza

`limpiar_conversaciones_chat(dias = 30)` elimina conversaciones cuyo
`updated_at` es anterior al período indicado.

Gracias a `ON DELETE CASCADE`, sus mensajes se eliminan automáticamente.

La función está preparada para programarse con `pg_cron`, pero la migración no
lo activa por sí sola. Mientras no se programe, puede ejecutarse manualmente.

## 22. Errores y degradaciones importantes

### Antes del stream

- sin Groq: 503;
- mensaje vacío: 422;
- token inválido: 401;
- conversación inexistente o ajena: 404;
- error preparando persistencia: 500.

### Durante el stream

- proveedor saturado o 429: mensaje de reintento;
- respuesta vacía: evento de error;
- excepción del modelo: evento de error;
- pérdida de red del frontend: error local;
- cancelación explícita: se aborta sin mostrarla como fallo real.

### Fallos de datos

Los handlers normalmente no lanzan al usuario:

- devuelven instrucciones para reconocer que no hay datos;
- sugieren reintentar;
- piden completar onboarding;
- o degradan a una respuesta general/RAG.

La intención es que una consulta secundaria fallida no destruya el turno entero.

## 23. Diferencia entre `components/chat/` y `components/chatbot/`

Actualmente `frontend/app/layout.tsx` importa:

```text
@/components/chat/chat-bubble
```

Por tanto, el flujo activo es el módulo `frontend/components/chat/`.

También existe `frontend/components/chatbot/`, que contiene una versión anterior
del panel, burbuja y mensaje. Esos componentes comparten tipos y servicio, pero
no son los que monta el layout actual. Para explicar el comportamiento vigente,
debe seguirse `components/chat/`; `components/chatbot/` sirve como referencia de
la implementación anterior y puede confundir si se mezclan ambas rutas.

## 24. Guion corto para explicárselo a otra persona

Puedes explicarlo así:

> El chat vive en el layout raíz, por eso sobrevive al cambio de páginas. La
> burbuja guarda el estado visual y el id de conversación. Al enviar un mensaje,
> el frontend manda el token y el id del hilo al endpoint
> `/api/chatbot/mensajes`. El backend valida al usuario, crea o recupera el
> hilo, guarda el mensaje, lee los últimos turnos y decide qué tipo de consulta
> es. Según la intención, consulta recursos, RAG, docentes, prerrequisitos,
> progreso académico o un mapa fijo de la plataforma. Después arma un prompt con
> las reglas del sistema y los datos verificados y llama a Groq en streaming.
> Cada fragmento vuelve por SSE y se concatena en la burbuja. Al terminar, la
> respuesta completa se guarda en la base de datos junto con la intención y los
> adjuntos. Si el siguiente mensaje dice “ese curso”, “ella” o “el examen
> anterior”, el backend lee el metadata del turno anterior, resuelve la
> referencia y busca usando la entidad correcta.

## 25. Rutas principales, en orden

### Abrir y reconstruir

```text
frontend/app/layout.tsx
  -> frontend/components/chat/chat-bubble.tsx
  -> frontend/lib/api-service.ts: obtenerConversacionChat()
  -> GET /api/chatbot/conversaciones/{id}
  -> backend/app/routers/chatbot.py: obtener_conversacion()
  -> _verificar_propiedad()
  -> chat_mensajes
  -> mapearMensajeGuardado()
```

### Enviar un mensaje

```text
ChatPanel.onSend
  -> ChatBubble.manejarEnvio()
  -> ChatBubble.enviar()
  -> frontend/lib/chatbot-service.ts: enviarMensajeChat()
  -> POST /api/chatbot/mensajes
  -> auth_utils.get_current_user()
  -> router.enviar_mensaje()
  -> _crear_conversacion() o _verificar_propiedad()
  -> _historial()
  -> _guardar_mensaje(user)
  -> intents.reformular_consulta()
  -> intents.resolver_slots_contextuales()
  -> intents.clasificar()
  -> handlers.construir_contexto()
  -> cargar_contexto_usuario()
  -> _chunks_sin_bloquear()
  -> core.llm.chatear()
  -> eventos SSE
  -> callbacks del frontend
  -> _persistir(assistant)
```

### Seguimiento contextual

```text
mensaje actual
  -> intents._es_anforico()
  -> resolver_slots_contextuales()
  -> metadata del mensaje assistant anterior
  -> curso_id / profesor_id / recurso_id
  -> handler específico
  -> consulta correcta sobre la entidad anterior
```

