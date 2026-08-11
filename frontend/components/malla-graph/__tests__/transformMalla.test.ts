// Tests de la transformación a grafo (T1–T5 de la spec) y de la lógica de
// presentación por selección/hover/filtro (T8–T10 de la spec, adaptados a
// funciones puras para no depender del DOM de React Flow en jsdom).
import { describe, expect, test } from "vitest"
import type { CicloDetail, CourseDetail } from "@/types/malla"
import {
  computeStats,
  resolveEdgePresentation,
  resolveHighlight,
  transformarAMallaGraph,
} from "../transformMalla"

function curso(partial: Partial<CourseDetail> & { id: string }): CourseDetail {
  return {
    code: `C${partial.id}`,
    name: `Curso ${partial.id}`,
    credits: 4,
    status: "available",
    progreso: 0,
    prerequisitos: [],
    prerequisitos_faltantes: [],
    prerequisitos_cumplidos: true,
    ...partial,
  }
}

function ciclo(ciclo_num: number, courses: CourseDetail[]): CicloDetail {
  return {
    ciclo: `Ciclo ${ciclo_num}`,
    ciclo_num,
    credits: 0,
    resumen: {
      total: 0,
      aprobados: 0,
      en_curso: 0,
      disponibles: 0,
      bloqueados: 0,
      creditos_aprobados: 0,
    },
    courses,
  }
}

// T1
test("malla sin ciclos produce grafo vacío", () => {
  const { nodes, edges } = transformarAMallaGraph([])
  expect(nodes).toHaveLength(0)
  expect(edges).toHaveLength(0)
})

// T2
test("ciclo único con cursos sin prereqs produce nodos pero cero aristas", () => {
  const ciclos = [ciclo(1, [curso({ id: "1" }), curso({ id: "2" })])]
  const { nodes, edges } = transformarAMallaGraph(ciclos)
  expect(nodes).toHaveLength(2)
  expect(edges).toHaveLength(0)
})

// T3
test("prerrequisito directo genera una arista source→target", () => {
  const ciclos = [
    ciclo(1, [
      curso({ id: "1", status: "completed" }),
      curso({
        id: "2",
        status: "locked",
        prerequisitos: [{ id: "1", code: "C1", name: "Curso 1", completado: true }],
      }),
    ]),
  ]
  const { edges } = transformarAMallaGraph(ciclos)
  expect(edges).toHaveLength(1)
  expect(edges[0].source).toBe("1")
  expect(edges[0].target).toBe("2")
})

// T4
test("cursos del ciclo I están en X=0, ciclo II en X=220", () => {
  const ciclos = [ciclo(1, [curso({ id: "1" })]), ciclo(2, [curso({ id: "2" })])]
  const { nodes } = transformarAMallaGraph(ciclos)
  expect(nodes.find((n) => n.id === "1")?.position.x).toBe(0)
  expect(nodes.find((n) => n.id === "2")?.position.x).toBe(220)
})

// T5
test("un mismo curso en dos ciclos distintos produce un solo nodo", () => {
  const ciclos = [ciclo(1, [curso({ id: "1" })]), ciclo(2, [curso({ id: "1" })])]
  const { nodes } = transformarAMallaGraph(ciclos)
  const ids = nodes.map((n) => n.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test("cada ciclo con cursos emite una etiqueta de columna", () => {
  const ciclos = [ciclo(1, [curso({ id: "1" }), curso({ id: "2" })]), ciclo(2, [curso({ id: "3" })])]
  const { labels } = transformarAMallaGraph(ciclos)
  expect(labels).toHaveLength(2)
  expect(labels[0].data.ciclo_num).toBe(1)
  expect(labels[0].position.x).toBe(0)
  expect(labels[1].data.ciclo_num).toBe(2)
  expect(labels[1].position.x).toBe(220)
})

test("computeStats suma créditos y cuenta estados", () => {
  const ciclos = [
    ciclo(1, [
      curso({ id: "1", credits: 5, status: "completed" }),
      curso({ id: "2", credits: 3, status: "in_progress" }),
      curso({ id: "3", credits: 4, status: "locked" }),
    ]),
  ]
  const stats = computeStats(ciclos)
  expect(stats.aprobadosCR).toBe(5)
  expect(stats.enCursoCR).toBe(3)
  expect(stats.totalCR).toBe(12)
  expect(stats.totalCursos).toBe(3)
  expect(stats.conteoPorEstado).toEqual({ completed: 1, in_progress: 1, available: 0, locked: 1 })
  expect(stats.porcentaje).toBe(Math.round((5 / 12) * 100))
})

// ── Resaltado por hover/selección (T8–T10 adaptados a lógica pura) ──
// Cadena: 1 -> 2 -> 3 (prereqMap: {2:[1], 3:[2], 1:[]})
const ancestors = { "3": new Set(["2", "1"]), "2": new Set(["1"]), "1": new Set() }
const descendants = { "1": new Set(["2", "3"]), "2": new Set(["3"]), "3": new Set() }

test("hover sobre un curso resalta sus ancestros y atenúa no relacionados", () => {
  const opts = { hoverId: "3", selectedId: null, filter: null, ancestors, descendants }
  expect(resolveHighlight("3", "available", opts).highlight).toBe("self")
  expect(resolveHighlight("2", "available", opts)).toEqual({ highlight: "pre", opacity: 1 })
  expect(resolveHighlight("1", "available", opts)).toEqual({ highlight: "pre", opacity: 1 })
  expect(resolveHighlight("99", "available", opts)).toEqual({ highlight: null, opacity: 0.2 })
})

test("hover sobre un curso resalta sus descendientes", () => {
  const opts = { hoverId: "1", selectedId: null, filter: null, ancestors, descendants }
  expect(resolveHighlight("2", "available", opts)).toEqual({ highlight: "post", opacity: 1 })
  expect(resolveHighlight("3", "available", opts)).toEqual({ highlight: "post", opacity: 1 })
})

test("nodos que no coinciden con el filtro bajan a 0.15", () => {
  const opts = { hoverId: null, selectedId: null, filter: "completed" as const, ancestors, descendants }
  expect(resolveHighlight("1", "completed", opts)).toEqual({ highlight: null, opacity: undefined })
  expect(resolveHighlight("2", "locked", opts)).toEqual({ highlight: null, opacity: 0.15 })
})

test("aristas fuera de la cadena se atenúan al hacer hover", () => {
  const opts = { hoverId: "2", selectedId: null, ancestors, descendants }
  const presentada = resolveEdgePresentation({ id: "x->y", source: "x", target: "y" }, opts)
  expect(presentada.style?.opacity).toBe(0.12)
})

test("aristas de la cadena se mantienen visibles y con grosor 3", () => {
  const opts = { hoverId: "3", selectedId: null, ancestors, descendants }
  const presentada = resolveEdgePresentation({ id: "2->3", source: "2", target: "3" }, opts)
  expect(presentada.style?.opacity).toBe(1)
  expect(presentada.style?.strokeWidth).toBe(3)
})

test("sin hover ni selección las aristas no cambian", () => {
  const edge = { id: "2->3", source: "2", target: "3", style: { stroke: "#7957f1" } }
  const presentada = resolveEdgePresentation(edge, { hoverId: null, selectedId: null, ancestors, descendants })
  expect(presentada).toBe(edge)
})