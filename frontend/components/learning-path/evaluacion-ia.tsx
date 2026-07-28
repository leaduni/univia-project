// AI-generated evaluation with config, code editor, and results
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Sparkles,
  PlayCircle,
  Settings,
  RotateCcw,
  Clock,
  Loader2,
  Lock
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import MarkdownRenderer from "@/components/ui/markdown-renderer"
import { useAuth } from "@/components/providers/auth-context"
import { EvaluationResultsView } from "@/components/learning-path/evaluation-results-view"
import type { EvaluationResultData, QuestionDetail } from "@/types/evaluation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Pregunta {
  id: number;
  pregunta: string;
  tipo: "multiple" | "unica" | "verdadero_falso" | "codigo";
  opciones: string[];
  respuesta_correcta: number | number[] | string;
  explicacion: string;
  codigo_base?: string;
  caso_de_ejemplo?: {
    input: string;
    output: string;
  };
  contexto_markdown?: string;
  input_markdown?: string;
  output_markdown?: string;
}

interface Evaluacion {
  curso_id: number
  modulo: string
  temas: string[]
  preguntas: Pregunta[]
  tiempo_estimado: number
}

interface ModuloInfo {
  id?: string | number
  title: string
  topics: string[]
  status?: string
  completado?: boolean
}

interface ExecutionResult {
  output?: string;
  error?: string;
  isLoading: boolean;
}

export function EvaluacionIA({
  courseId,
  modulos,
  preSelectedModulo,
  onClearPreselection,
  onResultsChange
}: {
  courseId: string
  modulos: ModuloInfo[]
  preSelectedModulo?: string | null
  onClearPreselection?: () => void
  onResultsChange?: (showing: boolean) => void
}) {
  const [step, setStep] = useState<"config" | "loading" | "evaluacion" | "resultados">("config")
  const [selectedModulo, setSelectedModulo] = useState<ModuloInfo | null>(null)
  const LIMITES_POR_CURSO: Record<string, { min: number; max: number }> = {
    "11": { min: 3, max: 4 }, // Geometría Analítica (Sistemas)
    "31": { min: 3, max: 4 }, // Geometría Analítica (Software)
    "54": { min: 3, max: 4 }, // Geometría Analítica (Industrial)
    "12": { min: 3, max: 4 }, // Cálculo Diferencial (Sistemas)
    "32": { min: 3, max: 4 }, // Cálculo Diferencial (Software)
    "50": { min: 3, max: 4 }, // Cálculo Diferencial (Industrial)
  }
  const limites = LIMITES_POR_CURSO[courseId] ?? { min: 3, max: 5 }
  const [numPreguntas, setNumPreguntas] = useState(limites.min)
  const [observaciones, setObservaciones] = useState("")
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [respuestas, setRespuestas] = useState<Record<number, any>>({})
  const [resultado, setResultado] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionResults, setExecutionResults] = useState<Record<number, ExecutionResult>>({});
  const { session } = useAuth()

  const normalizeTopics = (topics: any): string[] => {
    if (Array.isArray(topics)) return topics
    if (typeof topics === "string") return topics.split(",").map(s => s.trim()).filter(Boolean)
    return []
  }

  // Pre-seleccionar módulo cuando viene desde la ruta de aprendizaje
  const hasProcessedPreselection = useRef(false)
  useEffect(() => {
    if (preSelectedModulo && !hasProcessedPreselection.current) {
      const modulo = modulos.find(m => m.title === preSelectedModulo)
      if (modulo) {
        setSelectedModulo(modulo)
        hasProcessedPreselection.current = true
      }
    }
  }, [preSelectedModulo, modulos])

  // Reset preselección cuando se reinicia
  useEffect(() => {
    if (step === "config") {
      hasProcessedPreselection.current = false
    }
  }, [step])

  // Determinar qué módulos están disponibles según progreso
  interface ModuloDisponible extends ModuloInfo {
    disabled: boolean
    reason?: string
  }
  const getModulosDisponibles = (): ModuloDisponible[] => {
    let previousCompleted = true
    return modulos.map((modulo) => {
      if (!previousCompleted) {
        return { ...modulo, disabled: true, reason: "Completa la unidad anterior primero" }
      }
      if (modulo.completado) {
        previousCompleted = true
        return { ...modulo, disabled: false }
      }
      const isAvailable = previousCompleted
      previousCompleted = false
      return { ...modulo, disabled: !isAvailable, reason: isAvailable ? undefined : "Completa la unidad anterior primero" }
    })
  }

  const handleEjecutarCodigo = async (preguntaId: number, sourceCode: string) => {
    setExecutionResults(prev => ({ ...prev, [preguntaId]: { isLoading: true, output: undefined, error: undefined } }));

    try {
        const response = await fetch("http://127.0.0.1:2358/submissions?base64_encoded=false&wait=true", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source_code: sourceCode,
                language_id: 71, // Python 3
                stdin: ""
            }),
        });

        // Handle non-2xx responses first
        if (!response.ok) {
            const errorText = await response.text().catch(() => "No se pudo leer el cuerpo del error.");
            throw new Error(`El servidor de ejecución respondió con un error ${response.status}. ${errorText}`);
        }

        // Handle successful responses
        let data;
        try {
            data = await response.json();
            console.log('Respuesta de Judge0:', data);
        } catch (jsonError) {
             throw new Error("Error: La respuesta del servidor de ejecución no es un JSON válido.");
        }
        
        let resultOutput: string | undefined;
        let resultError: string | undefined;

        // Priority: An "Accepted" status means success.
        if (data.status?.description === 'Accepted') {
            resultOutput = data.stdout ?? ""; // Display stdout, defaulting to an empty string if null.
        } else if (data.compile_output) {
            // Compilation error is a specific type of error.
            resultError = data.compile_output;
        } else if (data.stderr) {
            // Runtime error is another specific error.
            resultError = data.stderr;
        } else if (data.status?.description) {
            // Any other status description is treated as an error.
            resultError = data.status.description;
        } else {
            // Fallback for an unexpected response format.
            resultError = "Respuesta desconocida del motor de ejecución.";
        }

        // Update the UI to show the immediate result
        setExecutionResults(prev => ({
            ...prev,
            [preguntaId]: { output: resultOutput, error: resultError, isLoading: false }
        }));

    } catch (err: any) {
        console.error('Error en handleEjecutarCodigo:', err);
        // Distinguish between network errors and other errors
        const isNetworkError = err.message.toLowerCase().includes('failed to fetch');
        const errorMessage = isNetworkError
            ? "Error de Red: No se pudo conectar al motor de ejecución local (Judge0). Revisa que esté activo en Docker y que no haya un firewall bloqueando la conexión."
            : err.message;

        setExecutionResults(prev => ({
            ...prev,
            [preguntaId]: { error: errorMessage, isLoading: false }
        }));
    }
  };

  const generarEvaluacion = async () => {
    if (!selectedModulo) return

    try {
      setIsLoading(true)
      setError(null)
      setStep("loading")

      const token = session?.access_token
      if (!token) { console.error("No active authentication token found."); return }

      const response = await fetch(`${API_URL}/api/evaluaciones/generar-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          curso_id: parseInt(courseId),
          modulo: selectedModulo.title,
          temas: [selectedModulo.title],
          num_preguntas: numPreguntas,
          observaciones: observaciones || null,
          tipo_evaluacion: "mixta"
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Error al generar la evaluación")
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let data: any = null
      let preguntasRecibidas = 0
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        // Acumula en buffer y procesa solo eventos SSE completos (separados por \n\n)
        buffer += decoder.decode(value, { stream: true })
        const eventos = buffer.split("\n\n")
        buffer = eventos.pop() ?? "" // el último puede estar incompleto

        for (const evento of eventos) {
          const linea = evento.split("\n").find((l) => l.startsWith("data: "))
          if (!linea) continue
          let payload: any
          try { payload = JSON.parse(linea.slice(6)) } catch { continue }
          if (payload.error) throw new Error(payload.error)
          if (payload.pregunta) {
            preguntasRecibidas++
            setError(`Generando... ${preguntasRecibidas}/${payload.total ?? numPreguntas} preguntas listas`)
          }
          if (payload.done && payload.result) data = payload.result
        }
      }

      setError(null)
      if (!data) throw new Error("No se recibió respuesta de la IA")

      setEvaluacion(data)
      setStep("evaluacion")
    } catch (err: any) {
      if (onResultsChange) onResultsChange(false)
      setError(`Error al procesar la evaluación: ${err.message}. Asegúrate de que la respuesta de la IA sea un JSON válido.`)
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

      const respuestasArray = evaluacion.preguntas.map((pregunta) => {
        const preguntaId = pregunta.id;
        let respuestaParaEnviar: any;

        if (pregunta.tipo === 'codigo') {
            // For code questions, send the stdout from the execution result.
            respuestaParaEnviar = executionResults[preguntaId]?.output ?? '';
        } else {
            // For other questions, send the value from the 'respuestas' state.
            respuestaParaEnviar = respuestas[preguntaId];
        }

        return {
            pregunta_id: preguntaId,
            respuesta: respuestaParaEnviar,
        };
      });

      const token = session?.access_token
      if (!token) { console.error("No active authentication token found."); return }

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
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al evaluar las respuestas")
      }

      const data = await response.json()
      setResultado(data)
      setStep("resultados")
      if (onResultsChange) onResultsChange(true)
    } catch (err: any) {
      if (onResultsChange) onResultsChange(false)
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
    setExecutionResults({})
    if (onResultsChange) onResultsChange(false)
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

  const formatAnswerText = (detalle: any): string => {
    if (detalle.pregunta_tipo === "codigo") return detalle.respuesta_estudiante || "";
    const val = detalle.respuesta_estudiante;
    if (Array.isArray(val) && detalle.opciones) {
      return val.map((idx: number) => detalle.opciones[idx]).join(", ");
    }
    if (detalle.opciones && detalle.opciones[val] !== undefined) return detalle.opciones[val];
    return val != null ? String(val) : "";
  };

  const formatCorrectAnswerText = (detalle: any): string => {
    if (detalle.pregunta_tipo === "codigo") return detalle.respuesta_correcta || "";
    const val = detalle.respuesta_correcta;
    if (Array.isArray(val) && detalle.opciones) {
      return val.map((idx: number) => detalle.opciones[idx]).join(", ");
    }
    if (detalle.opciones && detalle.opciones[val] !== undefined) return detalle.opciones[val];
    return val != null ? String(val) : "";
  };

  const mapResultadoToEvaluationData = (backend: any, topic: string): EvaluationResultData => {
    return {
      score: backend.puntaje ?? 0,
      totalQuestions: backend.total ?? 0,
      percentage: backend.porcentaje ?? 0,
      topic,
      feedback: {
        rawRetroalimentacion: backend.retroalimentacion || "",
      },
      questions: (backend.detalles || []).map((d: any, i: number): QuestionDetail => ({
        id: d.pregunta_id ?? i,
        questionNumber: i + 1,
        questionText: d.contexto_markdown || d.pregunta || "",
        isCorrect: d.es_correcta ?? false,
        userAnswer: formatAnswerText(d),
        correctAnswer: formatCorrectAnswerText(d),
        explanation: d.explicacion || "",
        questionType: d.pregunta_tipo,
        options: d.opciones,
        contextoMarkdown: d.contexto_markdown,
        inputMarkdown: d.input_markdown,
        outputMarkdown: d.output_markdown,
      })),
    };
  };

  // Paso 1: Configuración
  if (step === "config") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <div className="flex items-center justify-center h-6 w-6 rounded gradient-ai-neon">
              <Brain className="w-4 h-4 text-white" />
            </div>
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
            {/* Paso 1: Selección de módulo */}
            <div className="space-y-3">
              <Label>1. Selecciona un módulo</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getModulosDisponibles().map((modulo, idx) => (
                  <button
                    key={idx}
                    onClick={() => { if (!modulo.disabled) { setSelectedModulo(modulo); setSelectedTopic(null); } }}
                    disabled={modulo.disabled}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      modulo.disabled
                        ? "border-border/50 opacity-50 cursor-not-allowed"
                        : selectedModulo?.title === modulo.title
                          ? "border-[var(--ai-neon-pink)] bg-[#a0218b]/10 ring-1 ring-[var(--ai-neon-pink)]/30"
                          : "border-border hover:border-[var(--ai-neon-pink)]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">{modulo.title}</h4>
                      {modulo.completado && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                          Completado
                        </Badge>
                      )}
                      {modulo.disabled && (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    {modulo.disabled && modulo.reason && (
                      <p className="text-xs text-muted-foreground mb-2">{modulo.reason}</p>
                    )}
                    {!modulo.disabled && (
                      <div className="flex flex-wrap gap-1">
                        {normalizeTopics(modulo.topics).slice(0, 3).map((topic, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                        {normalizeTopics(modulo.topics).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{normalizeTopics(modulo.topics).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Número de preguntas */}
            <div className="space-y-2">
              <Label htmlFor="num-preguntas">Número de preguntas ({limites.min}–{limites.max})</Label>
              <Input
                id="num-preguntas"
                type="number"
                min={limites.min}
                max={limites.max}
                value={numPreguntas}
                onChange={(e) => setNumPreguntas(Math.min(limites.max, Math.max(limites.min, parseInt(e.target.value) || limites.min)))}
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
              className="w-full gap-2 gradient-ai-neon text-white border-0"
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--ai-neon-pink)] ai-neon-glow"></div>
          <Brain className="w-8 h-8 text-[var(--ai-neon-pink)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-lg font-medium animate-pulse ai-glow-text">Generando evaluación con IA...</p>
        <p className="text-sm text-muted-foreground">{error || "Preparando preguntas en paralelo..."}</p>
      </div>
    )
  }

  // Paso 3: Evaluación
  if (step === "evaluacion" && evaluacion) {
    const todasRespondidas = evaluacion.preguntas.every((p) => {
      if (p.tipo === 'codigo') {
        const hasCode = respuestas[p.id] !== undefined && (respuestas[p.id] as string).trim() !== '';
        const hasSuccessfulResult = executionResults[p.id] && executionResults[p.id].output !== undefined && !executionResults[p.id].error;
        return hasCode && hasSuccessfulResult;
      }
      if (p.tipo === 'multiple') {
        return respuestas[p.id] !== undefined && (respuestas[p.id] as number[]).length > 0;
      }
      return respuestas[p.id] !== undefined;
    });

    return (
      <div className="space-y-6">
        <Card className="ai-card-neon">
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
          {evaluacion.preguntas.map((pregunta, idx) => {
            const executionResult = executionResults[pregunta.id];
            return (
              <Card key={pregunta.id} className={pregunta.tipo === 'codigo' ? "overflow-hidden" : ""}>
                <CardHeader className={pregunta.tipo === 'codigo' ? "pb-2" : ""}>
                  <CardTitle className="text-base flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#a0218b]/15 text-[var(--ai-neon-pink)] flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    {pregunta.tipo !== 'codigo' && (
                      <div className="flex-1">
                        <MarkdownRenderer content={pregunta.pregunta} />
                      </div>
                    )}
                  </CardTitle>
                  {pregunta.tipo !== 'codigo' && (
                    <CardDescription className="ml-11">
                      {pregunta.tipo === "multiple" && "Selección múltiple (varias respuestas)"}
                      {pregunta.tipo === "unica" && "Selección única"}
                      {pregunta.tipo === "verdadero_falso" && "Verdadero o Falso"}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className={pregunta.tipo === 'codigo' ? "p-0" : "ml-11 space-y-4"}>
                  {pregunta.tipo === 'codigo' ? (
                    (() => {
                      const casoDeEjemplo = pregunta.caso_de_ejemplo;

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
                          {/* Columna Izquierda: Enunciado y Formatos */}
                          <div className="flex flex-col">
                            <div className="mb-2">
                              <span className="inline-flex items-center gap-1 bg-[#a0218b]/15 text-[var(--ai-neon-pink)] text-xs font-semibold px-2.5 py-0.5 rounded">💻 Reto de Código</span>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                              <div className="p-5 space-y-6">
                                {(pregunta.contexto_markdown || pregunta.pregunta) && (
                                  <div className="prose dark:prose-invert max-w-none text-sm">
                                    <MarkdownRenderer content={pregunta.contexto_markdown || pregunta.pregunta} />
                                  </div>
                                )}

                              {(pregunta.input_markdown || pregunta.output_markdown || casoDeEjemplo) && (
                                <hr className="border-slate-200 dark:border-slate-800" />
                              )}

                              {(pregunta.input_markdown || pregunta.output_markdown) && (
                                <div className="space-y-4">
                                  {pregunta.input_markdown && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-semibold text-accent">Formato de Entrada</Label>
                                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md prose dark:prose-invert max-w-none text-sm">
                                        <MarkdownRenderer content={pregunta.input_markdown} />
                                      </div>
                                    </div>
                                  )}
                                  {pregunta.output_markdown && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-semibold text-accent">Formato de Salida</Label>
                                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md prose dark:prose-invert max-w-none text-sm">
                                        <MarkdownRenderer content={pregunta.output_markdown} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {casoDeEjemplo && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-accent">Caso de Ejemplo</Label>
                                  <div className="p-4 font-mono text-sm bg-slate-900 text-slate-300 rounded-md border border-slate-800">
                                    <div className="mb-4">
                                      <p className="text-slate-300 text-xs uppercase tracking-wider mb-2 font-semibold">Entrada de Prueba</p>
                                      <div className="p-3 bg-black/50 rounded border border-slate-800/50 overflow-x-auto">
                                        <code className="text-cyan-400 whitespace-pre">{casoDeEjemplo.input}</code>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-slate-300 text-xs uppercase tracking-wider mb-2 font-semibold">Salida Esperada</p>
                                      <div className="p-3 bg-black/50 rounded border border-slate-800/50 overflow-x-auto">
                                        <code className="text-green-400 whitespace-pre">{casoDeEjemplo.output}</code>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                          {/* Columna Derecha: Editor y Consola */}
                          <div className="flex flex-col space-y-4">
                            <div className="flex-1 flex flex-col">
                              <Label htmlFor={`code-${pregunta.id}`} className="mb-2 text-sm font-semibold">Tu Solución</Label>
                              <textarea
                                id={`code-${pregunta.id}`}
                                value={respuestas[pregunta.id] ?? pregunta.codigo_base ?? ''}
                                onChange={(e) => handleRespuesta(pregunta.id, e.target.value, false)}
                                placeholder="Escribe tu código aquí..."
                                className="w-full flex-1 min-h-[300px] p-4 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] border border-slate-800 rounded-md focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                                style={{ resize: 'vertical' }}
                              />
                            </div>
                            <div className="flex flex-col items-start gap-3">
                              <Button
                                onClick={() => handleEjecutarCodigo(pregunta.id, respuestas[pregunta.id] ?? '')}
                                disabled={executionResult?.isLoading}
                                className="w-full sm:w-auto gap-2 bg-accent hover:bg-accent/80 text-white"
                              >
                                {executionResult?.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                {executionResult?.isLoading ? "Ejecutando..." : "Ejecutar Código"}
                              </Button>
                              
                              {executionResult && (
                                <div className="w-full p-4 bg-slate-950 border border-slate-800 rounded-md shadow-inner">
                                  <p className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Consola de Salida</p>
                                  <pre className="font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                                    {executionResult.error ? (
                                      <code className="text-red-400">{executionResult.error}</code>
                                    ) : (
                                      <code className="text-green-400">{executionResult.output}</code>
                                    )}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    pregunta.opciones && pregunta.opciones.map((opcion, opcionIdx) => (
                      <div key={opcionIdx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        {pregunta.tipo === "multiple" ? (
                          <Checkbox
                            checked={((respuestas[pregunta.id] || []) as number[]).includes(opcionIdx)}
                            onCheckedChange={() => handleRespuesta(pregunta.id, opcionIdx, true)}
                            id={`check-${pregunta.id}-${opcionIdx}`}
                          />
                        ) : (
                          <input
                            type="radio"
                            name={`pregunta-${pregunta.id}`}
                            checked={respuestas[pregunta.id] === opcionIdx}
                            onChange={() => handleRespuesta(pregunta.id, opcionIdx, false)}
                            className="w-4 h-4 text-purple-600"
                            id={`radio-${pregunta.id}-${opcionIdx}`}
                          />
                        )}
                        <label htmlFor={pregunta.tipo === 'multiple' ? `check-${pregunta.id}-${opcionIdx}` : `radio-${pregunta.id}-${opcionIdx}`} className="flex-1 cursor-pointer">
                          <MarkdownRenderer content={opcion} />
                        </label>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex gap-3 sticky bottom-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg border shadow-lg">
          <Button variant="outline" onClick={reiniciar} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </Button>
          <Button
            onClick={enviarEvaluacion}
            disabled={!todasRespondidas || isLoading}
            className="flex-1 gap-2 gradient-ai-neon text-white border-0"
          >
            <PlayCircle className="w-4 h-4" />
            {isLoading ? "Evaluando..." : "Enviar Evaluación"}
          </Button>
        </div>
      </div>
    )
  }

  // Paso 4: Resultados
  if (step === "resultados" && resultado) {
    const evaluationData = mapResultadoToEvaluationData(resultado, selectedModulo?.title || "");
    return (
      <EvaluationResultsView
        data={evaluationData}
        onGenerateNew={reiniciar}
        onBackToCourse={() => {
          reiniciar();
          if (onClearPreselection) onClearPreselection();
        }}
      />
    );
  }

  return null
}
