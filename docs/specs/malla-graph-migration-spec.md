# Spec: Migración de Malla Curricular a Grafo Horizontal (DAG)

- **Estado:** ESPECIFICACIÓN (sin implementar)
- **Fecha:** 2026-08-10
- **Autores:** Luis & Equipo Lead UNI
- **Archivos de referencia:**
  - Actual: `frontend/components/malla-curricular.tsx` (acordeones por ciclo)
  - Actual: `frontend/app/malla/page.tsx` (página contenedora)
  - Actual: `backend/app/routers/malla.py` (GET `/api/malla`)
  - Actual: `backend/app/schemas/malla.py` (`CicloDetail`, `CourseDetail`, `PrerrequisitoInfo`)

---

## 1. Resumen Ejecutivo

Migrar la visualización actual de la malla curricular —basada en acordeones `<details>` con CSS grid por ciclo— hacia un **Grafo Acíclico Dirigido (DAG) horizontal interactivo**, donde los ciclos son columnas verticales, los cursos son nodos, y los prerrequisitos son aristas (edges) que conectan visualmente cada curso con sus dependencias directas.

El stack propuesto es **React Flow (@xyflow/react)** sobre la estructura de datos existente del backend, que ya entrega toda la información necesaria sin cambios en la API.

---

## 2. Arquitectura de Layout y Distribución Visual

### 2.1 Disposición en Grafo Horizontal

```
Ciclo I    Ciclo II    Ciclo III    ...    Ciclo X
┌──────┐   ┌──────┐    ┌──────┐           ┌──────┐
│Mate 1│──▶│Mate 2│───▶│Mate 3│──────────▶│Mate 4│
└──────┘   └──────┘    └──────┘           └──────┘
               │            ▲
               │            │
               ▼            │
           ┌──────┐         │
           │Física│─────────┘
           └──────┘
```

**Reglas de layout:**

| Regla | Valor |
|---|---|
| Dirección | Horizontal — ciclos de izquierda (I) a derecha (X) |
| Nodos por columna | Posición Y calculada distribuyendo uniformemente los cursos dentro de cada columna |
| Aristas | Líneas suavizadas (`smoothstep` o `bezier`) desde el prerrequisito (izquierda) hacia el curso dependiente (derecha) |
| Espaciado entre columnas | ~220px fijos, suficiente para que las etiquetas de aristas no colapsen |
| Espaciado vertical entre nodos | ~120px, con altura de nodo de ~90px |
| Viewport | Paneable (drag) + zoom (scroll wheel), con botón "Fit view" para centrar |

### 2.2 Algoritmo de Posicionamiento

```typescript
function computeNodePositions(ciclos: CicloDetail[]): NodePosition[] {
  const COLUMN_WIDTH = 220;
  const NODE_HEIGHT = 90;
  const VERTICAL_GAP = 30;
  const START_X = 0;
  const START_Y = 0;

  return ciclos.flatMap((ciclo, colIndex) => {
    const totalHeight = ciclo.courses.length * NODE_HEIGHT
      + (ciclo.courses.length - 1) * VERTICAL_GAP;

    return ciclo.courses.map((curso, rowIndex) => ({
      id: curso.id,
      x: START_X + colIndex * COLUMN_WIDTH,
      y: START_Y + rowIndex * (NODE_HEIGHT + VERTICAL_GAP)
        - totalHeight / 2, // centrar verticalmente
    }));
  });
}
```

**Por qué no un layout automático (Dagre/ELK):** El dato ya viene organizado por ciclo desde el backend. Esto nos da un layout determinista y predecible sin depender de algoritmos de fuerza ni librerías de layout que añadirían ~60 KB al bundle y costo de cómputo O(n²). Las posiciones se calculan en O(n) y se cachean con `useMemo`.

### 2.3 Edge Routing

React Flow ofrece tres tipos de arista aplicables:

| Tipo | Uso |
|---|---|
| `smoothstep` | **Recomendado.** Curva ortogonal suavizada. Ideal para grafos académicos, legible incluso con múltiples aristas en paralelo. |
| `bezier` | Curva libre. Útil si hay muchas aristas cruzadas, pero más difícil de seguir visualmente. |
| `straight` | Línea recta. Rápida de renderizar, pero se solapa visualmente cuando dos nodos de la misma columna tienen destinos cercanos. |

Las aristas se estilizan con color semántico: **violeta** si el prerrequisito está completado, **gris con dash** si está pendiente. Grosor de 2px, con marcador de flecha al final.

### 2.4 Conexiones (Aristas) desde el Backend

Cada `CourseDetail` ya incluye `prerequisitos: PrerrequisitoInfo[]` con los prerrequisitos directos. La transformación a edges es directa:

```typescript
function buildEdges(ciclos: CicloDetail[]): Edge[] {
  return ciclos.flatMap(ciclo =>
    ciclo.courses.flatMap(curso =>
      curso.prerequisitos.map(prereq => ({
        id: `${prereq.id}->${curso.id}`,
        source: prereq.id,
        target: curso.id,
        type: 'smoothstep',
        animated: curso.status === 'in_progress',
        style: {
          stroke: prereq.completado ? '#7c3aed' : '#4b5563',
          strokeWidth: 2,
          strokeDasharray: prereq.completado ? undefined : '6 4',
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: prereq.completado ? '#7c3aed' : '#4b5563' },
      }))
    )
  );
}
```

---

## 3. Flujo, Elementos UI y Estados de los Nodos

### 3.1 Estados Visuales del Nodo-Curso

Cada nodo es un `React.Component` custom registrado en React Flow como `nodeTypes: { course: CourseNode }`.

| Estado | Color / Icono | Comportamiento |
|---|---|---|
| `completed` | Check verde + fondo violeta/10 + borde violeta/30 | Clickeable → navega a `/curso/{id}` |
| `in_progress` | Indicador animado (pulso rojo/naranja) + borde accent | Clickeable → navega a `/curso/{id}` |
| `available` | Fondo blanco/card + borde sutil | Clickeable → abre modal de confirmación "¿Inscribir?" |
| `locked` | Icono Lock + opacidad 50% + `cursor-not-allowed` | No clickeable |

**Estructura visual del nodo (90x90px aprox):**

```
┌─────────────────────┐
│  MA-101    ✅ APROB.│  ← código + badge de estado
│                     │
│  Matemática I       │  ← nombre del curso (2 líneas máx)
│                     │
│  4 créditos         │  ← metadata
└─────────────────────┘
```

### 3.2 Interactividad: Hover con Cadena de Ancestros y Descendientes

**Comportamiento esperado:**

1. El usuario hace hover sobre un curso.
2. Se resaltan (opacidad 100%, stroke más grueso) todos los nodos y aristas que pertenecen a:
   - **Cadena ascendente (ancestros):** todos los prerrequisitos transitivos del curso, siguiendo el grafo hacia atrás.
   - **Cadena descendente (descendientes):** todos los cursos para los cuales este curso es prerrequisito (directo o transitivo).
3. Los nodos y aristas no relacionados bajan su opacidad a 20%.
4. Al salir del hover, todo vuelve a opacidad normal.

**Implementación:**

```typescript
// Precomputar mapas de ancestros y descendientes una vez
const ancestorMap = useMemo(() => buildAncestorMap(prereqMap), [prereqMap]);
const descendantMap = useMemo(() => buildDescendantMap(prereqMap), [prereqMap]);

// En el handler de hover del nodo:
function onNodeEnter(nodeId: string) {
  const ancestors = ancestorMap[nodeId] ?? new Set();
  const descendants = descendantMap[nodeId] ?? new Set();
  const highlighted = new Set([nodeId, ...ancestors, ...descendants]);

  setNodes(nodes => nodes.map(n => ({
    ...n,
    style: { ...n.style, opacity: highlighted.has(n.id) ? 1 : 0.2 },
  })));
  setEdges(edges => edges.map(e => ({
    ...e,
    style: {
      ...e.style,
      opacity: highlighted.has(e.source) && highlighted.has(e.target) ? 1 : 0.2,
      strokeWidth: highlighted.has(e.source) && highlighted.has(e.target) ? 3 : 1,
    },
  })));
}
```

**Complejidad:** O(V + E) por interacción, con V ≈ 80 y E ≈ 120 → negligible incluso sin throttling.

### 3.3 Barra de Resumen (Avance de Carrera)

Se mantiene el componente existente de avance (porcentaje, créditos, barra de progreso) como un overlay o panel superior fixed dentro del viewport del grafo. No es un nodo del grafo: es UI auxiliar flotante.

---

## 4. Rendimiento y Optimización de Renderizado

### 4.1 Elección de Stack: React Flow (@xyflow/react)

| Alternativa | Evaluación |
|---|---|
| **SVG puro** | ❌ Manejo manual de viewport, zoom, paneo, virtualización. ~3000 líneas de boilerplate. |
| **Canvas HTML5** | ❌ Pierde accesibilidad (no hay nodos en el DOM). Eventos de clic/hover requieren hit-testing manual. |
| **D3.js force layout** | ❌ Layout de fuerza no es determinista para un grafo de malla. Overkill para un DAG con posiciones predecibles. |
| **React Flow** | ✅ Viewport virtualizado (solo renderiza nodos en pantalla), zoom/paneo nativos, eventos de hover, edge routing, plugin de minimapa, accesible (nodos en DOM). ~45 KB gzipped. |

### 4.2 Estrategias de Rendimiento

| Estrategia | Dónde aplica | Impacto |
|---|---|---|
| `React.memo` | `CourseNode` — el componente de nodo custom | Evita re-renders de 80 nodos cuando solo 1 cambia |
| `useMemo` | Cálculo de posiciones, construcción de edges, mapas de ancestros/descendientes | Recalcula solo cuando `ciclos` cambia |
| `transform: translate3d(0,0,0)` | Contenedor del grafo | Fuerza composición en GPU, evita repaints |
| `will-change: transform` | Viewport de React Flow | El navegador promueve la capa a GPU antes del primer scroll |
| Virtualización | Nativa de React Flow — `onlyRenderVisibleElements` | Solo monta en DOM los ~15-20 nodos visibles, no los 80 |
| `nodesDraggable={false}` | Todos los nodos | Desactiva el cálculo de arrastre (innecesario para malla fija) |
| `elementsSelectable={false}` | Nodos | Reduce event listeners de selección |

### 4.3 Perfil de Carga

| Métrica | Acordeones actuales | DAG con React Flow |
|---|---|---|
| Nodos en DOM | ~80 (todos, siempre) | ~20 (visibles) |
| Tamaño de bundle | 0 KB extra | +45 KB gzipped |
| First paint | ~50ms | ~80ms |
| Interacción hover | N/A | ~5ms por evento |
| Memo re-renders evitados | 0 (no usa memo) | ~95% de nodos no re-renderizan |

---

## 5. Transformación de Datos y Contrato

### 5.1 API Actual (sin cambios)

`GET /api/malla` → `List[CicloDetail]`

El backend ya entrega todo lo necesario. **No se requiere ningún cambio en la API.** La transformación se hace 100% en el frontend.

### 5.2 Modelo de Grafo

```typescript
// ── Tipos de entrada (del backend) ──

interface CourseFromAPI {
  id: string;
  code: string;
  name: string;
  credits: number;
  status: "completed" | "in_progress" | "available" | "locked";
  progreso: number;
  prerequisitos: { id: string; code: string; name: string; completado: boolean }[];
  prerequisitos_faltantes: { id: string; code: string; name: string; completado: boolean }[];
  prerequisitos_cumplidos: boolean;
}

interface CicloFromAPI {
  ciclo: string;        // "Ciclo 3"
  ciclo_num: number;    // 3
  credits: number;
  courses: CourseFromAPI[];
}

// ── Tipos de salida (para React Flow) ──

interface GraphNode {
  id: string;
  type: "course";
  position: { x: number; y: number };
  data: CourseFromAPI & { ciclo: number };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "smoothstep";
  animated: boolean;
  style: React.CSSProperties;
  markerEnd: { type: MarkerType; color: string };
}

interface MallaGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

### 5.3 Función de Transformación Principal

```typescript
function transformarAMallaGraph(ciclos: CicloFromAPI[]): MallaGraph {
  // 1. Posiciones: un ciclo = una columna
  const posiciones = computeNodePositions(ciclos);

  // 2. Nodos
  const nodes: GraphNode[] = ciclos.flatMap((ciclo) =>
    ciclo.courses.map((curso) => ({
      id: curso.id,
      type: "course",
      position: posiciones.find((p) => p.id === curso.id)!,
      data: { ...curso, ciclo: ciclo.ciclo_num },
    }))
  );

  // 3. Aristas (solo prerrequisitos directos)
  const edges: GraphEdge[] = buildEdges(ciclos);

  // 4. Filtrar aristas cuyos extremos no están en los nodos (edge case defensivo)
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgesValidas = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes, edges: edgesValidas };
}
```

**Invariante:** La transformación es pura y determinista. Mismos datos de entrada → mismos nodos y aristas siempre.

---

## 6. Plan de Pruebas TDD

### 6.1 Herramientas

| Capa | Herramienta | Comando |
|---|---|---|
| Transformación de datos | Vitest (unitario) | `npx vitest run` |
| Renderizado de nodos | Vitest + @testing-library/react + jsdom | `npx vitest run` |
| Interacción (hover) | Vitest + @testing-library/user-event | `npx vitest run` |

### 6.2 Casos de Prueba

#### T1 — Transformación: malla vacía → grafo vacío

```typescript
test("malla sin ciclos produce grafo vacío", () => {
  const result = transformarAMallaGraph([]);
  expect(result.nodes).toHaveLength(0);
  expect(result.edges).toHaveLength(0);
});
```

#### T2 — Transformación: un ciclo, múltiples cursos sin prerrequisitos

```typescript
test("ciclo único con cursos sin prereqs produce nodos pero cero aristas", () => {
  const ciclos: CicloFromAPI[] = [{
    ciclo: "Ciclo 1", ciclo_num: 1, credits: 12,
    courses: [
      { id: "1", code: "MA-101", name: "Mate I", credits: 4, status: "available", progreso: 0, prerequisitos: [], prerequisitos_faltantes: [], prerequisitos_cumplidos: true },
      { id: "2", code: "FI-101", name: "Física I", credits: 4, status: "available", progreso: 0, prerequisitos: [], prerequisitos_faltantes: [], prerequisitos_cumplidos: true },
    ]
  }];

  const result = transformarAMallaGraph(ciclos);
  expect(result.nodes).toHaveLength(2);
  expect(result.edges).toHaveLength(0);
});
```

#### T3 — Transformación: prerrequisitos generan aristas correctas

```typescript
test("prerrequisito directo genera una arista source→target", () => {
  const ciclos: CicloFromAPI[] = [{
    ciclo: "Ciclo 1", ciclo_num: 1, credits: 8,
    courses: [
      { id: "1", code: "MA-101", name: "Mate I", credits: 4, status: "completed", progreso: 100, prerequisitos: [], prerequisitos_faltantes: [], prerequisitos_cumplidos: true },
      { id: "2", code: "MA-201", name: "Mate II", credits: 4, status: "locked", progreso: 0, prerequisitos: [{ id: "1", code: "MA-101", name: "Mate I", completado: true }], prerequisitos_faltantes: [], prerequisitos_cumplidos: true },
    ]
  }];

  const result = transformarAMallaGraph(ciclos);
  expect(result.edges).toHaveLength(1);
  expect(result.edges[0].source).toBe("1");
  expect(result.edges[0].target).toBe("2");
});
```

#### T4 — Transformación: posiciones por columna respetan orden de ciclo

```typescript
test("cursos del ciclo I están en X=0, ciclo II en X=220", () => {
  const ciclos = buildTwoCycleMalla();
  const { nodes } = transformarAMallaGraph(ciclos);
  const ciclo1Nodes = nodes.filter(n => n.data.ciclo === 1);
  const ciclo2Nodes = nodes.filter(n => n.data.ciclo === 2);

  ciclo1Nodes.forEach(n => expect(n.position.x).toBe(0));
  ciclo2Nodes.forEach(n => expect(n.position.x).toBe(220));
});
```

#### T5 — Transformación: IDs duplicados entre ciclos no generan nodos duplicados

```typescript
test("un mismo curso en dos ciclos distintos (error de datos) produce un solo nodo", () => {
  // Defensive: si el backend manda datos inconsistentes, no rompemos
  const ciclos = buildDuplicateCourseMalla();
  const { nodes } = transformarAMallaGraph(ciclos);
  const ids = nodes.map(n => n.id);
  expect(new Set(ids).size).toBe(ids.length); // sin duplicados
});
```

#### T6 — Renderizado: nodo completado muestra check e ícono verde

```typescript
test("curso completado renderiza BadgeCheck y estilo de completado", () => {
  render(<CourseNode data={completedCourse} />);
  expect(screen.getByTestId("badge-check")).toBeInTheDocument();
  expect(screen.getByText("APROBADO")).toBeInTheDocument();
});
```

#### T7 — Renderizado: nodo bloqueado muestra Lock y es no clickeable

```typescript
test("curso bloqueado muestra Lock y no dispara onClick", () => {
  const onClick = vi.fn();
  render(<CourseNode data={lockedCourse} onClick={onClick} />);
  expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button"));
  expect(onClick).not.toHaveBeenCalled();
});
```

#### T8 — Interacción: hover resalta ancestros

```typescript
test("hover sobre Mate III resalta Mate I y Mate II (sus ancestros)", async () => {
  const { nodes, edges } = buildThreeLevelPrereqGraph();
  render(<MallaGraph nodes={nodes} edges={edges} />);

  const mate3Node = screen.getByText("Mate III").closest("[data-id]")!;
  fireEvent.mouseEnter(mate3Node);

  // Mate I y Mate II deben tener opacidad 1
  const mate1 = screen.getByText("Mate I").closest("[data-id]")!;
  const mate2 = screen.getByText("Mate II").closest("[data-id]")!;
  expect(mate1).toHaveStyle({ opacity: "1" });
  expect(mate2).toHaveStyle({ opacity: "1" });
});
```

#### T9 — Interacción: hover resalta descendientes

```typescript
test("hover sobre Mate I resalta Mate II y Mate III (sus descendientes)", async () => {
  const { nodes, edges } = buildThreeLevelPrereqGraph();
  render(<MallaGraph nodes={nodes} edges={edges} />);

  fireEvent.mouseEnter(screen.getByText("Mate I").closest("[data-id]")!);

  expect(screen.getByText("Mate II").closest("[data-id]")).toHaveStyle({ opacity: "1" });
  expect(screen.getByText("Mate III").closest("[data-id]")).toHaveStyle({ opacity: "1" });
});
```

#### T10 — Interacción: nodos no relacionados bajan opacidad

```typescript
test("hover sobre un curso atenúa cursos sin relación de prerequisito", async () => {
  const { nodes, edges } = buildMixedPrereqGraph(); // Mate → Física sin relación
  render(<MallaGraph nodes={nodes} edges={edges} />);

  fireEvent.mouseEnter(screen.getByText("Mate I").closest("[data-id]")!);

  expect(screen.getByText("Física I").closest("[data-id]")).toHaveStyle({ opacity: "0.2" });
});
```

#### T11 — Mapa de ancestros: BFS transitivo

```typescript
test("buildAncestorMap resuelve cadena transitiva A→B→C", () => {
  const prereqMap = { "C": ["B"], "B": ["A"], "A": [] };
  const map = buildAncestorMap(prereqMap);
  expect(map["C"]).toEqual(new Set(["B", "A"]));
  expect(map["B"]).toEqual(new Set(["A"]));
  expect(map["A"]).toEqual(new Set());
});
```

#### T12 — Mapa de descendientes: inverso del grafo

```typescript
test("buildDescendantMap resuelve cadena A→B→C", () => {
  const prereqMap = { "C": ["B"], "B": ["A"], "A": [] };
  const map = buildDescendantMap(prereqMap);
  expect(map["A"]).toEqual(new Set(["B", "C"]));
  expect(map["B"]).toEqual(new Set(["C"]));
  expect(map["C"]).toEqual(new Set());
});
```

### 6.3 Orden de Ejecución TDD

```
T1 → T2 → T3 → T4 → T5   (transformación de datos)
   ↓
T11 → T12                 (mapas de ancestros/descendientes)
   ↓
T6 → T7                   (renderizado de nodos)
   ↓
T8 → T9 → T10             (interacción hover)
```

Cada fase produce tests rojos primero, luego la implementación que los pone verdes, antes de pasar a la fase siguiente.

---

## 7. Estructura de Archivos Propuesta

```
frontend/
├── components/
│   ├── malla-curricular.tsx          ← REEMPLAZAR: wrapper del grafo
│   ├── malla-course-card.tsx         ← ARCHIVAR (reemplazado por CourseNode)
│   └── malla-graph/
│       ├── MallaGraph.tsx            ← Componente principal (ReactFlow provider)
│       ├── CourseNode.tsx            ← Custom node renderer
│       ├── MallaGraphAvance.tsx      ← Overlay de avance de carrera
│       ├── transformMalla.ts         ← transformarAMallaGraph() + computeNodePositions()
│       ├── prereqMaps.ts             ← buildAncestorMap() + buildDescendantMap()
│       └── constants.ts              ← COLUMN_WIDTH, NODE_HEIGHT, colores por estado
├── app/malla/page.tsx                ← MODIFICAR: usar MallaGraph en vez de MallaCurricular
└── __tests__/
    └── malla-graph/
        ├── transformMalla.test.ts    ← T1–T5
        ├── prereqMaps.test.ts        ← T11–T12
        ├── CourseNode.test.tsx       ← T6–T7
        └── MallaGraph.test.tsx       ← T8–T10
```

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| React Flow no maneja bien 80+ nodos en móvil | Baja | Medio | Virtualización nativa; test en dispositivo real antes de deploy |
| Aristas muy densas en ciclos avanzados (muchos prerrequisitos) | Media | Bajo | `smoothstep` ya maneja bien aristas paralelas; si es insuficiente, usar `bezier` con offset dinámico |
| Bundle size (+45 KB) afecta LCP en conexiones lentas | Baja | Bajo | React Flow ya se carga lazy en la ruta `/malla`; no afecta la landing |
| Regresión visual para usuarios acostumbrados al acordeón | Alta | Bajo | Mantener la vista de acordeón como fallback (`?view=list`) durante 1 sprint de transición |
| El backend cambia el schema de `CicloDetail` | Baja | Alto | La transformación falla en tiempo de build (TypeScript) o en tests (T1–T5) antes de llegar a prod |

---

## 9. Estimación

| Fase | Tareas | Esfuerzo estimado |
|---|---|---|
| Transformación de datos | `transformMalla.ts` + tests T1–T5 | 2–3 horas |
| Mapas de prerequisitos | `prereqMaps.ts` + tests T11–T12 | 1–2 horas |
| Nodo custom | `CourseNode.tsx` + tests T6–T7 | 2–3 horas |
| Grafo + interacción hover | `MallaGraph.tsx` + tests T8–T10 | 3–4 horas |
| Integración en página | Modificar `malla/page.tsx` | 1 hora |
| Overlay de avance | `MallaGraphAvance.tsx` | 1 hora |
| **Total** | | **10–14 horas** |

---

## 10. Dependencias

```json
{
  "dependencies": {
    "@xyflow/react": "^12.x"
  }
}
```

Ninguna otra dependencia nueva. `@xyflow/react` es la evolución de `reactflow` (v12, 2024+) con mejor tree-shaking y soporte para React 19.

---

## 11. Validación de Especificación

### ¿Es suficiente para que otro desarrollador la ejecute con TDD estricto?

| Criterio | Estado |
|---|---|
| Tipos de datos de entrada y salida definidos | ✅ Sección 5.2 |
| Algoritmo de layout explicado | ✅ Sección 2.2, con pseudocódigo |
| Comportamiento de interacción especificado | ✅ Sección 3.2, con código de handlers |
| Casos de prueba con assertions concretas | ✅ Sección 6.2, 12 tests con código |
| Orden de implementación TDD definido | ✅ Sección 6.3 |
| Stack tecnológico justificado | ✅ Sección 4.1, tabla comparativa |
| Estrategia de rendimiento | ✅ Sección 4.2 |
| Estructura de archivos | ✅ Sección 7 |
| Plan de rollback | ✅ Sección 8, vista de acordeón como fallback |
| Sin dependencia de cambios en backend | ✅ Sección 5.1 — la API actual ya entrega todo |
