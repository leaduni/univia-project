"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Settings,
  RotateCcw,
  TrendingUp,
  Clock
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Pregunta {
  id: number
  pregunta: string
  tipo: "multiple" | "unica" | "verdadero_falso"
  opciones: string[]
  respuesta_correcta: number | number[]
  explicacion: string
}

interface Evaluacion {
  curso_id: number
  modulo: string
  temas: string[]
  preguntas: Pregunta[]
  tiempo_estimado: number
}

interface ModuloInfo {
  title: string
  topics: string[]
}

export function EvaluacionIA({ courseId, modulos }: { courseId: string; modulos: ModuloInfo[] }) {
  const [step, setStep] = useState<"config" | "loading" | "evaluacion" | "resultados">("config")
  const [selectedModulo, setSelectedModulo] = useState<ModuloInfo | null>(null)
  const [numPreguntas, setNumPreguntas] = useState(5)
  const [observaciones, setObservaciones] = useState("")
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [respuestas, setRespuestas] = useState<Record<number, any>>({})
  const [resultado, setResultado] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generarEvaluacion = async () => {
    if (!selectedModulo) return

    try {
      setIsLoading(true)
      setError(null)
      setStep("loading")

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`${API_URL}/api/evaluaciones/generar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          curso_id: parseInt(courseId),
          modulo: selectedModulo.title,
          temas: selectedModulo.topics,
          num_preguntas: numPreguntas,
          observaciones: observaciones || null,
          tipo_evaluacion: "mixta"
        }),
      })

      if (!response.ok) {
        throw new Error("Error al generar la evaluación")
      }

      const data = await response.json()
      setEvaluacion(data)
      setStep("evaluacion")
    } catch (err: any) {
      setError(err.message)
      setStep("config")
    } finally {
      setIsLoading(false)
    }
  }

  const enviarEvaluacion = async () => {
    if (!evaluacion) return

    try {
      setIsLoading(true)
      setError(null)

      const respuestasArray = Object.entries(respuestas).map(([preguntaId, respuesta]) => ({
        pregunta_id: parseInt(preguntaId),
        respuesta: respuesta
      }))

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`${API_URL}/api/evaluaciones/evaluar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          evaluacion: evaluacion,
          envio: {
            evaluacion_id: `eval_${Date.now()}`,
            respuestas: respuestasArray
          }
        }),
      })

      if (!response.ok) {
        throw new Error("Error al evaluar las respuestas")
      }

      const data = await response.json()
      setResultado(data)
      setStep("resultados")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const reiniciar = () => {
    setStep("config")
    setSelectedModulo(null)
    setRespuestas({})
    setResultado(null)
    setEvaluacion(null)
    setError(null)
  }

  const handleRespuesta = (preguntaId: number, valor: any, esMultiple: boolean) => {
    if (esMultiple) {
      const current = (respuestas[preguntaId] || []) as number[]
      const newValue = current.includes(valor)
        ? current.filter((v) => v !== valor)
        : [...current, valor]
      setRespuestas({ ...respuestas, [preguntaId]: newValue })
    } else {
      setRespuestas({ ...respuestas, [preguntaId]: valor })
    }
  }

  // Paso 1: Configuración
  if (step === "config") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-500" />
            Evaluación Generada con IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Configura y genera una evaluación personalizada con inteligencia artificial
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuración de la Evaluación
            </CardTitle>
            <CardDescription>Selecciona el módulo y personaliza tu evaluación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selección de módulo */}
            <div className="space-y-3">
              <Label>Selecciona un módulo</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modulos.map((modulo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedModulo(modulo)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${selectedModulo?.title === modulo.title
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950"
                        : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                      }`}
                  >
                    <h4 className="font-semibold text-sm mb-2">{modulo.title}</h4>
                    <div className="flex flex-wrap gap-1">
                      {modulo.topics.slice(0, 3).map((topic, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {modulo.topics.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{modulo.topics.length - 3}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Número de preguntas */}
            <div className="space-y-2">
              <Label htmlFor="num-preguntas">Número de preguntas (5-10)</Label>
              <Input
                id="num-preguntas"
                type="number"
                min="5"
                max="10"
                value={numPreguntas}
                onChange={(e) => setNumPreguntas(Math.min(10, Math.max(5, parseInt(e.target.value) || 5)))}
                className="max-w-xs"
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">
                Observaciones (Opcional)
                <span className="text-xs text-muted-foreground ml-2">
                  Ej: Enfocarse en Python, incluir ejercicios prácticos
                </span>
              </Label>
              <Input
                id="observaciones"
                placeholder="Especifica lenguaje, herramientas o metodología del profesor..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            <Button
              onClick={generarEvaluacion}
              disabled={!selectedModulo || isLoading}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Sparkles className="w-4 h-4" />
              Generar Evaluación con IA
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Paso 2: Cargando
  if (step === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
          <Brain className="w-8 h-8 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-lg font-medium animate-pulse">Generando evaluación con IA...</p>
        <p className="text-sm text-muted-foreground">Esto puede tomar unos segundos</p>
      </div>
    )
  }

  // Paso 3: Evaluación
  if (step === "evaluacion" && evaluacion) {
    const todasRespondidas = evaluacion.preguntas.every((p) => respuestas[p.id] !== undefined)

    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">{evaluacion.modulo}</h3>
                <p className="text-sm text-muted-foreground">
                  {evaluacion.preguntas.length} preguntas • {evaluacion.tiempo_estimado} minutos estimados
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {evaluacion.temas.map((tema, i) => (
                    <Badge key={i} variant="secondary">
                      {tema}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {evaluacion.tiempo_estimado} min
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {evaluacion.preguntas.map((pregunta, idx) => (
            <Card key={pregunta.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{pregunta.pregunta}</span>
                </CardTitle>
                <CardDescription className="ml-11">
                  {pregunta.tipo === "multiple" && "Selección múltiple (varias respuestas)"}
                  {pregunta.tipo === "unica" && "Selección única"}
                  {pregunta.tipo === "verdadero_falso" && "Verdadero o Falso"}
                </CardDescription>
              </CardHeader>
              <CardContent className="ml-11 space-y-2">
                {pregunta.opciones.map((opcion, opcionIdx) => (
                  <div key={opcionIdx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    {pregunta.tipo === "multiple" ? (
                      <Checkbox
                        checked={((respuestas[pregunta.id] || []) as number[]).includes(opcionIdx)}
                        onCheckedChange={() => handleRespuesta(pregunta.id, opcionIdx, true)}
                      />
                    ) : (
                      <input
                        type="radio"
                        name={`pregunta-${pregunta.id}`}
                        checked={respuestas[pregunta.id] === opcionIdx}
                        onChange={() => handleRespuesta(pregunta.id, opcionIdx, false)}
                        className="w-4 h-4 text-purple-600"
                      />
                    )}
                    <label className="flex-1 cursor-pointer">{opcion}</label>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 sticky bottom-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg border shadow-lg">
          <Button variant="outline" onClick={reiniciar} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </Button>
          <Button
            onClick={enviarEvaluacion}
            disabled={!todasRespondidas || isLoading}
            className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <PlayCircle className="w-4 h-4" />
            {isLoading ? "Evaluando..." : "Enviar Evaluación"}
          </Button>
        </div>
      </div>
    )
  }

  // Paso 4: Resultados
  if (step === "resultados" && resultado && evaluacion) {
    const porcentaje = resultado.porcentaje
    const aprobado = porcentaje >= 60

    return (
      <div className="space-y-6">
        {/* Resultado General */}
        <Card className={`${aprobado ? "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950" : "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950"}`}>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {aprobado ? (
                <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
              ) : (
                <TrendingUp className="w-16 h-16 text-orange-600 mx-auto" />
              )}
              <div>
                <h3 className="text-3xl font-bold mb-2">{porcentaje.toFixed(1)}%</h3>
                <p className="text-lg font-medium">
                  {resultado.respuestas_correctas} de {resultado.total} preguntas correctas
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {aprobado ? "¡Excelente trabajo!" : "Sigue practicando"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retroalimentación de IA */}
        {resultado.retroalimentacion && (
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Retroalimentación de IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{resultado.retroalimentacion}</p>
            </CardContent>
          </Card>
        )}

        {/* Detalle de respuestas */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">Revisión Detallada</h4>
          {resultado.detalles.map((detalle: any, idx: number) => (
            <Card key={idx} className={detalle.es_correcta ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"}>
              <CardHeader>
                <CardTitle className="text-sm flex items-start gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${detalle.es_correcta ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600" : "bg-red-100 dark:bg-red-900 text-red-600"}`}>
                    {detalle.es_correcta ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </span>
                  <span className="flex-1">{detalle.pregunta}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="ml-11 space-y-3">
                <div className="space-y-2">
                  {Array.isArray(detalle.respuesta_estudiante) ? (
                    <p className="text-sm">
                      <span className="font-medium">Tu respuesta:</span>{" "}
                      {detalle.respuesta_estudiante.map((idx: number) => detalle.opciones[idx]).join(", ")}
                    </p>
                  ) : (
                    <p className="text-sm">
                      <span className="font-medium">Tu respuesta:</span> {detalle.opciones[detalle.respuesta_estudiante]}
                    </p>
                  )}
                  {!detalle.es_correcta && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      <span className="font-medium">Respuesta correcta:</span>{" "}
                      {Array.isArray(detalle.respuesta_correcta)
                        ? detalle.respuesta_correcta.map((idx: number) => detalle.opciones[idx]).join(", ")
                        : detalle.opciones[detalle.respuesta_correcta]}
                    </p>
                  )}
                </div>
                <div className="bg-secondary/30 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Explicación:</p>
                  <p className="text-sm text-muted-foreground">{detalle.explicacion}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={reiniciar} className="w-full gap-2" variant="outline">
          <RotateCcw className="w-4 h-4" />
          Generar Nueva Evaluación
        </Button>
      </div>
    )
  }

  return null
}
