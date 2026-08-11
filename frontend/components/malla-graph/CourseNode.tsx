// Nodo de curso del grafo. CursoNodeInner es la parte presentacional pura
// (testeable sin contexto de React Flow); CourseNode la envuelve con Handles.
"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { BadgeCheck, Circle, Lock, PlayCircle } from "lucide-react"
import { GRAPH_STATUS, HIGHLIGHT_COLOR_POST, HIGHLIGHT_COLOR_PRE, HIGHLIGHT_COLOR_SELF, STATUS_LABEL } from "./constants"
import type { CourseNodeData, CourseNodeType } from "./transformMalla"

const STATUS_ICONS = {
  completed: BadgeCheck,
  in_progress: PlayCircle,
  available: Circle,
  locked: Lock,
} as const

const STATUS_TEST_ID = {
  completed: "badge-check",
  in_progress: "play-circle",
  available: "status-circle",
  locked: "lock-icon",
} as const

const HANDLE_STYLE = { width: 8, height: 8, background: "var(--border)", border: "1px solid var(--border)" }

interface CourseNodeInnerProps {
  data: CourseNodeData
  withHandles?: boolean
}

export function CourseNodeInner({ data, withHandles = false }: CourseNodeInnerProps) {
  const Icon = STATUS_ICONS[data.status]
  const status = GRAPH_STATUS[data.status]

  const highlightStyle =
    data.highlight === "pre"
      ? { borderColor: HIGHLIGHT_COLOR_PRE, boxShadow: "0 0 12px rgba(121,87,241,0.35)" }
      : data.highlight === "post"
        ? { borderColor: HIGHLIGHT_COLOR_POST, boxShadow: "0 0 12px rgba(56,189,248,0.35)" }
        : data.highlight === "self"
          ? { borderColor: HIGHLIGHT_COLOR_SELF, boxShadow: "0 0 12px rgba(255,255,255,0.3)" }
          : undefined

  return (
    <div
      data-testid="course-node"
      data-id={data.id}
      data-status={data.status}
      className={`flex min-h-[90px] w-[200px] flex-col gap-1 rounded-lg border px-3 py-2.5 transition-all hover:shadow-lg ${status.node}`}
      style={highlightStyle}
    >
      {withHandles && (
        <Handle type="target" position={Position.Left} isConnectable={false} style={HANDLE_STYLE} />
      )}
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {data.code}
        </span>
        <Icon data-testid={STATUS_TEST_ID[data.status]} className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </div>
      <span className={`inline-flex items-center gap-1 self-start rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${status.badge}`}>
        {STATUS_LABEL[data.status]}
      </span>
      <div className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
        {data.name}
      </div>
      <div className="mt-auto text-[10px] text-muted-foreground">{data.credits} créditos</div>
      {withHandles && (
        <Handle type="source" position={Position.Right} isConnectable={false} style={HANDLE_STYLE} />
      )}
    </div>
  )
}

export const CourseNode = memo(function CourseNode({ data }: NodeProps<CourseNodeType>) {
  return <CourseNodeInner data={data} withHandles />
})