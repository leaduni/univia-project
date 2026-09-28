# Mascota Luni — Componente `LuniMascot`

Guía del componente reutilizable que da cara al asistente de Venus.

- **Implementación:** [`frontend/components/ui/LuniMascot.tsx`](../../frontend/components/ui/LuniMascot.tsx)
- **Assets:** [`frontend/public/`](../../frontend/public) (raíz del sitio: `/venus1.png`, `/curioso.png`, …)
- **Animaciones:** `@keyframes luni-*` y tokens `--animate-luni-*` en [`globals.css`](../../frontend/app/globals.css)
- **Tokens de color:** [`design-tokens.md`](./design-tokens.md) — la Regla de Oro sigue vigente
- **Patrones de estado vacío:** [`patrones-compartidos.md`](./patrones-compartidos.md) §2

---

## 1. Variantes

Cada variante es un **estado narrativo**, no un adorno. Elijas la que elijas, se
corresponde con un momento real del producto.

| Variante | Asset | Dimensiones | Animación base | Dónde se usa |
|---|---|---|---|---|
| `float` | `/venus1.png` | 576×941 | flotación | FAB del chat (cerrado) |
| `idle` | `/venus2.png` | 466×941 | respiración | Avatar de un mensaje del asistente |
| `wave` | `/venus3.png` | 510×941 | respiración | Cabecera del onboarding · primer contacto del chat |
| `thinking` | `/curioso.png` | 350×524 | respiración | Streaming de la respuesta · carga del onboarding |
| `success` | `/inspirado.png` | 429×532 | respiración | Paso final del onboarding |
| `explaining` | `/explicando.png` | 553×510 | respiración | Estados vacíos (recursos, dashboard) |
| `listening` | `/escuchando.png` | 416×535 | respiración | El estudiante escribe en el chat |

**La altura intrínseca es 941px en `venus1/2/3` y ~520px en el resto, pero el
ancho cambia entre variantes** (relación de aspecto 0.50 → 1.08). Por eso el
componente fija el **alto** y deja el ancho en `auto`: así Luni nunca se deforma
al cambiar de variante dentro del mismo contenedor.

---

## 2. Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `variant` | `LuniVariant` | — (requerida) | Estado narrativo. Define el PNG. |
| `size` | `'sm' \| 'md' \| 'lg' \| number` | `'md'` | Alto en px. `sm`=48, `md`=96, `lg`=160; un número se usa tal cual. |
| `animated` | `boolean` | `false` | Flotación/respiración continua. |
| `shadow` | `boolean` | `false` | Sombra elíptica bajo Luni, sincronizada con el movimiento. |
| `alt` | `string \| null` | `undefined` | `null` la marca decorativa (`alt=""`); sin valor usa el alt de la variante. |
| `preload` | `boolean` | `false` | Precarga la imagen (`priority` está deprecado en Next 16). |
| `className` | `string` | — | Se fusiona con `cn` sobre el contenedor. |

El componente **no usa `'use client'`**: no tiene hooks ni handlers, así que
también puede renderizarse desde Server Components.

---

## 3. Reglas de uso

### `animated` va apagado por defecto
El movimiento perpetuo distrae y consume CPU. Enciéndelo solo donde Luni es el
foco: el FAB, el hero de un estado vacío y el onboarding. **No** lo enciendas en
avatares de mensaje ni en listas.

```tsx
// FAB: es el foco de la esquina inferior derecha
<LuniMascot variant="float" size={48} animated preload alt={null} />

// Avatar de mensaje: decenas en pantalla, ninguno animado
<LuniMascot variant="idle" size={28} alt={null} />
```

### Pasa un `className` de ancho fijo donde la variante cambia
Si el contenedor alterna entre variantes, el ancho intrínseco cambia y el layout
salta. Fija el ancho para el peor caso (el asset más ancho mide 1.08 × alto):

```tsx
// Cabecera del chat: alterna idle/wave/listening/thinking/explaining
<LuniMascot variant={varianteLuni} size={28} alt={null} className="w-8" />
```

### `alt={null}` cuando el contexto ya describe
En el FAB el `aria-label` del botón ya dice "Abrir el asistente", así que la
imagen es decorativa. Reserva un `alt` propio para cuando Luni sea la única
portadora del mensaje.

### Respeta los tokens
El componente no introduce ningún hexadecimal. La sombra usa `bg-black/40` y el
anillo del FAB usa la utilidad existente `gradient-brand-br`. Si necesitas un
color nuevo, va a `globals.css` como token, no al JSX.

---

## 4. Animaciones

Declaradas en `globals.css` como cualquier otra del proyecto (token en
`@theme inline` + `@keyframes` global: el mismo patrón que `accordion-*`):

```css
@keyframes luni-float {
  0%, 100% { transform: translateY(-6px); }
  50%      { transform: translateY(6px); }
}
```

| Token | Keyframe | Duración | Se aplica a |
|---|---|---|---|
| `--animate-luni-float` | `luni-float` | 4.5s | variante `float` |
| `--animate-luni-breathe` | `luni-breathe` | 5.5s | resto de variantes |
| `--animate-luni-shadow` | `luni-shadow` | 4.5s | la sombra de `shadow` |

La duración de `luni-shadow` **debe coincidir** con la de `luni-float` para que
la sombra respire al ritmo de Luni.

Accesibilidad: tanto la imagen como la sombra llevan
`motion-reduce:animate-none`, así que con `prefers-reduced-motion: reduce` Luni
queda estática sin código extra.

---

## 5. Puntos de integración

| Archivo | Variante | Nota |
|---|---|---|
| [`components/chat/chat-bubble.tsx`](../../frontend/components/chat/chat-bubble.tsx) | `float` | FAB: anillo de marca de 2px + disco glass; se conserva el `animate-ping` de primer uso, el badge de no leídos y el `aria-label` |
| [`components/chat/chat-panel.tsx`](../../frontend/components/chat/chat-panel.tsx) | derivada | Cabecera y estado vacío comparten **la misma** variante: dos caras distintas de Luni en un mismo panel se leen como un fallo |
| [`components/chat/message-bubble.tsx`](../../frontend/components/chat/message-bubble.tsx) | `idle`/`thinking` | El indicador de 3 puntos se mantiene: el avatar expresa, los puntos comunican progreso |
| [`components/onboarding-wizard.tsx`](../../frontend/components/onboarding-wizard.tsx) | `wave`, `thinking` | Saludo en la cabecera (oculto en móvil) y carga de la malla |
| [`components/onboarding/completion-step.tsx`](../../frontend/components/onboarding/completion-step.tsx) | `success` | Cierra el flujo antes de entrar a la app |
| [`components/recursos/empty-state.tsx`](../../frontend/components/recursos/empty-state.tsx) | `explaining` | Búsqueda sin resultados |
| [`components/dashboard/continue-learning.tsx`](../../frontend/components/dashboard/continue-learning.tsx) | `explaining` | Sin cursos activos (colores normalizados a tokens) |

### Derivación de la variante en el chat

El panel ya conoce `inputValue` e `isStreaming`, así que **no** se propaga estado
nuevo desde el contenedor:

```tsx
const varianteLuni: LuniVariant = isStreaming
  ? "thinking"                        // la IA está respondiendo
  : inputListo
    ? "listening"                     // el estudiante está escribiendo
    : messages.length > 0
      ? "explaining"                  // hay conversación que explicar
      : "wave"                        // primer contacto
```

> **Ojo con los nombres:** en `chat-bubble.tsx`, `isLoading` significa "releer el
> hilo guardado al recargar" y `isStreaming` significa "turno en vuelo". El estado
> "la IA está pensando" es `isStreaming`.

---

## 6. Añadir una variante nueva

1. Copia el PNG a `frontend/public/`. **Debe tener canal alfa** (RGBA).
2. Añade la entrada en `VARIANTES` con su ancho/alto intrínsecos reales y su `alt`.
3. Añade el nombre al tipo `LuniVariant`.
4. Añade una fila al mapa `ASSET_POR_VARIANTE` de
   [`__tests__/luni-mascot.test.tsx`](../../frontend/__tests__/luni-mascot.test.tsx).
5. Registra la variante en esta tabla.

Verificación: `npm --prefix frontend test` y `npx tsc --noEmit`.

---

## 7. Rendimiento

Los 7 PNG originales suman ~3.3 MB. `next/image` los sirve optimizados y la CSP
(`img-src 'self' data: blob: https:`) ya los permite, pero **el FAB lleva
`preload`**, así que conviene evaluar convertirlos a WebP/AVIF manteniendo la
transparencia. Queda como seguimiento, no como requisito del componente.
