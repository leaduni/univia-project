import { describe, expect, test } from "vitest"
import type { Edge } from "@xyflow/react"
import { layoutPrerequisites, roundedRoute, type RoutePoint } from "../edgeRouting"
import { NODE_WIDTH } from "../constants"

function fixture(cycles: number) {
  const columns = Array.from({ length: cycles }, (_, col) =>
    Array.from({ length: 3 + col % 5 }, (_, row) => `${col}-${row}`),
  )
  const edges: Edge[] = []
  const connect = (source: string, target: string) => edges.push({ id: `${source}->${target}`, source, target })
  columns.forEach((ids, col) => ids.forEach((target, row) => {
    if (col > 0) {
      connect(columns[col - 1][row % columns[col - 1].length], target)
      connect(columns[col - 1][(row + 1) % columns[col - 1].length], target)
    }
    if (col > 1) connect(columns[col - 2][0], target)
  }))
  connect(columns[0][0], columns[0][1])
  connect(columns[cycles - 1][0], columns[0][2])
  return { columns, edges }
}

function overlap(a: number, b: number, c: number, d: number) {
  return Math.min(Math.max(a, b), Math.max(c, d)) - Math.max(Math.min(a, b), Math.min(c, d)) > 0.01
}

describe.each([2, 6, 10, 12])("malla de %i ciclos", (cycles) => {
  const { columns, edges } = fixture(cycles)
  const graph = layoutPrerequisites(columns, edges)

  test("ninguna flecha atraviesa el interior de una tarjeta", () => {
    for (const edge of graph.edges) {
      const points = edge.data!.points
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]
        const b = points[i]
        for (const position of graph.positions.values()) {
          const inside = a.x === b.x
            ? a.x > position.x && a.x < position.x + NODE_WIDTH && overlap(a.y, b.y, position.y, position.y + graph.height)
            : a.y > position.y && a.y < position.y + graph.height && overlap(a.x, b.x, position.x, position.x + NODE_WIDTH)
          expect(inside, `${edge.id}: ${JSON.stringify([a, b, position])}`).toBe(false)
        }
      }
    }
  })

  test("dos conexiones no comparten tramos de línea ni puntos de entrada", () => {
    const segments: { edge: string; a: RoutePoint; b: RoutePoint }[] = []
    for (const edge of graph.edges) {
      const points = edge.data!.points
      for (let i = 1; i < points.length; i++) segments.push({ edge: edge.id, a: points[i - 1], b: points[i] })
    }
    for (let i = 0; i < segments.length; i++) {
      const one = segments[i]
      for (let j = i + 1; j < segments.length; j++) {
        const two = segments[j]
        if (one.edge === two.edge) continue
        const shared = one.a.x === one.b.x && two.a.x === two.b.x && one.a.x === two.a.x
          ? overlap(one.a.y, one.b.y, two.a.y, two.b.y)
          : one.a.y === one.b.y && two.a.y === two.b.y && one.a.y === two.a.y && overlap(one.a.x, one.b.x, two.a.x, two.b.x)
        expect(shared, `${one.edge} y ${two.edge}`).toBe(false)
      }
    }
    for (const ports of graph.targetPorts.values()) {
      expect(new Set(ports.map((port) => port.top)).size).toBe(ports.length)
      expect(ports.every((port) => port.top > 0 && port.top < graph.height)).toBe(true)
    }
  })

  test("conserva las relaciones y produce rutas deterministas", () => {
    expect(graph.edges).toHaveLength(edges.length)
    expect(layoutPrerequisites(columns, edges).edges).toEqual(graph.edges)
    for (const edge of graph.edges) expect(roundedRoute(edge.data!.points)).not.toMatch(/NaN|Infinity/)
  })
})

test("descarta relaciones inválidas y repetidas sin producir flechas huérfanas", () => {
  const edge = { id: "a-b", source: "a", target: "b" }
  const graph = layoutPrerequisites([["a"], ["b"]], [edge, edge, { id: "a-c", source: "a", target: "c" }])
  expect(graph.edges.map((item) => item.id)).toEqual(["a-b"])
  expect(layoutPrerequisites([], []).edges).toEqual([])
})
