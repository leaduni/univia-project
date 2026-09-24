# Auditoría y Rediseño de Experiencia BYOK (API Keys)

**Fecha:** 2026-09-19 · **Estado:** ✅ Ejecutado (Paso 4 aplicado)

Documento de auditoría UX + privacidad del flujo "Bring Your Own Key" (BYOK) de
UniVia y registro de los cambios aplicados. Alcance: `frontend/lib/byok.ts`,
`frontend/components/chatbot/{byok-modal,chat-panel,chat-bubble}.tsx`,
`frontend/lib/chatbot-service.ts`, `backend/app/core/llm.py`,
`backend/app/routers/chatbot.py`.

---

## 1. Diagnóstico Actual de UX y Seguridad

### UX (estado previo)

- **El acceso BYOK era críptico:** solo un botón circular 7×7 con el icono
  `KeyRound` en la cabecera del chat (`chat-panel.tsx`), sin texto. Un
  estudiante no técnico no reconocía una "llave" como configuración de cuota.
- **El estado sí se comunicaba:** badge "Cuota compartida UniVia" (gris) vs
  "Cuota propia (Gemini)" (verde), pero **no era clickeable**.
- **El modal ya explicaba el motivo** (horas pico) e incluía una guía de 4
  pasos colapsada por defecto, pero **no mencionaba las garantías técnicas
  reales**: cifrado en tránsito, no persistencia y no logging server-side.

### Postura de seguridad (auditoría del código)

| Verificación | Hallazgo |
|---|---|
| Tránsito | ✅ Solo por header HTTP `X-User-LLM-Key` (`chatbot.py`, `chatbot-service.ts:85`, `evaluacion-ia.tsx:258`). Nunca en URL ni body (salvo `/validate-key`, ver ⚠️). |
| Persistencia server-side | ✅ La clave vive solo en la variable del request; nunca se escribe en BD. |
| Logging del valor | ✅ `MultiKeyPool` loguea solo el **nombre de la variable de entorno** y el **índice** de la clave del servidor, nunca valores. `chatear_gemini_con_clave`/`generar_gemini_con_clave` no tenían loggers. |
| ⚠️ Riesgo 1 (corregido) | Las excepciones del SDK de Google pueden incrustar la URL con `?key=AIza...` en su mensaje/traceback; se logueaba en `chatbot.py` (warning de fallback BYOK y traceback del stream). |
| ⚠️ Riesgo 2 (corregido) | `/chatbot/validate-key` recibía la clave por **body JSON** en vez del header, rompiendo la política "solo header". |
| ⚠️ Riesgo 3 (corregido) | `RuntimeError(...) from e` en `llm.py` encadenaba la excepción original del SDK, cuyo texto puede contener la clave. |
| CORS | ✅ `allow_headers=["*"]` en `main.py` admite el header personalizado. |

---

## 2. Nueva Ruta UI ("Camino Feliz") — aplicada

### Ubicación

1. **Píldora con texto en la cabecera del chat** (reemplaza al botón de solo
   icono): "Mi clave IA" cuando no hay clave; "Clave activa" en verde cuando
   hay BYOK.
2. **Badge de cuota clickeable**: "Cuota compartida UniVia" / "Tu clave
   personal" (con punto verde) abre el modal al hacer clic.

### Copy del modal (aplicado)

**Título:** "Trae tu propia clave de IA"

**Para qué sirve:**
> Cuando muchos estudiantes usan UniVia a la vez, la cuota compartida se
> satura. Con tu propia clave gratuita de Google AI Studio, el asistente te
> responde al instante, sin fila.

**Caja de garantía (borde esmeralda, icono `ShieldCheck`) — "Tu privacidad, garantizada":**
- Tu clave se guarda **solo en tu navegador** (almacenamiento local de este
  dispositivo). Nunca toca nuestra base de datos.
- Viaja **encriptada** por HTTPS en una cabecera exclusiva; el servidor la usa
  solo durante ese mensaje, **no la guarda ni la registra en ningún log** y la
  descarta al instante.
- Puedes borrarla cuando quieras con el botón de basura.

**Guía en 2 pasos** (desplegada por defecto si no hay clave guardada):
1. Entra a [aistudio.google.com/apikey](https://aistudio.google.com/apikey) con
   tu cuenta de Google y pulsa **"Create API key"**.
2. Copia la clave (empieza por `AIza…`), pégala arriba y dale a
   **"Guardar y probar"**.

---

## 3. Matriz de Blindaje Técnico — estado final

| Capa | Medida | Estado |
|---|---|---|
| Frontend | `formatoGeminiValido`: regex `^AIza[0-9A-Za-z_\-]{20,}$` antes de guardar | ✅ Ya existía |
| Frontend | `localStorage` con `try/catch` (modo privado no rompe BYOK) | ✅ Ya existía |
| Red | Clave solo por header `X-User-LLM-Key` en **todas** las rutas (`/mensajes`, `/validate-key`, evaluaciones) | ✅ Aplicado |
| Backend | `llm.py._redactar_claves()` redacta `key=...` de cualquier mensaje de excepción antes de loguear | ✅ Aplicado |
| Backend | `RuntimeError(...) from None` en los wrappers BYOK (sin encadenar la excepción cruda del SDK) | ✅ Aplicado |
| Backend | Traceback del stream sanitizado antes de `logger.error` | ✅ Aplicado |
| Backend | Warning de fallback BYOK sanitizado | ✅ Aplicado |
| CORS | Header permitido (`allow_headers=["*"]`) | ✅ Verificado |

---

## 4. Registro de ejecución (archivo por archivo)

### `frontend/components/chatbot/chat-panel.tsx`
- Badge de cuota convertido de `<span>` a `<button onClick={onAbrirByok}>`,
  con punto verde y texto "Tu clave personal" en modo BYOK.
- Botón de solo icono reemplazado por píldora `KeyRound + texto`
  ("Mi clave IA" / "Clave activa", esta última en verde esmeralda).

### `frontend/components/chatbot/byok-modal.tsx`
- Nuevo bloque de explicación + caja "Tu privacidad, garantizada" con
  `ShieldCheck`.
- Guía reducida a 2 pasos, abierta por defecto cuando no hay clave guardada.

### `frontend/lib/chatbot-service.ts`
- `validateKey` ya no envía `{ clave }` por body; envía `X-User-LLM-Key` en el
  header y elimina el `Content-Type: application/json` innecesario.

### `backend/app/routers/chatbot.py`
- `/chatbot/validate-key` lee la clave del header `X-User-LLM-Key`
  (eliminado el modelo pydantic `ValidarClave`).
- Importado `_redactar_claves`; aplicado al warning de fallback BYOK y al
  traceback del stream.

### `backend/app/core/llm.py`
- Nuevo helper `_redactar_claves` (regex `key=[^&\s"']+` → `key=***`).
- `chatear_gemini_con_clave` y `generar_gemini_con_clave`: `from e` →
  `from None` para no filtrar la excepción del SDK.

### Pendiente sugerido (fuera de alcance)
- Entrada "Privacidad y clave de IA" en el menú de perfil (fase 2).
- Nota de despliegue: verificar que el proxy inverso de producción no registre
  cabeceras completas en sus access logs.
