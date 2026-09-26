import type { Edge } from "@xyflow/react"
import { COLUMN_WIDTH, NODE_HEIGHT, NODE_WIDTH, VERTICAL_GAP } from "./constants"

export interface CoursePort {
  id: string
  top: number
}

export interface RoutePoint {
  x: number
  y: number
}

export interface PrerequisiteEdgeData extends Record<string, unknown> {
  points: RoutePoint[]
}

const LANE_GAP = 12
const PORT_GAP = 16
const MARGIN = 16

/**
 * Cada conexión tiene sus propios puertos y carriles. Las conexiones que
 * saltan ciclos rodean el conjunto de tarjetas por arriba o por abajo.
 * No se depende del código de carrera ni del número de ciclos.
 */
export function layoutPrerequisites(columns: string[][], inputEdges: Edge[]) {
  const location = new Map<string, { column: number; row: number }>()
  columns.forEach((ids, column) => ids.forEach((id, row) => {
    if (!location.has(id)) location.set(id, { column, row })
  }))

  const seen = new Set<string>()
  const edges = inputEdges.filter((edge) => {
    if (edge.source === edge.target || !location.has(edge.source) || !location.has(edge.target) || seen.has(edge.id)) return false
    seen.add(edge.id)
    return true
  }).sort((a, b) => a.id.localeCompare(b.id))

  const outgoing = new Map<string, Edge[]>()
  const incoming = new Map<string, Edge[]>()
  const lanes = new Map<number, string[]>()
  const addLane = (gap: number, id: string) => {
    const ids = lanes.get(gap) ?? []
    ids.push(id)
    lanes.set(gap, ids)
  }
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge])
    const sourceGap = location.get(edge.source)!.column
    const targetGap = location.get(edge.target)!.column - 1
    addLane(sourceGap, edge.id)
    if (targetGap !== sourceGap) addLane(targetGap, edge.id)
  }

  const maxDegree = Math.max(0, ...[...outgoing.values(), ...incoming.values()].map((list) => list.length))
  const height = Math.max(NODE_HEIGHT, (maxDegree + 2) * PORT_GAP)
  const columnX: number[] = [0]
  for (let col = 1; col < columns.length; col++) {
    const gapWidth = Math.max(COLUMN_WIDTH - NODE_WIDTH, MARGIN * 2 + ((lanes.get(col - 1)?.length ?? 0) + 1) * LANE_GAP)
    columnX[col] = columnX[col - 1] + NODE_WIDTH + gapWidth
  }
  const positions = new Map<string, RoutePoint>()
  for (const [id, { column, row }] of location) {
    positions.set(id, { x: columnX[column], y: row * (height + VERTICAL_GAP) })
  }

  const sourcePorts = new Map<string, CoursePort[]>()
  const targetPorts = new Map<string, CoursePort[]>()
  for (const [id, list] of outgoing) {
    const start = Math.floor((height - (list.length - 1) * PORT_GAP) / (2 * PORT_GAP)) * PORT_GAP
    sourcePorts.set(id, list.map((edge, index) => ({ id: edge.id, top: start + index * PORT_GAP })))
  }
  for (const [id, list] of incoming) {
    const start = Math.floor((height - (list.length - 1) * PORT_GAP) / (2 * PORT_GAP)) * PORT_GAP
    // Intercalar entradas y salidas evita tramos horizontales coincidentes.
    targetPorts.set(id, list.map((edge, index) => ({ id: edge.id, top: start + PORT_GAP / 2 + index * PORT_GAP })))
  }

  const laneX = (gap: number, id: string) => {
    const index = lanes.get(gap)!.indexOf(id)
    return gap < 0
      ? -MARGIN - (index + 1) * LANE_GAP
      : columnX[gap] + NODE_WIDTH + MARGIN + (index + 1) * LANE_GAP
  }
  const bottom = Math.max(0, ...Array.from(positions.values(), (point) => point.y + height))
  let topLane = 0
  let bottomLane = 0
  const routedEdges: Edge<PrerequisiteEdgeData>[] = edges.map((edge) => {
    const source = positions.get(edge.source)!
    const target = positions.get(edge.target)!
    const sourceGap = location.get(edge.source)!.column
    const targetGap = location.get(edge.target)!.column - 1
    const sourceY = source.y + sourcePorts.get(edge.source)!.find((port) => port.id === edge.id)!.top
    const targetY = target.y + targetPorts.get(edge.target)!.find((port) => port.id === edge.id)!.top
    const sourceLane = laneX(sourceGap, edge.id)
    const targetLane = laneX(targetGap, edge.id)
    const points: RoutePoint[] = [
      { x: source.x + NODE_WIDTH, y: sourceY },
      { x: sourceLane, y: sourceY },
    ]
    if (sourceGap !== targetGap) {
      const outerY = (sourceY + targetY) / 2 < bottom / 2
        ? -72 - topLane++ * LANE_GAP
        : bottom + 32 + bottomLane++ * LANE_GAP
      points.push({ x: sourceLane, y: outerY }, { x: targetLane, y: outerY })
    }
    points.push({ x: targetLane, y: targetY }, { x: target.x, y: targetY })
    return {
      ...edge,
      type: "prerequisite",
      sourceHandle: edge.id,
      targetHandle: edge.id,
      data: { points },
    }
  })
  return { positions, height, sourcePorts, targetPorts, edges: routedEdges }
}

/** Curvas cortas en las esquinas, sin salirse del corredor de cada arista. */
export function roundedRoute(points: RoutePoint[], radius = 5): string {
  if (!points.length) return ""
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1]
    const point = points[i]
    const next = points[i + 1]
    const before = Math.hypot(point.x - previous.x, point.y - previous.y)
    const after = Math.hypot(next.x - point.x, next.y - point.y)
    if (!before || !after) continue
    const r = Math.min(radius, before / 2, after / 2)
    const entry = { x: point.x + (previous.x - point.x) * r / before, y: point.y + (previous.y - point.y) * r / before }
    const exit = { x: point.x + (next.x - point.x) * r / after, y: point.y + (next.y - point.y) * r / after }
    path += ` L ${entry.x} ${entry.y} Q ${point.x} ${point.y} ${exit.x} ${exit.y}`
  }
  const end = points[points.length - 1]
  return `${path} L ${end.x} ${end.y}`
}
