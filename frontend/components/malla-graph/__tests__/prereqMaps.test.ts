// Tests de los mapas de prerrequisitos (T11–T12 de la spec).
import { describe, expect, test } from "vitest"
import type { CicloDetail, CourseDetail } from "@/types/malla"
import { buildAncestorMap, buildDescendantMap, buildPostMap, buildPrereqMap } from "../prereqMaps"

function curso(id: string, prereqIds: string[]): CourseDetail {
  return {
    id,
    code: id,
    name: id,
    credits: 4,
    status: "available",
    progreso: 0,
    prerequisitos: prereqIds.map((p) => ({ id: p, code: p, name: p, completado: true })),
    prerequisitos_faltantes: [],
    prerequisitos_cumplidos: true,
  }
}

function mallaDeCursos(rows: { id: string; pre: string[] }[]): CicloDetail[] {
  return [
    {
      ciclo: "Ciclo 1",
      ciclo_num: 1,
      credits: 0,
      resumen: { total: 0, aprobados: 0, en_curso: 0, disponibles: 0, bloqueados: 0, creditos_aprobados: 0 },
      courses: rows.map((r) => curso(r.id, r.pre)),
    },
  ]
}

// T11
test("buildAncestorMap resuelve cadena transitiva A→B→C", () => {
  const prereqMap = { C: ["B"], B: ["A"], A: [] }
  const map = buildAncestorMap(prereqMap)
  expect(map["C"]).toEqual(new Set(["B", "A"]))
  expect(map["B"]).toEqual(new Set(["A"]))
  expect(map["A"]).toEqual(new Set())
})

// T12
test("buildDescendantMap resuelve cadena A→B→C", () => {
  const prereqMap = { C: ["B"], B: ["A"], A: [] }
  const map = buildDescendantMap(prereqMap)
  expect(map["A"]).toEqual(new Set(["B", "C"]))
  expect(map["B"]).toEqual(new Set(["C"]))
  expect(map["C"]).toEqual(new Set())
})

test("buildPrereqMap y buildPostMap derivan del payload de /malla", () => {
  const ciclos = mallaDeCursos([
    { id: "1", pre: [] },
    { id: "2", pre: ["1"] },
  ])
  const prereqMap = buildPrereqMap(ciclos)
  expect(prereqMap["2"]).toEqual(["1"])
  expect(prereqMap["1"]).toEqual([])

  const postMap = buildPostMap(prereqMap)
  expect(postMap["1"]).toEqual(["2"])
  expect(postMap["2"]).toBeUndefined()
})

test("ciclos sin préstamos no producen relaciones", () => {
  const prereqMap = { A: [], B: [] }
  expect(buildAncestorMap(prereqMap)["A"]).toEqual(new Set())
  expect(buildDescendantMap(prereqMap)["A"]).toEqual(new Set())
})