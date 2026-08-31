# Plan de trabajo: Chatbot UniVia

## Alcance (v1)

1. Recuperar recursos del banco (`recursos`) y devolverlos como tarjetas descargables.
2. Responder dudas académicas frecuentes usando el RAG existente (`resource_chunks`).
3. Conocimiento general (cultura general / base de conocimiento del LLM).
4. Explicar al usuario cómo moverse por el sistema (guía de navegación/UX).
5. Consultar el estado académico personal del usuario (progreso, prerrequisitos, cursos pendientes).
6. Derivar a soporte humano cuando el bot no puede resolver algo.

Fuera de alcance v1: recomendación de ruta/cursos, generación/lanzamiento de evaluaciones desde el chat.

## Stack

- **Generación:** Groq (free tier, Llama 3.3 70B u otro disponible) vía su SDK OpenAI-compatible.
- **Backend:** Python/FastAPI, nuevo router `app/routers/chatbot.py`, mismo patrón de auth (`get_current_user`) y Supabase-con-token (RLS) que el resto de la API.
- **RAG:** reusa `app/rag/retriever.py` (`SyllabusRetriever`) tal cual, sin tocarlo.
- **Streaming:** SSE con `StreamingResponse`, mismo patrón que `evaluaciones.py:1233` (`/evaluaciones/generar-stream`).
- **Frontend:** Next.js/TypeScript, componente flotante nuevo en `frontend/components/chatbot/`, consumiendo el stream vía `fetch` + `ReadableStream` (no hay `EventSource` en el proyecto todavía porque necesita headers de auth, que `EventSource` no soporta).

## Diseño de "intents" (cómo el bot decide qué hacer)

En vez de un solo prompt gigante, el backend clasifica la intención del mensaje del usuario antes de responder, para dirigir la consulta a la fuente correcta:

| Intent | Fuente de datos | Ejemplo |
|---|---|---|
| `recurso` | `GET /api/recursos` (reusa filtros existentes: `curso_id`, `search`, `tipo`) | "pásame el sílabo de Cálculo 2" |
| `duda_academica` | `SyllabusRetriever.buscar_contexto` (RAG sobre `resource_chunks`) | "¿qué es la regla de la cadena?" |
| `estado_academico` | Endpoints ya existentes de `malla.py`/`dashboard.py` (progreso, prerrequisitos) | "¿qué cursos me faltan para llevar Física II?" |
| `navegacion_ayuda` | Prompt estático con mapa de la UI (no necesita BD) | "¿dónde veo mis notas?" |
| `general` | Conocimiento del LLM, sin contexto adicional | "¿quién fue Turing?" |
| `soporte_humano` | Respuesta fija con canal de contacto | "esto no me lo resuelve nadie", fallos técnicos, quejas |

La clasificación puede ser un primer llamado ligero a Groq (function calling / respuesta estructurada) o heurísticas simples + fallback a LLM. Se decide en el Paso 3.

## Pasos

### Paso 0 — Cuenta y credenciales
- [ ] Crear cuenta gratuita en Groq, generar API key.
- [ ] Agregar `GROQ_API_KEY` y `GROQ_MODEL` a `backend/.env` y `backend/.env.example`.
- [ ] Añadir `groq` (o usar el cliente `openai` apuntando al endpoint de Groq, que es compatible) a `backend/requirements.txt`.

### Paso 1 — Esquema de conversación en BD
- [ ] Migración SQL nueva en `base_de_datos/esquema/` para tablas `chat_conversaciones` y `chat_mensajes` (id, perfil_id, rol, contenido, intent, created_at), con RLS: un usuario solo ve sus propias conversaciones.
- [ ] Decidir retención: ¿se persiste el historial completo o solo se mantiene en memoria de sesión del frontend? (recomendado: persistir, para que el usuario recupere el hilo al recargar).

### Paso 2 — Router base del chatbot (backend)
- [ ] Crear `app/routers/chatbot.py` con:
  - `POST /api/chatbot/mensajes` — recibe `{conversacion_id?, mensaje}`, devuelve stream SSE.
  - `GET /api/chatbot/conversaciones/{id}` — recupera historial.
  - `POST /api/chatbot/conversaciones` — crea conversación nueva.
- [ ] Cliente Groq mínimo en `app/core/llm.py` (donde ya viven los otros clientes de IA), agregando `get_groq_client()`.
- [ ] Registrar el router en `app/main.py`.

### Paso 3 — Clasificador de intención
- [ ] Función `clasificar_intent(mensaje: str, historial: list) -> Intent` en `app/rag/` o un nuevo `app/chatbot/`.
- [ ] Empezar simple (prompt corto a Groq pidiendo una sola palabra de las 6 categorías) y ajustar con casos reales de prueba.

### Paso 4 — Handlers por intent
- [x] `duda_academica`: `SyllabusRetriever.buscar_contexto(pregunta, curso_id?)`, inyectar los fragmentos como contexto al prompt de Groq.
- [x] `recurso`: hecho (`app/chatbot/handlers.py:_handler_recurso`).
- [x] `estado_academico`: hecho (`app/chatbot/handlers.py:_handler_estado_academico`).
- [x] `navegacion_ayuda`: hecho (`app/chatbot/handlers.py:_handler_navegacion_ayuda`, mapa fijo `MAPA_DE_LA_APP`).
- [x] `general`: hecho (`app/chatbot/handlers.py:_handler_general`, sin contexto extra).
- [x] `soporte_humano`: hecho (`app/chatbot/handlers.py:_handler_soporte_humano`, respuesta fija sin LLM; canal vía `SOPORTE_CONTACTO`).

#### Arreglo del RAG (hecho durante el Paso 4)

El handler no recuperaba nada por un bug anterior al chatbot: **el corpus se ingería con Gemini y las consultas se vectorizaban con OpenAI**. Vectores de espacios distintos no son comparables, así que las similitudes no significaban nada — y encima esa cuenta de OpenAI no tenía crédito (`insufficient_quota`), de modo que la búsqueda devolvía vacío siempre. Nada de esto fallaba de forma visible.

Diagnóstico del corpus (medido, no supuesto): de los **1.137 chunks**, **300 (26%)** tenían vectores incompatibles con Gemini. Se detectan por la norma del vector — OpenAI los devuelve normalizados (‖v‖≈1) y Gemini truncado a 1536 no — y se confirmó re-embebiendo chunks y comparando por coseno.

Qué se cambió:
- `app/rag/embedder.py`: `_llamar_api` acepta `task_type`, y se agrega `vectorizar_consulta()` que usa `RETRIEVAL_QUERY` (los documentos siguen con `RETRIEVAL_DOCUMENT`; la asimetría es lo que recomienda el modelo).
- `app/rag/retriever.py`: deja de crear su propio cliente de OpenAI y delega en `SyllabusEmbedder`. **Ahora hay un solo lugar que elige proveedor**, que era la raíz del problema.
- Se re-vectorizó el corpus completo con `scripts_manuales/revectorizar_chunks.py --ejecutar`.

Efecto lateral bueno: `evaluaciones.py` usa el mismo retriever, así que su RAG (que estaba igual de roto) también quedó funcionando.

### Paso 5 — Prompt del sistema y guardarraíles
- [x] Redactar system prompt único que defina identidad, tono, límites (no inventar notas/cursos, no dar información de otros alumnos, redirigir a soporte humano ante ambigüedad sensible). Ver `SYSTEM_PROMPT` en `app/routers/chatbot.py`.
- [x] Sanitizar/truncar el historial que se manda a Groq (ventana de contexto limitada del free tier). `MAX_TURNOS_CONTEXTO` recorta por cantidad de turnos y `MAX_CARACTERES_POR_TURNO_HISTORIAL` acota cada mensaje individual, en `app/routers/chatbot.py:_historial`.

### Paso 6 — Frontend: círculo flotante y panel de chat
- [x] `components/chatbot/chat-bubble.tsx` — el círculo flotante (posición fija, badge de "no leído", animación de apertura). También hace de composition root: guarda mensajes/`conversacion_id`/estado de envío y habla con `lib/chatbot-service.ts`.
- [x] `components/chatbot/chat-panel.tsx` — panel del chat (mensajes, input, estado de "escribiendo…"). Puramente presentacional, recibe todo por props.
- [x] `components/chatbot/message-bubble.tsx` — burbuja de mensaje, con variante especial para tarjetas de recurso descargable (`adjuntos.recursos` del intent `recurso`).
- [x] `lib/chatbot-service.ts` — `enviarMensajeChat()` hace `fetch` al stream SSE (con auth header, `AbortController`, parseo de eventos), siguiendo el estilo de `api-service.ts` (no lo reutiliza directamente: necesita leer el body como stream, cosa que `fetchWithAuth` no soporta).
- [x] Montado en `app/layout.tsx` (no en `DashboardLayout`): cada página instancia su propio `DashboardLayout`, así que montar ahí perdería el hilo de la conversación en cada cambio de ruta. `ChatBubble` decide sola cuándo mostrarse (sesión activa + onboarding completo).
- [ ] Pasada de diseño con las skills `ui-ux-pro-max` / `frontend-design`: **pendiente**, `ui-ux-pro-max` existe en `.claude/skills/` del repo pero no apareció disponible en esta sesión (posible problema de registro/scope) — hay que invocarla explícitamente en una sesión donde sí figure antes de dar el UI por cerrado.

Verificación hecha en esta sesión (sin cuenta de prueba a mano): `npx tsc --noEmit` no agrega errores nuevos (los que ya había son de otros módulos, ninguno toca `chatbot`); `npm run dev` compila y sirve `/` y `/dashboard` con 200 y sin errores de servidor ni de hidratación (el spinner de "Cargando tu sesión…" aparece como se espera sin sesión, y `ChatBubble` no se renderiza — comportamiento correcto). No se pudo tomar un screenshot real del panel abierto: el entorno no tiene `chromium-cli`, Playwright ni Xvfb instalados, y no había credenciales de prueba en `.env.example`/fixtures para loguear. Falta una verificación visual manual con sesión real antes de cerrar el paso del todo.

Revisión manual de calidad (sin la skill de diseño, que sigue sin aparecer disponible): se agregó cierre del panel con Escape y con clic fuera (`chat-bubble.tsx`, antes solo cerraba con el botón X) y el textarea del input ahora crece con el contenido en vez de quedarse fijo a una línea (`chat-panel.tsx`). Ambos eran gaps reales de UX que una pasada de diseño habría señalado.

### Paso 7 — Manejo de estados y errores (frontend)
- [x] Estado offline/timeout: `useOnline()` corta el envío antes de intentar la red y deshabilita el input con un aviso inline (`chat-panel.tsx`); `lib/chatbot-service.ts` agrega un timeout de 20s solo para la conexión inicial (clasificar + arrancar el handler), no para la respuesta completa, que puede demorar por el LLM.
- [x] Reintento manual si el stream se corta: todo mensaje de error guarda `textoOrigen` (el turno que lo originó) y `message-bubble.tsx` pinta un botón "Reintentar" que reenvía ese mismo texto. Cubre timeout, sin conexión, y cualquier error que devuelva el backend a mitad de stream.
- [x] Persistencia local del `conversacion_id` activo (localStorage, por usuario) para retomar el hilo al recargar. Al montar, `ChatBubble` intenta reconstruir el hilo guardado vía `GET /chatbot/conversaciones/{id}` (`apiService.obtenerConversacionChat`); si ya no existe (borrado, o expiró por la retención de 30 días) se descarta en silencio y se empieza un hilo nuevo.

### Paso 8 — Pruebas
- [ ] Backend: tests del clasificador de intent con casos representativos de cada categoría.
- [ ] Backend: test de que `estado_academico` y `recurso` respetan el alcance por facultad/usuario (no filtran datos de otros).
- [ ] Frontend: test de render del bubble/panel, y de que el stream se pinta incrementalmente.
- [ ] Prueba manual end-to-end: abrir el círculo, hacer una pregunta de cada categoría, verificar respuesta y, en el caso de recursos, que el botón de descarga funcione.

### Paso 9 — Cierre
- [ ] Revisar límites del free tier de Groq y qué pasa si se agotan (fallback: mensaje de "vuelve a intentar en unos minutos", no un error crudo).
  - **Medido en el Paso 3:** el límite que muerde es **8.000 tokens por minuto, por modelo**. Cada turno gasta dos llamadas (clasificar + responder). El prompt del clasificador se dejó en ~250 tokens por esto; con la versión inicial de ~700 el sistema aguantaba solo ~11 mensajes por minuto en toda la plataforma.
  - Clasificador y respuesta usan modelos distintos (`gpt-oss-20b` y `gpt-oss-120b`), así que cada uno tiene su propia cuota y no compiten entre sí.
  - `intents.clasificar` ya reintenta ante 429 respetando el retraso que sugiere Groq; falta el equivalente en la generación de la respuesta.
- [ ] Actualizar `README.md`/`GUIA_EJECUCION.md` con la env var nueva y cómo levantar el chatbot en local.
- [ ] `/code-review` sobre el diff antes de mergear.

## Preguntas abiertas a resolver antes de picar código
- ¿Cuál es el canal real de "soporte humano" (correo, WhatsApp, ticket)?
- ¿El chat debe estar disponible antes de terminar el onboarding, o solo post-onboarding (ya que `estado_academico` depende de tener carrera/perfil resuelto)?
- ¿Se persiste el historial de chat indefinidamente o con expiración (ej. 30 días)?
