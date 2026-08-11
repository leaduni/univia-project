// Mapas de prerrequisitos derivados de la malla (puros y testables).
// El prototipo los construye a mano; aquí salen del payload de GET /malla.
import type { CicloDetail } from "@/types/malla"

/** curso -> prerrequisitos DIRECTOS (ids), en el orden en que vienen. */
export function buildPrereqMap(ciclos: CicloDetail[]): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  ciclos.forEach((ciclo) => {
    ciclo.courses.forEach((curso) => {
      map[curso.id] = curso.prerequisitos.map((p) => p.id)
    })
  })
  return map
}

/**
 * curso -> TODOS sus prerrequisitos transitivos (directos e indirectos).
 * BFS sobre el grafo dirigido "curso depende de prerrequisito".
 */
export function buildAncestorMap(
  prereqMap: Record<string, string[]>,
): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {}
  Object.keys(prereqMap).forEach((id) => {
    const visited = new Set<string>()
    const queue = [...(prereqMap[id] ?? [])]
    while (queue.length) {
      const pid = queue.shift()!
      if (visited.has(pid)) continue
      visited.add(pid)
      ;(prereqMap[pid] ?? []).forEach((x) => queue.push(x))
    }
    result[id] = visited
  })
  return result
}

/**
 * curso -> TODOS los cursos para los que es prerrequisito (transitivo).
 * Recorre el grafo invertido (post-map) hasta agotar descendientes.
 */
export function buildDescendantMap(
  prereqMap: Record<string, string[]>,
): Record<string, Set<string>> {
  const post = buildPostMap(prereqMap)
  const result: Record<string, Set<string>> = {}
  Object.keys(prereqMap).forEach((id) => {
    const visited = new Set<string>()
    const queue = [...(post[id] ?? [])]
    while (queue.length) {
      const next = queue.shift()!
      if (visited.has(next)) continue
      visited.add(next)
      ;(post[next] ?? []).forEach((x) => queue.push(x))
    }
    result[id] = visited
  })
  return result
}

/** curso -> cursos que dependen DIRECTAMENTE de él (inverso de prereqMap). */
export function buildPostMap(prereqMap: Record<string, string[]>): Record<string, string[]> {
  const post: Record<string, string[]> = {}
  Object.entries(prereqMap).forEach(([cursoId, prereqIds]) => {
    prereqIds.forEach((pid) => {
      ;(post[pid] ??= []).push(cursoId)
    })
  })
  return post
}