// Grafo interactivo de prerrequisitos de la carrera (ruta /malla).
//
// React Flow sobre el payload existente de GET /malla (sin cambios en la API).
// Interacciones: hover resalta la cadena de prerrequisitos/descendientes,
// clic abre el panel lateral de detalle (solo lectura), leyenda filtra por
// estado. Espejo funcional del prototipo, alineado a la spec del equipo.
"use client"

import { useCallback, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import {
  Background,
  Controls,
  ReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react"
import { CourseNode } from "./CourseNode"
import { CycleLabel } from "./CycleLabel"
import { CourseDetailsPanel } from "./CourseDetailsPanel"
import { MallaGraphHeader } from "./MallaGraphHeader"
import {
  buildCourseIndex,
  computeStats,
  resolveEdgePresentation,
  resolveHighlight,
  transformarAMallaGraph,
  type CourseNodeData,
} from "./transformMalla"
import {
  buildAncestorMap,
  buildDescendantMap,
  buildPostMap,
  buildPrereqMap,
} from "./prereqMaps"
import type { AvanceCarrera, CicloDetail, StatusCurso } from "@/types/malla"

interface MallaGraphProps {
  malla: CicloDetail[]
  avance?: AvanceCarrera | null
  // Test hook: la virtualización de React Flow necesita un viewport real;
  // se desactiva en entornos sin medidas (jsdom).
  virtualize?: boolean
}

const nodeTypes = { course: CourseNode, cycleLabel: CycleLabel }

export function MallaGraph({ malla, avance, virtualize = true }: MallaGraphProps) {
  const base = useMemo(() => transformarAMallaGraph(malla), [malla])
  const stats = useMemo(() => computeStats(malla), [malla])
  const index = useMemo(() => buildCourseIndex(malla), [malla])

  const prereqMap = useMemo(() => buildPrereqMap(malla), [malla])
  const ancestors = useMemo(() => buildAncestorMap(prereqMap), [prereqMap])
  const descendants = useMemo(() => buildDescendantMap(prereqMap), [prereqMap])
  const postMap = useMemo(() => buildPostMap(prereqMap), [prereqMap])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusCurso | null>(null)

  const opts = useMemo(
    () => ({ hoverId, selectedId, filter, ancestors, descendants }),
    [hoverId, selectedId, filter, ancestors, descendants],
  )

  const nodes = useMemo(
    () =>
      base.nodes.map((n) => {
        const { highlight, opacity } = resolveHighlight(n.id, n.data.status, opts)
        const style: CSSProperties | undefined = opacity !== undefined ? { opacity } : undefined
        return { ...n, data: { ...n.data, highlight }, style }
      }),
    [base.nodes, opts],
  )

  // Las etiquetas de ciclo no participan del resaltado ni del filtro.
  const rfNodes = useMemo(
    () => [...base.labels, ...nodes],
    [base.labels, nodes],
  )

  const edges = useMemo(
    () => base.edges.map((e) => resolveEdgePresentation(e, opts)),
    [base.edges, opts],
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      // Solo los nodos de curso abren el panel; las etiquetas de ciclo no.
      if (!index.has(node.id)) return
      setSelectedId((prev) => (prev === node.id ? null : node.id))
    },
    [index],
  )

  const handleNodeEnter: NodeMouseHandler = useCallback(
    (_, node) => {
      if (index.has(node.id)) setHoverId(node.id)
    },
    [index],
  )
  const handleNodeLeave: NodeMouseHandler = useCallback(() => setHoverId(null), [])
  const handlePaneClick = useCallback(() => {
    setSelectedId(null)
    setHoverId(null)
  }, [])

  const seleccionado = selectedId ? (index.get(selectedId) ?? null) : null

  const post = useMemo(() => {
    if (!selectedId) return []
    return (postMap[selectedId] ?? [])
      .map((id) => index.get(id))
      .filter((c): c is CourseNodeData => Boolean(c))
  }, [selectedId, postMap, index])

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[650px] flex-col">
      <h2 className="sr-only">
        Grafo interactivo de la malla curricular: ciclos en columnas y cursos conectados por
        prerrequisitos. Hover para resaltar la cadena, clic para ver detalles.
      </h2>
      <MallaGraphHeader stats={stats} avance={avance} filter={filter} onFilterChange={setFilter} />
      <div className="relative flex-1 overflow-hidden">
        <ReactFlow
          nodes={rfNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onlyRenderVisibleElements={virtualize}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={handleNodeEnter}
          onNodeMouseLeave={handleNodeLeave}
          onPaneClick={handlePaneClick}
        >
          <Background gap={24} size={1.5} color="#1e293b" />
          <Controls />
        </ReactFlow>
        {seleccionado && (
          <CourseDetailsPanel
            course={seleccionado}
            post={post}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}