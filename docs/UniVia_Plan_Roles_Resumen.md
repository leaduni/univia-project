# UniVia — Plan de Roles de Rebranding Front-End

## Contexto del Proyecto

**Objetivo:** Migrar la identidad visual del front-end de UniVia (Next.js + TypeScript + Tailwind CSS v4 + Shadcn UI) desde un sistema genérico (azul/cian, tipografía Geist) hacia la identidad oficial de **LEAD UNI**.

**Alcance:** Rebranding visual (colores, tipografía, logo) sin tocar lógica, datos ni funcionalidades.

**Stack actual:**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Shadcn UI
- Estructura modular por features (dashboard, malla, curso, recursos, onboarding, auth)

---

## Equipo y Distribución

**4 integrantes** distribuidos en capas de dependencia:

| Integrante | Rol | Frente | Prioridad |
|------------|-----|--------|-----------|
| **Luis** | Design System | Tokens, tipografía, componentes UI base | 🔴 Primero |
| **Omar** | Páginas núcleo | Dashboard, malla, ruta de aprendizaje | 🟡 Paralelo (requiere Luis) |
| **Sebastián** | Páginas secundarias + QA | Auth, perfil, recursos, onboarding, nav, QA visual | 🟡 Paralelo (requiere Luis) |
| **Renato** | RAG / IA | Integración del RAG para generación de preguntas | 🔵 Paralelo (independiente) |

---

## Capa 1: Luis — Design System & Tokens Base

### Responsabilidad
Crear la base de marca que el resto del equipo consume. **Sin esta capa, todo lo demás es provisional.**

### Qué hace
1. **Unificar `globals.css`**
   - El repo tiene dos archivos `globals.css` (en `/app` y `/styles`) — consolidar en uno
   - Establecer como fuente única de verdad antes de modificar

2. **Migrar tokens OKLCH**
   - Reemplazar paleta actual (cian/azul genérica) por LEAD UNI:
     - Primary: Navy `#030c40` (en lugar de azul)
     - Accent: Rojo `#d93340` / Magenta `#a6249d` (en lugar de cian)
     - Destructive: Violeta `#7957f1`
     - Background: Lila claro `#d7cef7` (para superficies suaves)

3. **Cambiar tipografía**
   - Reemplazar `Geist` por `Poppins` (via `next/font/google`)
   - Definir jerarquía H1–H3, body, caption según manual LEAD UNI
   - Cargar fuentes web adicionales (MediaPro, Anton, Open Sans, Montserrat) si aplica

4. **Reescribir utilidades globales**
   - `.ai-glow`: Cambiar gradiente cian→azul por rojo→magenta→violeta
   - `.ai-glow-text`: Actualizar clip-path gradient
   - `.progress-bar-modern-fill`: Aplicar nueva paleta
   - Mantener función, cambiar solo estética

5. **Validar componentes Shadcn**
   - Button, Badge, Card, Progress, Input, etc.
   - Confirmar que heredan tokens nuevos sin romper variantes
   - Revisar en modo claro (dark mode puede venir después)

6. **Entregar assets de logo**
   - `logo.svg` (principal con tagline)
   - `logo-simple.svg` (ícono solo)
   - `logo-white.svg` (versión blanca)
   - Favicons (`icon-light-32x32.png`, `icon-dark-32x32.png`)
   - Respetar tamaño mínimo 168×108px

### Archivos clave
```
frontend/app/globals.css
frontend/styles/globals.css
frontend/app/layout.tsx
frontend/components/ui/*
frontend/public/logos/
frontend/public/favicon.ico
```

### Entregable
- ✅ Archivo CSS unificado con paleta LEAD UNI
- ✅ Mini guía de tokens para que Omar/Sebastián no improvisen colores
- ✅ Componentes UI validados visualmente
- ✅ Assets de logo listos

---

## Capa 2: Omar — Páginas Núcleo

### Responsabilidad
Rebranding de las pantallas donde pasa más tiempo el usuario y que se enseñan en demos del MVP.

### Qué hace
1. **Dashboard** (`components/dashboard.tsx`, `app/page.tsx`)
   - Re-skinear `StatsCards` (números de progreso, créditos, etc.)
   - Actualizar `CurrentCoursesSection` (tarjetas de curso)
   - Reskinear `AIRecommendation` (banner con insights IA)
   - Cambiar `RightSidebar` (logros/achievements) con colores de marca

2. **Malla Curricular** (`components/malla-curricular.tsx`, `app/mi-malla/page.tsx`)
   - Actualizar estados de curso con colores LEAD UNI:
     - Disponible: Verde / Magenta suave
     - En progreso: Rojo / Violeta
     - Bloqueado: Gris neutral
     - Completado: Combinación de colores de pilares (si corresponde)
   - Mantener claridad visual: 4 estados deben ser distinguibles

3. **Ruta de Aprendizaje** (`app/curso/[id]/page.tsx`, componentes de learning-path)
   - Actualizar timeline de semanas con colores nuevos
   - Reskinear tarjetas de "IA Insights"
   - **Coordinar con Renato** sobre layout final del banco de exámenes (sección que él integrará)
   - Asegurar que cuando Renato añada RAG, se vea como parte del mismo diseño

### Punto crítico de coordinación
⚠️ **Omar y Renato DEBEN alinear el layout del banco de exámenes antes de implementar,** para no duplicar trabajo de maquetado.

### Archivos clave
```
frontend/components/dashboard.tsx
frontend/components/stats-cards.tsx
frontend/components/current-courses-section.tsx
frontend/components/ai-recommendation.tsx
frontend/components/malla-curricular.tsx
frontend/components/right-sidebar.tsx
frontend/app/curso/[id]/page.tsx
frontend/app/mi-malla/page.tsx
frontend/components/learning-path/
```

### Entregable
- ✅ Dashboard, malla y vista de curso con identidad LEAD UNI
- ✅ Estados de curso claramente distinguibles
- ✅ Acuerdo escrito con Renato sobre layout de RAG

---

## Capa 3: Sebastián — Páginas Secundarias + QA Visual

### Responsabilidad
Terminar el rebranding en páginas restantes y hacer QA final para garantizar consistencia visual en toda la app.

### Qué hace
1. **Páginas de Autenticación**
   - `app/auth/login/page.tsx`: Reemplazar panel izquierdo (hoy gradiente azul/cian + ícono "U") con logo oficial LEAD UNI + gradiente rojo→magenta→violeta
   - `app/auth/signup/page.tsx`: Mismo cambio

2. **Navegación**
   - `components/sidebar.tsx`: Cambiar ícono "U" en gradiente azul/cian por logo simple de LEAD UNI
   - Actualizar estado activo del menú con colores nuevos
   - `components/header.tsx`: Logo pequeño en esquina, asegurar visibilidad en header blanco

3. **Páginas Secundarias**
   - `app/perfil/page.tsx`: Aplicar identidad en tarjetas de información
   - `app/recursos/page.tsx` (biblioteca): Actualizar filtros, badges, elementos de UI
   - `app/onboarding/page.tsx`: Wizard de configuración con nueva paleta

4. **Metadata & Favicon**
   - `app/layout.tsx`: Actualizar referencias a favicons (Luis entrega los assets)
   - Revisar `metadata.title`, descripción del navegador
   - Asegurar que dark/light icons usen logo nuevo

5. **QA Visual Completo**
   - Recorrer todas las rutas:
     - `/` (dashboard)
     - `/mi-malla` (malla)
     - `/curso/[id]` (detalle de curso)
     - `/recursos` (biblioteca)
     - `/perfil` (perfil)
     - `/onboarding` (wizard)
     - `/auth/login`, `/auth/signup` (auth)
   - **Checklist de validación:**
     - ❌ Ningún gradiente "blue-600 / cyan-500" original
     - ❌ No queda ícono "U" genérico
     - ❌ Todos los colores pertenecen a paleta LEAD UNI
     - ❌ Tipografía es consistente (Poppins en marca, Open Sans/Montserrat en cuerpo)
     - ✅ Contraste suficiente en todo texto
     - ✅ Logo visible en header/footer/corners según contexto
     - ✅ Animaciones/transiciones mantienen feel académico (no caóticas)

### Archivos clave
```
frontend/app/auth/login/page.tsx
frontend/app/auth/signup/page.tsx
frontend/components/sidebar.tsx
frontend/components/header.tsx
frontend/app/perfil/page.tsx
frontend/app/recursos/page.tsx
frontend/app/onboarding/page.tsx
frontend/app/layout.tsx
```

### Entregable
- ✅ Todas las páginas secundarias con identidad LEAD UNI
- ✅ Navegación (sidebar/header) completamente rebranded
- ✅ Checklist de QA visual completado y firmado
- ✅ Documentación de cualquier inconsistencia detectada

---

## Capa 4: Renato — RAG / Integración de IA

### Responsabilidad
Integrar funcionalidad de RAG para generación de preguntas de examen. **Trabajo paralelo, independiente de las capas visuales** (aunque la estética final la aplican Omar/Sebastián).

### Qué hace
1. **Consumo del RAG desde front-end**
   - Llamadas API al backend (`backend/routers/cursos.py`)
   - Estados de carga, error y resultado en componentes

2. **Definir layout de la sección**
   - Decidir dónde va dentro de `LearningPath` (antes o después del timeline)
   - Botón para disparar generación ("Generar preguntas", "Crear quiz", etc.)
   - Mostrar preguntas generadas en tarjetas/modal

3. **Coordinación con Omar**
   - ⚠️ Antes de implementar, alinear visualmente cómo se integra en la página de curso
   - Omar define el layout/estructura; Renato implementa la lógica; Sebastián aplica estética final

### Archivos clave
```
frontend/app/curso/[id]/page.tsx (sección RAG)
frontend/components/learning-path/ (componentes relacionados)
backend/routers/cursos.py (endpoint que Renato consumirá)
```

### Entregable
- ✅ RAG integrado y funcional en el front-end
- ✅ Estados visuales de carga/error/éxito
- ✅ Componentes listos para que Sebastián aplique estilo final LEAD UNI

---

## Orden de Dependencias

```
┌─────────────────────────────────────────────────────────────┐
│ LUIS: Design System & Tokens (Capa 1)                      │
│ ↓ Entrega: globals.css unificado + componentes UI base + logo │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
│ OMAR: Núcleo     │  │ SEBASTIÁN: Secundarias│  │ RENATO: RAG/IA   │
│ (Capa 2)         │  │ + QA (Capa 3)        │  │ (Paralelo)       │
│ Dashboard, Malla │  │ Auth, Perfil, Nav    │  │ Integración del  │
│ Ruta aprendizaje │  │ Recursos, QA visual  │  │ sistema de RAG   │
└──────────────────┘  └──────────────────────┘  └──────────────────┘
        │                     │                         │
        └─────────────────────┴─────────────────────────┘
                              ↓
                    ✅ MVP VISUAL COMPLETO
                    Presentación del rebranding
```

---

## Hitos Clave

### Acuerdos Previos (Antes de comenzar)
- [ ] Equipo confirma cuál `globals.css` es la fuente única (Luis lidera decisión)
- [ ] Omar y Renato acuerdan layout de RAG en `LearningPath`
- [ ] Todos entienden la paleta LEAD UNI (compartir guía de identidad)

### Entregables Progresivos
- **Fase 1 (Luis):** Tokens + componentes UI base (3-5 días)
- **Fase 2 (Omar + Sebastián + Renato):** Páginas en paralelo (5-7 días)
- **Fase 3 (Sebastián):** QA visual + ajustes finales (2-3 días)

### Pre-Demo
- [ ] Ningún color genérico (azul/cian) visible
- [ ] Logo LEAD UNI presente en header, auth, favicon
- [ ] Tipografía coherente (Poppins en marca, Open Sans/Montserrat en cuerpo)
- [ ] Banco de exámenes (RAG) integrado y estilizado
- [ ] Checklist de QA completado

---

## Checklist de Validación Visual (Pre-Demo)

Sebastián lidera esta validación final:

### Colores
- [ ] Ningún gradiente "blue-600 / cyan-500" encontrado
- [ ] Gradientes nuevos usan rojo → magenta → violeta
- [ ] Backgrounds usan navy (#030c40) o blanco
- [ ] Acentos son rojo (#d93340), magenta (#a6249d) o violeta (#7957f1)
- [ ] Fondos de tarjeta/sección usan lila claro (#d7cef7) cuando es apropiado

### Logo & Navegación
- [ ] Ícono "U" genérico fue reemplazado por logo LEAD UNI
- [ ] Logo visible y proporcionado en sidebar, header, favicon
- [ ] Logo respeta zona segura (10% alrededor)
- [ ] Versión blanca del logo usada en fondos oscuros

### Tipografía
- [ ] Poppins usado para "LEAD UNI" wordmark
- [ ] MediaPro Heavy Condensed o Anton para títulos grandes
- [ ] Open Sans o Montserrat para cuerpo
- [ ] Jerarquía visual clara: H1 > H2 > Body

### Estados de Componentes
- [ ] Botones: Estilos primario, secundario, hover consistentes
- [ ] Progreso: Barras y badges usan paleta nueva
- [ ] Tarjetas: Bordes y sombras respetan tema
- [ ] Estados de curso (malla): 4 estados distinguibles

### RAG Integration
- [ ] Sección de preguntas se integra naturalmente en `LearningPath`
- [ ] Estados de carga/error/éxito tienen estilo consistente
- [ ] Botón de generación es visible y accesible

### Accesibilidad
- [ ] Contraste texto/fondo es mínimo WCAG AA
- [ ] Colores no son la única forma de indicar estado (usar iconos también)
- [ ] Focus states son visibles para navegación por teclado

### QA Técnico
- [ ] `globals.css` está unificado (solo una copia activa)
- [ ] No hay conflictos de estilos entre componentes
- [ ] Build compila sin warnings (o solo warnings esperados)
- [ ] Responsive design mantiene branding en mobile

---

## Archivos del Repositorio por Integrante

### Luis (Design System)
```
frontend/app/globals.css          ← FUENTE ÚNICA
frontend/styles/globals.css       ← ELIMINAR o DESACTIVAR
frontend/app/layout.tsx           ← Metadata y fonts
frontend/tailwind.config.js       ← Verificar configuración
frontend/components/ui/*          ← Validar componentes base
frontend/public/logos/            ← Assets nuevos
```

### Omar (Páginas Núcleo)
```
frontend/components/dashboard.tsx
frontend/components/stats-cards.tsx
frontend/components/current-courses-section.tsx
frontend/components/ai-recommendation.tsx
frontend/components/malla-curricular.tsx
frontend/components/right-sidebar.tsx
frontend/app/page.tsx             ← Dashboard home
frontend/app/mi-malla/page.tsx
frontend/app/curso/[id]/page.tsx  ← Coordinar con Renato
frontend/components/learning-path/
```

### Sebastián (Secundarias + QA)
```
frontend/app/auth/login/page.tsx
frontend/app/auth/signup/page.tsx
frontend/components/sidebar.tsx
frontend/components/header.tsx
frontend/app/perfil/page.tsx
frontend/app/recursos/page.tsx
frontend/app/onboarding/page.tsx
frontend/app/layout.tsx           ← Favicon/metadata
frontend/public/favicon.ico
```

### Renato (RAG)
```
frontend/app/curso/[id]/page.tsx  ← Integración RAG
frontend/components/learning-path/exam-bank.tsx (hipotético)
backend/routers/cursos.py         ← Endpoint a consumir
```

---

## Notas Importantes

### ⚠️ Advertencias
1. **No tocar lógica de datos.** Este rebranding es VISUAL SOLAMENTE.
2. **Luis va primero.** Omar y Sebastián usan sus tokens; no pueden trabajar en paralelo esperando variables CSS que no existen.
3. **Omar y Renato coordinen.** El banco de exámenes es punto de contacto; alinear antes de implementar.
4. **Sebastián es el guardián de consistencia.** Su QA final evita que se lance con restos del viejo diseño.

### 💡 Tips
- Usar herramientas de color picker (e.g., Coolors) para verificar exactitud de hex codes
- Crear branch separada por integrante para evitar conflictos git
- Revisar en mobile también; branding debe funcionar en 320px ancho
- Hacer commit pequeños y frecuentes (no monolíticos)

### 📞 Comunicación
- Daily standup de 15min sobre bloqueos (especialmente Omar-Renato)
- Compartir avances en branch de QA control antes de merge a main
- Documentar cualquier decisión de diseño que se desvíe del manual (para futuro)

---

## Conclusión

Este plan distribuye el trabajo en **capas de dependencia clara**: Luis crea los cimientos, Omar y Sebastián construyen sobre ellos en paralelo, Renato integra funcionalidad de forma independiente. Sebastián cierra con QA visual, asegurando que el MVP respira la identidad LEAD UNI de forma consistente en todas las pantallas.

**Resultado esperado:** Un front-end rebranded que mantiene toda su funcionalidad, pero transmite la identidad y valores de LEAD UNI desde el primer click.

---

**Documento:** Plan de Roles Rebranding UniVia → LEAD UNI  
**Generado:** Junio 2026  
**Basado en:** Manual de Marca LEAD UNI + Revisión del repositorio UniVia  
**Equipos:** Luis, Omar, Sebastián, Renato
