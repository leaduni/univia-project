// Transformación pura de la malla del backend al grafo de React Flow.
// Mismas entradas -> mismos nodos/aristas siempre (spec malla-graph §5.3).
// Sin efectos ni accesos a red: todo es derivable del payload de GET /malla.
import { MarkerType, type Edge, type Node } from "@xyflow/react"
import type { CicloDetail, CourseDetail, StatusCurso } from "@/types/malla"
import {
  COLUMN_WIDTH,
  EDGE_COLOR_PREREQ_OK,
  EDGE_COLOR_PREREQ_PENDING,
  NODE_HEIGHT,
  VERTICAL_GAP,
} from "./constants"

export type NodeHighlight = "self" | "pre" | "post"

export interface CourseNodeData extends CourseDetail {
  ciclo: number
  highlight?: NodeHighlight | null
}

export type CourseNodeType = Node<CourseNodeData, "course">

export interface CycleLabelData {
  ciclo_num: number
  ciclo: string
  credits: number
}

export type CycleLabelNode = Node<CycleLabelData, "cycleLabel">

export interface MallaGraphResult {
  nodes: CourseNodeType[]
  labels: CycleLabelNode[]
  edges: Edge[]
}

export interface MallaStats {
  aprobadosCR: number
  enCursoCR: number
  totalCR: number
  porcentaje: number
  totalCursos: number
  conteoPorEstado: Record<StatusCurso, number>
}

interface HighlightOptions {
  hoverId: string | null
  selectedId: string | null
  filter: StatusCurso | null
  ancestors: Record<string, Set<string>>
  descendants: Record<string, Set<string>>
}

/** Posiciones deterministas: un ciclo = una columna, cursos centrados en Y. */
export function computeNodePositions(
  ciclos: CicloDetail[],
): Record<string, { x: number; y: number }> {
  const posiciones: Record<string, { x: number; y: number }> = {}
  ciclos.forEach((ciclo, colIndex) => {
    const cursos = ciclo.courses
    const totalHeight =
      cursos.length * NODE_HEIGHT + Math.max(cursos.length - 1, 0) * VERTICAL_GAP
    cursos.forEach((curso, rowIndex) => {
      posiciones[curso.id] = {
        x: colIndex * COLUMN_WIDTH,
        y: rowIndex * (NODE_HEIGHT + VERTICAL_GAP) - totalHeight / 2,
      }
    })
  })
  return posiciones
}

/** Etiquetas de ciclo: una por columna, justo encima de su primer curso. */
export function computeLabelPositions(
  ciclos: CicloDetail[],
): Record<number, { x: number; y: number }> {
  const posiciones: Record<number, { x: number; y: number }> = {}
  ciclos.forEach((ciclo, colIndex) => {
    const cursos = ciclo.courses
    if (cursos.length === 0) return
    const totalHeight =
      cursos.length * NODE_HEIGHT + Math.max(cursos.length - 1, 0) * VERTICAL_GAP
    posiciones[ciclo.ciclo_num] = {
      x: colIndex * COLUMN_WIDTH,
      y: -totalHeight / 2 - 44,
    }
  })
  return posiciones
}

/** Aristas: solo prerrequisitos directos (RF-06), con estilo semántico. */
export function buildEdges(ciclos: CicloDetail[]): Edge[] {
  const edges: Edge[] = []
  ciclos.forEach((ciclo) => {
    ciclo.courses.forEach((curso) => {
      curso.prerequisitos.forEach((prereq) => {
        const completado = prereq.completado
        edges.push({
          id: `${prereq.id}->${curso.id}`,
          source: prereq.id,
          target: curso.id,
          type: "smoothstep",
          animated: curso.status === "in_progress",
          style: {
            stroke: completado ? EDGE_COLOR_PREREQ_OK : EDGE_COLOR_PREREQ_PENDING,
            strokeWidth: 2,
            strokeDasharray: completado ? undefined : "6 4",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: completado ? EDGE_COLOR_PREREQ_OK : EDGE_COLOR_PREREQ_PENDING,
          },
        })
      })
    })
  })
  return edges
}

/** Transforma los ciclos del backend en nodos + aristas de React Flow. */
export function transformarAMallaGraph(ciclos: CicloDetail[]): MallaGraphResult {
  const posiciones = computeNodePositions(ciclos)
  const vistos = new Set<string>()
  const nodes: CourseNodeType[] = []

  ciclos.forEach((ciclo) => {
    ciclo.courses.forEach((curso) => {
      // Defensivo: un mismo curso en dos ciclos no debe duplicar el nodo.
      if (vistos.has(curso.id)) return
      vistos.add(curso.id)
      const pos = posiciones[curso.id] ?? { x: 0, y: 0 }
      nodes.push({
        id: curso.id,
        type: "course",
        position: pos,
        data: { ...curso, ciclo: ciclo.ciclo_num },
      })
    })
  })

  // Solo aristas cuyos extremos existen como nodo (edge case defensivo).
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = buildEdges(ciclos).filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  )

  const labelPositions = computeLabelPositions(ciclos)
  const labels: CycleLabelNode[] = ciclos
    .filter((ciclo) => ciclo.courses.length > 0)
    .map((ciclo) => ({
      id: `ciclo-${ciclo.ciclo_num}`,
      type: "cycleLabel",
      position: labelPositions[ciclo.ciclo_num] ?? { x: 0, y: 0 },
      data: { ciclo_num: ciclo.ciclo_num, ciclo: ciclo.ciclo, credits: ciclo.credits },
    }))

  return { nodes, labels, edges }
}

/** Índice id -> datos del curso (para el panel lateral y "Desbloquea"). */
export function buildCourseIndex(ciclos: CicloDetail[]): Map<string, CourseNodeData> {
  const index = new Map<string, CourseNodeData>()
  ciclos.forEach((ciclo) => {
    ciclo.courses.forEach((curso) => {
      if (!index.has(curso.id)) index.set(curso.id, { ...curso, ciclo: ciclo.ciclo_num })
    })
  })
  return index
}

/** Estadísticas del plan: créditos por estado, totales y porcentaje. */
export function computeStats(ciclos: CicloDetail[]): MallaStats {
  let aprobadosCR = 0
  let enCursoCR = 0
  let totalCR = 0
  let totalCursos = 0
  const conteoPorEstado: MallaStats["conteoPorEstado"] = {
    completed: 0,
    in_progress: 0,
    available: 0,
    locked: 0,
  }

  ciclos.forEach((ciclo) => {
    ciclo.courses.forEach((curso) => {
      totalCR += curso.credits
      totalCursos += 1
      if (curso.status === "completed") aprobadosCR += curso.credits
      if (curso.status === "in_progress") enCursoCR += curso.credits
      conteoPorEstado[curso.status] += 1
    })
  })

  return {
    aprobadosCR,
    enCursoCR,
    totalCR,
    porcentaje: totalCR ? Math.round((aprobadosCR / totalCR) * 100) : 0,
    totalCursos,
    conteoPorEstado,
  }
}

/**
 * Presentación de un nodo según filtro y resaltado (hover o selección).
 *
 * Prioridades:
 * 1. Filtro activo: los que no coinciden se atenúan a 0.15.
 * 2. Resaltado activo (hover o selección): la cadena (self/pre/post) queda a
 *    opacidad 1; el resto baja a 0.2 salvo que el filtro ya lo atenúe.
 */
export function resolveHighlight(
  nodeId: string,
  status: StatusCurso,
  opts: HighlightOptions,
): { highlight: NodeHighlight | null; opacity: number | undefined } {
  const { hoverId, selectedId, filter, ancestors, descendants } = opts
  const activo = hoverId ?? selectedId
  const noCoincideFiltro = filter !== null && status !== filter
  let opacity: number | undefined = noCoincideFiltro ? 0.15 : undefined

  if (!activo) return { highlight: null, opacity }

  if (nodeId === activo) return { highlight: "self", opacity: 1 }
  if ((ancestors[activo] ?? EMPTY_SET).has(nodeId)) return { highlight: "pre", opacity: 1 }
  if ((descendants[activo] ?? EMPTY_SET).has(nodeId)) return { highlight: "post", opacity: 1 }

  return { highlight: null, opacity: noCoincideFiltro ? 0.15 : 0.2 }
}

const EMPTY_SET = new Set<string>()

/** Presentación de una arista: atenúa las que no pertenecen a la cadena. */
export function resolveEdgePresentation(
  edge: Edge,
  opts: Omit<HighlightOptions, "filter">,
): Edge {
  const { hoverId, selectedId, ancestors, descendants } = opts
  const activo = hoverId ?? selectedId
  if (!activo) return edge

  const cadena = new Set<string>([
    activo,
    ...(ancestors[activo] ?? []),
    ...(descendants[activo] ?? []),
  ])
  const activa = cadena.has(edge.source) && cadena.has(edge.target)

  if (!activa) {
    return { ...edge, style: { ...(edge.style ?? {}), opacity: 0.12 } }
  }
  return { ...edge, style: { ...(edge.style ?? {}), opacity: 1, strokeWidth: 3 } }
}
