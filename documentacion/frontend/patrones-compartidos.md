# Patrones visuales compartidos — Frontend UniVia

Entregable de la **Fase 3 (Dashboard, Navegación y Perfil)**.

Documenta los patrones de composición que se repiten entre pantallas, para que
la **Fase 4** (Detalle de curso, Evaluaciones, Banco de recursos) los reutilice
en lugar de reimplementarlos con otro aspecto.

- **Tokens de color y tipografía:** [`design-tokens.md`](./design-tokens.md) — Fase 1
- **Contrato de datos del estudiante:** [`../backend/contrato-avance-estudiante.md`](../backend/contrato-avance-estudiante.md) — Fase 3

> Este documento trata de **composición**: cómo se combinan los primitivos.
> Los colores y utilidades salen de la guía de tokens y esa regla sigue
> vigente: **ningún hexadecimal en componentes**.

---

## 1. Patrón principal: Tabs + Card con borde sutil

El patrón para agrupar contenido heterogéneo de una misma entidad en secciones
que el usuario alterna.

### Implementación de referencia

[`frontend/app/perfil/page.tsx`](../../frontend/app/perfil/page.tsx) — pestañas
*Información académica · Seguridad · Preferencias*.

Léelo antes de escribir el tuyo: es más rápido que reconstruirlo desde aquí.

### Estructura

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="ruta" className="gap-4">
  <TabsList className="h-auto p-1">
    <TabsTrigger value="ruta" className="px-4 py-2">Ruta de aprendizaje</TabsTrigger>
    <TabsTrigger value="examenes" className="px-4 py-2">Banco de exámenes</TabsTrigger>
    <TabsTrigger value="mias" className="px-4 py-2">Mis evaluaciones</TabsTrigger>
  </TabsList>

  <TabsContent value="ruta">
    <div className="bg-card border border-border p-6 rounded-2xl">
      {/* contenido */}
    </div>
  </TabsContent>
</Tabs>
```

### Reglas

| Elemento | Clase | Por qué |
|---|---|---|
| Contenedor | `bg-card border border-border rounded-2xl` | El "borde sutil" del patrón. `border-border` sobre `bg-card` da separación sin líneas duras |
| Espaciado interno | `p-6` | `p-4` en tarjetas pequeñas dentro de una grilla |
| Separación lista/panel | `gap-4` en `<Tabs>` | Menos se ve apretado; más rompe la relación entre pestaña y contenido |
| Ancho de pestaña | `px-4 py-2` en el trigger | El alto por defecto (`h-9`) aprieta el texto en etiquetas largas; por eso `h-auto` en `TabsList` |
| Radio | `rounded-2xl` | `rounded-3xl` queda para tarjetas de cabecera (hero) |

### Qué no hacer

- **No anides Card dentro de Card.** Dos bordes concéntricos se leen como un
  error de maquetación. Para subdividir, usa `border-t border-border` con
  `pt-6`, como hace la pestaña *Información académica*.
- **No pongas un `<h2>` repitiendo el nombre de la pestaña.** La pestaña activa
  ya es el título; repetirlo lo dice dos veces.
- **No uses tabs para pasos secuenciales.** Las pestañas son para contenido
  paralelo entre el que se salta libremente. Un flujo con orden es un wizard
  (ver el onboarding).

---

## 2. Estado vacío dentro de una Card

Toda pestaña puede quedar vacía. El patrón:

```tsx
<div className="p-10 text-center bg-card rounded-2xl border border-dashed border-border">
  <div className="p-3 rounded-lg gradient-brand-br inline-flex mb-4">
    <BookOpen className="w-6 h-6 text-primary-foreground" />
  </div>
  <p className="text-muted-foreground font-medium">No hay exámenes cargados todavía.</p>
  <p className="text-xs text-muted-foreground/70 mt-2">
    Aparecerán aquí cuando se publique material del curso.
  </p>
</div>
```

**El borde punteado (`border-dashed`) distingue "vacío" de "cargando".** Una
tarjeta sólida en blanco parece rota; una punteada se lee como un espacio que
se llenará.

Referencia: [`continue-learning.tsx`](../../frontend/components/dashboard/continue-learning.tsx).

---

## 3. Carga: esqueleto, no spinner

Dentro de una Card ya visible, usa bloques `animate-pulse` con la forma del
contenido que viene. El spinner queda para pantallas completas.

```tsx
<div className="h-56 bg-card animate-pulse rounded-2xl border border-border" />
```

Razón: el esqueleto conserva la altura del contenedor. Un spinner que se
reemplaza por contenido más alto empuja la página y mueve lo que el usuario
estaba a punto de tocar.

---

## 4. Badges de estado de curso

**No inventes colores de estado.** Están centralizados en
[`lib/course-status.ts`](../../frontend/lib/course-status.ts):

```tsx
import { COURSE_STATUS_MAP, type CourseStatus } from "@/lib/course-status"

const estado = COURSE_STATUS_MAP[curso.status]
<span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", estado.badge)}>
  {estado.label}
</span>
```

Los cuatro estados (`completed`, `in_progress`, `available`, `locked`) son los
mismos que devuelve el backend; ver §1 del contrato de datos.

---

## 5. Funcionalidad que todavía no existe

Convención adoptada en la Fase 3 para lo que el mockup muestra pero el backend
aún no soporta:

```tsx
<span className="flex items-center gap-2 text-xs text-muted-foreground/50 cursor-default">
  <Sparkles className="w-3.5 h-3.5" />
  Generar evaluación con IA
  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70">
    pronto
  </span>
</span>
```

**Apagado y etiquetado, nunca un control que no responde.** Un botón que no
hace nada al pulsarlo se reporta como bug; uno marcado "pronto" comunica el
estado real del producto.

Aplicado en: menú Explorar (Evaluaciones con IA, Clases grabadas), accesos
rápidos del dashboard y preferencias del perfil.

---

## 6. Barra de progreso

Una sola clase para todas las barras de la app:

```tsx
<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
  <div className="progress-bar-modern-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
</div>
```

`.progress-bar-modern-fill` (definida en `globals.css`, Fase 1) aplica el
degradado de marca. **Recorta siempre con `Math.min(pct, 100)`**: un porcentaje
mayor a 100 desborda el contenedor.

---

## 7. Iniciales en lugar de avatar generado

El avatar del estudiante son sus iniciales sobre `gradient-brand-br`.

En la Fase 2 esto usaba **Dicebear**, un servicio externo al que se le enviaba
el ID del usuario para dibujar una caricatura. Se retiró en la Fase 3: mandar
el identificador de un estudiante a un tercero no aporta nada y el CSP de
producción bloquearía la petición igual.

```tsx
<Avatar className="w-8 h-8">
  <AvatarFallback className="gradient-brand-br text-primary-foreground text-xs font-semibold">
    {iniciales(user?.nombre_completo)}
  </AvatarFallback>
</Avatar>
```

---

## 8. Checklist antes de abrir el PR

- [ ] Ningún hexadecimal, `text-white`, `text-slate-*` ni `bg-[#...]` en tus componentes.
- [ ] Toda Card usa `bg-card border border-border`.
- [ ] Cada lista tiene su estado vacío y su esqueleto de carga.
- [ ] Ningún botón sin `onClick` ni enlace a una ruta inexistente. Si no hay
      destino, va apagado con etiqueta "pronto" (§5).
- [ ] Los estados de curso salen de `COURSE_STATUS_MAP`, no de colores propios.
- [ ] `npx tsc --noEmit` sin errores.
