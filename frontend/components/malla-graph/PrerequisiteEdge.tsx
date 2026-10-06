"use client"

import { memo } from "react"
import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react"
import { roundedRoute, type PrerequisiteEdgeData } from "./edgeRouting"

export const PrerequisiteEdge = memo(function PrerequisiteEdge({
  id, data, style, markerEnd,
}: EdgeProps<Edge<PrerequisiteEdgeData>>) {
  if (!data) return null
  const path = roundedRoute(data.points)
  return (
    <>
      {/* Una separación en los cruces permite seguir cada conexión. */}
      <path d={path} fill="none" stroke="var(--card)" strokeWidth={7} style={{ opacity: style?.opacity }} pointerEvents="none" />
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
    </>
  )
})
