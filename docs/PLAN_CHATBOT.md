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
- [ ] `recurso`: parsear qué curso/tipo de archivo pide, llamar a la lógica de `recursos.py` (reusar `_alcance_de_facultad` + filtros), devolver tarjetas `{titulo, tipo, url_drive, curso}` que el frontend renderiza como botón de descarga.
- [ ] `duda_academica`: `SyllabusRetriever.buscar_contexto(pregunta, curso_id?)`, inyectar los fragmentos como contexto al prompt de Groq, citar la fuente si es posible.
- [ ] `estado_academico`: reusar los endpoints/queries de `malla.py` y `dashboard.py` (progreso, prerrequisitos faltantes) para el `user.id` autenticado.
- [ ] `navegacion_ayuda`: prompt del sistema con un mapa fijo de secciones de la app (dashboard, malla, recursos, perfil) — no requiere BD.
- [ ] `general`: llamada directa a Groq sin contexto adicional, con system prompt que fije el tono "asistente de UniVia".
- [ ] `soporte_humano`: respuesta fija (no LLM) con el canal de contacto real (definir cuál: correo, WhatsApp, formulario).

### Paso 5 — Prompt del sistema y guardarraíles
- [ ] Redactar system prompt único que defina identidad, tono, límites (no inventar notas/cursos, no dar información de otros alumnos, redirigir a soporte humano ante ambigüedad sensible).
- [ ] Sanitizar/truncar el historial que se manda a Groq (ventana de contexto limitada del free tier).

### Paso 6 — Frontend: círculo flotante y panel de chat
- [ ] `components/chatbot/chat-bubble.tsx` — el círculo flotante (posición fija, badge de "no leído", animación de apertura).
- [ ] `components/chatbot/chat-panel.tsx` — panel del chat (mensajes, input, estado de "escribiendo…").
- [ ] `components/chatbot/message-bubble.tsx` — burbuja de mensaje, con variante especial para tarjetas de recurso descargable.
- [ ] `lib/chatbot-service.ts` — función que hace `fetch` al stream SSE (con auth header, `AbortController`, parseo de eventos), siguiendo el estilo de `api-service.ts`.
- [ ] Montar el círculo en `app/layout.tsx` (o en el layout del dashboard) para que esté disponible en toda la app autenticada.
- [ ] Pasada de diseño con las skills `ui-ux-pro-max` / `frontend-design` antes de dar por cerrado el UI.

### Paso 7 — Manejo de estados y errores (frontend)
- [ ] Estado offline/timeout (reusar `use-online.ts` si aplica).
- [ ] Reintento manual si el stream se corta.
- [ ] Persistencia local del `conversacion_id` activo (localStorage) para retomar el hilo al recargar.

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
