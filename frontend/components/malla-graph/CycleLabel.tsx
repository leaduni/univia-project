// Etiqueta de cabecera de columna ("Ciclo I · N créditos"), replicando las
// cabeceras por ciclo del prototipo. No es interactiva y no tiene handles.
"use client"

import { memo } from "react"
import type { NodeProps } from "@xyflow/react"
import { toRoman } from "./constants"
import type { CycleLabelNode } from "./transformMalla"

export const CycleLabel = memo(function CycleLabel({ data }: NodeProps<CycleLabelNode>) {
  return (
    <div className="w-[220px] text-center">
      <div className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
        Ciclo {toRoman(data.ciclo_num)}
      </div>
      <div className="text-[9px] text-muted-foreground">{data.credits} créditos</div>
    </div>
  )
})