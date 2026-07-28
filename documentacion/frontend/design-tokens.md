# UniVia - Guia de Tokens de Diseno (Design Tokens)

> **Version:** 1.0 - Fase 1 (Fundacion Frontend)
> **Fecha:** Julio 2026
> **Proposito:** Documentar el sistema de tokens, variables CSS y utilidades Tailwind del rebrand LEAD UNI para consumo del equipo de desarrollo.

---

## 1. Vision General y Filosofia

UniVia utiliza un sistema de diseno **100% Dark Mode** basado en la paleta oficial de **LEAD UNI**. No existe tema claro.

### Regla de Oro para el equipo

> **Prohibido usar valores hexadecimales hardcodeados (ej. bg-[#030c40], text-[#d93340]) en componentes.**
> Usar **unicamente** los tokens semanticos y utilidades documentadas en esta guia.

| Correcto | Incorrecto |
|---|---|
| bg-background | bg-[#030c40] |
| text-primary | text-[#d93340] |
| border-border | border-[#1e293b] |
| bg-accent/15 | bg-[#7957f1]/15 |

---

## 2. Paleta Cromatica y Tokens CSS

### Colores Base de Interfaz

| Token CSS | HEX | Tailwind Utility | Uso |
|---|---|---|---|
| --background | #030c40 | bg-background | Fondo principal de paginas |
| --foreground | #f8fafc | text-foreground | Color de texto principal |
| --card | #0a0a1f | bg-card | Fondo de tarjetas y contenedores elevados |
| --card-foreground | #e2e8f0 | text-card-foreground | Texto dentro de tarjetas |
| --popover | #0a0a1f | bg-popover | Fondo de modales, dropdowns |
| --popover-foreground | #e2e8f0 | text-popover-foreground | Texto en modales |
| --muted | #1e293b | bg-muted | Fondos secundarios / desactivados |
| --muted-foreground | #94a3b8 | text-muted-foreground | Texto secundario, etiquetas |
| --border | #1e293b | border-border | Bordes de componentes |
| --input | #1e293b | border-input | Bordes de inputs |
| --ring | #7957f1 | ring-ring | Anillo de foco (focus ring) |

### Colores de Marca (Brand)

| Token CSS | HEX | Tailwind Utility | Uso |
|---|---|---|---|
| --primary | #d93340 | bg-primary / text-primary | Rojo marca - acciones primarias |
| --secondary | #a6249d | bg-secondary / text-secondary | Magenta - acciones secundarias |
| --accent | #7957f1 | bg-accent / text-accent | Violeta - acentos, hovers, focus |
| --destructive | #bf2a51 | bg-destructive | Carmin - errores, destruccion |

### Brand Tokens (utilities explicitas)

| Token CSS | HEX | Tailwind Utility |
|---|---|---|
| --brand-red | #d93340 | bg-brand-red / text-brand-red |
| --brand-carmin | #bf2a51 | bg-brand-carmin / text-brand-carmin |
| --brand-magenta | #a6249d | bg-brand-magenta / text-brand-magenta |
| --brand-violet | #7957f1 | bg-brand-violet / text-brand-violet |
| --brand-lila | #d7cef7 | bg-brand-lila / text-brand-lila |
| --brand-navy | #030c40 | bg-brand-navy / text-brand-navy |

### Sidebar

| Token CSS | HEX | Tailwind Utility |
|---|---|---|
| --sidebar | #030c40 | bg-sidebar |
| --sidebar-foreground | #e2e8f0 | text-sidebar-foreground |
| --sidebar-primary | #d93340 | bg-sidebar-primary |
| --sidebar-accent | #1e293b | bg-sidebar-accent |
| --sidebar-border | #1e293b | border-sidebar-border |

---

## 3. Sistema Tipografico

UniVia utiliza tres familias tipograficas cargadas via `next/font/google`:

| Rol | Fuente | Variable CSS | Tailwind Utility | Pesos disponibles |
|---|---|---|---|---|
| Titulos / Wordmarks | Poppins | --font-heading | font-heading | 400, 500, 600, 700, 800 |
| Cuerpo / UI | Open Sans | --font-sans | font-sans | 400, 500, 600, 700 |
| Mono / Codigo | JetBrains Mono | --font-mono | font-mono | - |

### Reglas tipograficas

- **Headings (h1, h2, h3, h4):** Usar `font-heading` + `font-bold` o `font-semibold`.
- **Texto de cuerpo:** Usar `font-sans` (aplicado por defecto en body).
- **Wordmark LEAD UNI:** Usar la clase `.brand-wordmark` (aplica `font-heading uppercase font-bold tracking-wide`).

### Ejemplos

```tsx
<h1 className="font-heading font-bold text-3xl">Bienvenido a UniVia</h1>
<p className="text-muted-foreground">Descripcion del dashboard...</p>
<span className="brand-wordmark">LEAD UNI</span>
```

---

## 4. Clases Utilitarias de Degradados y Efectos Neon

### Degradado de Marca (Brand Gradient)

| Clase | Composicion | Uso |
|---|---|---|
| .gradient-brand | linear-gradient(135deg, #d93340, #a6249d, #7957f1) | Fondos de botones brand, barras de progreso, banners |
| .gradient-brand-text | Mismo degradado + background-clip: text | Texto con efecto degradado marca |
| .gradient-brand-hover | Mismo degradado + darken en hover | Botones con hover |
| .gradient-brand-br | Misma secuencia en to bottom right | Esquinas, iconos decorativos |

### Efectos Neon / Asistente IA

| Clase | Efecto | Uso |
|---|---|---|
| .ai-glow | box-shadow con violeta rgba(121,87,241,0.25) y magenta rgba(166,36,157,0.2) | Contenedores de recomendaciones IA |
| .ai-glow-text | Degradado Rojo->Magenta->Violeta + text-shadow neon | Titulos de secciones IA |
| .ai-neon-glow | box-shadow neon rosado | Efectos de brillo neon |
| .gradient-ai-neon | linear-gradient(135deg, #cb2b46, #a0218b, #ff86ff) | Botones neon, badges neon-outline |

---

## 5. Guia de Uso de Componentes Base UI

### Button

```tsx
import { Button } from "@/components/ui/button"

{/* Accion principal estandar */}
<Button>Continuar</Button>

{/* Accion destacada con gradiente marca */}
<Button variant="brand">Generar recomendacion</Button>

{/* Accion secundaria */}
<Button variant="secondary">Cancelar</Button>

{/* Accion destructiva */}
<Button variant="destructive">Eliminar</Button>

{/* Accion estilo outline */}
<Button variant="outline">Ver mas</Button>

{/* Accion relacionada con IA */}
<Button variant="neon">Preguntar a la IA</Button>

{/* Boton con enlace */}
<Button variant="link">Terminos y condiciones</Button>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge"

{/* Estados academicos */}
<Badge variant="completed">Aprobado</Badge>
<Badge variant="in-progress">En curso</Badge>
<Badge variant="available">Disponible</Badge>
<Badge variant="locked">Bloqueado</Badge>

{/* Dificultad */}
<Badge variant="easy">Facil</Badge>
<Badge variant="medium">Medio</Badge>
<Badge variant="hard">Dificil</Badge>

{/* Estilos estandar */}
<Badge variant="default">Nuevo</Badge>
<Badge variant="secondary">Info</Badge>
<Badge variant="outline">Borrador</Badge>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Progreso del Ciclo</CardTitle>
    <CardDescription>Resumen de avance academico</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Contenido de la tarjeta...</p>
  </CardContent>
  <CardFooter>
    <Button variant="brand">Ver detalles</Button>
  </CardFooter>
</Card>
```

### AiInsightCard

Componente especializado para recomendaciones del asistente de IA.

```tsx
import { AiInsightCard } from "@/components/ui/ai-insight-card"

<AiInsightCard
  title="Recomendacion de tu asistente IA"
  description="Basado en tu rendimiento, te sugerimos reforzar los temas de estructuras de datos."
  badgeText="Insight"
  actionLabel="Ver ejercicios"
  onAction={() => console.log("Accion")}
/>

<AiInsightCard variant="glow" title="Analisis de rendimiento" description="Has mejorado un 15%." />

<AiInsightCard variant="compact" description="Proximo examen: Viernes." />
```

#### Props del componente

| Prop | Tipo | Default | Descripcion |
|---|---|---|---|
| title | string | - | Titulo del bloque |
| description | ReactNode | - | Descripcion o contenido |
| actionLabel | string | - | Texto del boton de accion |
| onAction | () => void | - | Callback del boton |
| icon | ReactNode | Sparkles | Icono personalizado |
| badgeText | string | - | Texto para badge opcional |
| variant | default | glow | compact | default | Variante visual |

---

## 6. Resumen Rapido para el Dia a Dia (Hoja de Chequeo)

### Lo que NO debes hacer

```tsx
{/* NUNCA: hardcodear colores */}
<div className="bg-[#030c40] text-[#d93340]">

{/* NUNCA: usar colores fuera de la paleta */}
<div className="text-blue-500">

{/* NUNCA: mezclar estilos inline con tokens */}
<div style={{ color: "#a6249d" }}>
```

### Lo que SI debes hacer

```tsx
{/* Usar tokens semanticos */}
<div className="bg-background text-primary">

{/* Usar brand tokens */}
<div className="bg-brand-violet text-white">

{/* Usar utilidades */}
<button className="gradient-brand text-white font-semibold">
```

---

## 7. Referencia de Archivos Modificados en Fase 1

| Archivo | Rol |
|---|---|
| frontend/app/globals.css | Declaracion de todas las variables CSS, @theme inline y utilidades |
| frontend/app/layout.tsx | Carga de fuentes (Poppins, Open Sans) y configuracion del ThemeProvider |
| frontend/components/ui/button.tsx | Componente Button con variantes brand, neon, etc. |
| frontend/components/ui/badge.tsx | Componente Badge con variantes de estado y dificultad |
| frontend/components/ui/card.tsx | Componente Card con glassmorphism y font-heading |
| frontend/components/ui/tabs.tsx | Componente Tabs con acento violeta en active |
| frontend/components/ui/input.tsx | Componente Input con focus ring heredado |
| frontend/components/ui/ai-insight-card.tsx | Componente AiInsightCard para bloques de IA |
| frontend/.env.example | Variables de entorno del frontend |
| documentacion/frontend/design-tokens.md | Esta guia de tokens de diseno |

---

> **Documento mantenido por:** Equipo de Desarrollo Frontend - LEAD UNI / UniVia
> **Proxima revision:** Fase 2 (Integracion RAG y Funcionalidades Core)
