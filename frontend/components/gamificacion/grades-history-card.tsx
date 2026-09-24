// Historial inmutable de notas de evaluaciones calificables de un curso.
// Muestra el promedio ponderado oficial, la curva de intentos en SVG (sin
// dependencias nuevas) y la lista de intentos. Las prácticas de IA del
// learning path NO aparecen aquí: no forman parte del récord académico.
"use client"

import { useEffect, useState } from "react"
import { BookOpen, ChartLine } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { gamificacionService } from "@/lib/gamificacion-service"
import { formatearFecha, puntosGraficaNotas, svgPolyline } from "@/lib/gamificacion-utils"
import type { HistorialCurso } from "@/types/gamificacion"

interface GradesHistoryCardProps {
  cursoId: string | number
}

const ANCHO = 320
const ALTO = 100

function notaIcon() {
  return <BookOpen className="w-4 h-4" aria-hidden="true" />
}

export function GradesHistoryCard({ cursoId }: GradesHistoryCardProps) {
  const [historial, setHistorial] = useState<HistorialCurso | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHistorial(null)
    setError(null)
    gamificacionService
      .getHistorialCurso(cursoId)
      .then(setHistorial)
      .catch((err: Error) => setError(err.message || "No se pudo cargar el historial."))
  }, [cursoId])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {notaIcon()}
            Notas de evaluaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!historial) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {notaIcon()}
            Notas de evaluaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-28 animate-pulse rounded-xl bg-white/[0.06]" aria-hidden="true" />
          <p className="sr-only">Cargando historial de notas…</p>
        </CardContent>
      </Card>
    )
  }

  const puntos = puntosGraficaNotas(historial.intentos || [], ANCHO, ALTO)
  const polyline = svgPolyline(puntos)
  const sinIntentos = (historial.total_intentos ?? 0) === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartLine className="w-4 h-4" aria-hidden="true" />
          Notas de evaluaciones
        </CardTitle>
        <CardDescription>
          Historial oficial e inmutable de este curso. No incluye las prácticas de repaso.
        </CardDescription>
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-1.5 border border-[#5b8bf7]/30">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Promedio</span>
          <span className="font-bold text-lg tabular-nums text-white">
            {historial.nota_promedio != null ? historial.nota_promedio.toFixed(2) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">/ 20</span>
        </div>
      </CardHeader>

      <CardContent>
        {sinIntentos ? (
          <div className="rounded-xl border border-dashed border-white/[0.12] p-4">
            <p className="text-sm text-muted-foreground">
              Aún no tienes evaluaciones calificables en este curso. Cuando entregues un
              control o examen publicado, su nota quedará registrada aquí de forma inmutable.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Curva de notas: SVG inline, sin dependencias ni imágenes. */}
            <svg
              viewBox={`0 0 ${ANCHO} ${ALTO}`}
              className="w-full h-24"
              role="img"
              aria-label={`Curva de notas: ${puntos.length} intento(s), promedio ${historial.nota_promedio ?? 0}`}
            >
              {[0, 10, 20].map((nota) => {
                const y = Math.round(ALTO - 14 - (nota / 20) * (ALTO - 28))
                return (
                  <g key={nota}>
                    <line
                      x1="0" y1={y} x2={ANCHO} y2={y}
                      stroke="rgba(255,255,255,0.09)" strokeWidth="1"
                    />
                    <text x="6" y={y - 3} fontSize="7" fill="rgba(233,233,237,0.55)">
                      {nota}
                    </text>
                  </g>
                )
              })}
              {polyline && (
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="#7957f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {puntos.length === 1 && (
                <circle cx={puntos[0].x} cy={puntos[0].y} r="3.5" fill="#a6249d" />
              )}
            </svg>

            <ul className="divide-y divide-white/[0.07]">
              {historial.intentos?.map((intento) => (
                <li key={intento.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">
                    {formatearFecha(intento.fecha_completado)}
                    <span className="text-muted-foreground/60 ml-2">
                      {intento.puntaje_obtenido}/{intento.puntaje_maximo} pts
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {intento.nota.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}