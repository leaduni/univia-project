// Preferencias del estudiante
"use client"

import { useEffect, useState } from "react"
// Se usa Checkbox y no un Switch nuevo: los primitivos de UI son de la Fase 1,
// y agregar uno aquí duplicaría el sistema de componentes.
import { Checkbox } from "@/components/ui/checkbox"
import { setRecomendacionesIA, verRecomendacionesIA } from "@/lib/preferencias"

interface FilaProps {
  titulo: string
  descripcion: string
  activo?: boolean
  onCambio?: (valor: boolean) => void
  pendiente?: boolean
}

function Fila({ titulo, descripcion, activo, onCambio, pendiente }: FilaProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          {titulo}
          {pendiente && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70 shrink-0">
              pronto
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      </div>
      <Checkbox
        checked={pendiente ? false : Boolean(activo)}
        onCheckedChange={(valor) => onCambio?.(valor === true)}
        disabled={pendiente}
        aria-label={titulo}
        className="shrink-0 mt-0.5"
      />
    </div>
  )
}

export function PreferenciasCard() {
  const [recomendaciones, setRecomendaciones] = useState(true)

  // Se lee después de montar: en el servidor no existe localStorage y leerlo
  // durante el render provocaría un desajuste con el HTML ya enviado.
  useEffect(() => {
    setRecomendaciones(verRecomendacionesIA())
  }, [])

  const cambiarRecomendaciones = (valor: boolean) => {
    setRecomendaciones(valor)
    setRecomendacionesIA(valor)
  }

  return (
    <div className="border-t border-border pt-6">
      <h2 className="font-heading text-lg font-bold text-foreground mb-1">Preferencias</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Se guardan en este navegador.
      </p>

      <div className="space-y-4">
        <Fila
          titulo="Recomendaciones de IA"
          descripcion="Muestra el bloque del asistente en tu inicio"
          activo={recomendaciones}
          onCambio={cambiarRecomendaciones}
        />
        {/* Sin sistema de notificaciones ni envío de correos: se muestran
            apagadas en lugar de fingir que guardan algo. */}
        <Fila
          titulo="Recordatorios de estudio"
          descripcion="Aviso diario para mantener tu racha"
          pendiente
        />
        <Fila
          titulo="Resumen semanal por correo"
          descripcion="Tu avance de la semana, cada domingo"
          pendiente
        />
      </div>
    </div>
  )
}
