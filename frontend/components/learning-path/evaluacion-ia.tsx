// AI-generated evaluation with config, code editor, and results
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
  Clock,
  Loader2
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import MarkdownRenderer from "@/components/ui/markdown-renderer"

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
  title: string
  topics: string[]
}

interface ExecutionResult {
  output?: string;
  error?: string;
  isLoading: boolean;
}

export function EvaluacionIA({ courseId, modulos }: { courseId:string; modulos: ModuloInfo[] }) {
  const [step, setStep] = useState<"config" | "loading" | "evaluacion" | "resultados">("config")
  const [selectedModulo, setSelectedModulo] = useState<ModuloInfo | null>(null)
  const [numPreguntas, setNumPreguntas] = useState(5)
  const [observaciones, setObservaciones] = useState("")
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [respuestas, setRespuestas] = useState<Record<number, any>>({})
  const [resultado, setResultado] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionResults, setExecutionResults] = useState<Record<number, ExecutionResult>>({});

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
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al generar la evaluación")
      }

      // Robust parsing
      const rawResponse = await response.text();
      // Remove control characters but keep \n and \t
      const cleanResponse = rawResponse.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
      const data = JSON.parse(cleanResponse);
      
      setEvaluacion(data)
      setStep("evaluacion")
    } catch (err: any) {
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
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al evaluar las respuestas")
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
    setExecutionResults({})
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
            {/* Selección de módulo */}
            <div className="space-y-3">
              <Label>Selecciona un módulo</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modulos.map((modulo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedModulo(modulo)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${selectedModulo?.title === modulo.title
                        ? "border-[var(--ai-neon-pink)] bg-[#a0218b]/10 ring-1 ring-[var(--ai-neon-pink)]/30"
                        : "border-border hover:border-[var(--ai-neon-pink)]/50"
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
        <p className="text-sm text-muted-foreground">Esto puede tomar unos segundos</p>
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
                                      <Label className="text-sm font-semibold text-purple-600 dark:text-purple-400">Formato de Entrada</Label>
                                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md prose dark:prose-invert max-w-none text-sm">
                                        <MarkdownRenderer content={pregunta.input_markdown} />
                                      </div>
                                    </div>
                                  )}
                                  {pregunta.output_markdown && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-semibold text-purple-600 dark:text-purple-400">Formato de Salida</Label>
                                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md prose dark:prose-invert max-w-none text-sm">
                                        <MarkdownRenderer content={pregunta.output_markdown} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {casoDeEjemplo && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-purple-600 dark:text-purple-400">Caso de Ejemplo</Label>
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
                                className="w-full flex-1 min-h-[300px] p-4 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] border border-slate-800 rounded-md focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                style={{ resize: 'vertical' }}
                              />
                            </div>
                            <div className="flex flex-col items-start gap-3">
                              <Button
                                onClick={() => handleEjecutarCodigo(pregunta.id, respuestas[pregunta.id] ?? '')}
                                disabled={executionResult?.isLoading}
                                className="w-full sm:w-auto gap-2 bg-purple-600 hover:bg-purple-700 text-white"
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
  if (step === "resultados" && resultado && evaluacion) {
    const porcentaje = resultado.porcentaje
    const aprobado = porcentaje >= 60

    const renderRespuestaEstudiante = (detalle: any) => {
      if (detalle.pregunta_tipo === 'codigo') {
        return <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm whitespace-pre-wrap"><code>{detalle.respuesta_estudiante}</code></pre>;
      }
      const content = Array.isArray(detalle.respuesta_estudiante)
        ? detalle.respuesta_estudiante.map((idx: number) => detalle.opciones[idx]).join(", ")
        : (detalle.opciones && detalle.opciones[detalle.respuesta_estudiante])
        ? detalle.opciones[detalle.respuesta_estudiante]
        : detalle.respuesta_estudiante;
      
      return <MarkdownRenderer content={content} />;
    };

    // Helper para mostrar la respuesta correcta
    const renderRespuestaCorrecta = (detalle: any) => {
      if (detalle.pregunta_tipo === 'codigo') {
        return <pre className="p-2 bg-emerald-100/50 dark:bg-emerald-900/50 rounded text-sm whitespace-pre-wrap"><code>{detalle.respuesta_correcta}</code></pre>;
      }
       const content = Array.isArray(detalle.respuesta_correcta)
        ? detalle.respuesta_correcta.map((idx: number) => detalle.opciones[idx]).join(", ")
        : (detalle.opciones && detalle.opciones[detalle.respuesta_correcta])
        ? detalle.opciones[detalle.respuesta_correcta]
        : detalle.respuesta_correcta;

      return <MarkdownRenderer content={content} />;
    };

    return (
      <div className="space-y-6">
        {/* Resultado General */}
        <Card className={`${aprobado ? "gradient-result-pass" : "gradient-result-fail"}`}>
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
          <Card className="ai-card-neon">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Retroalimentación de IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer content={resultado.retroalimentacion} />
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
                  <div className="flex-1">
                    <MarkdownRenderer content={detalle.contexto_markdown || detalle.pregunta} />
                  </div>
                </CardTitle>
                {(detalle.input_markdown || detalle.output_markdown) && (
                  <CardDescription className="ml-11 mt-2 space-y-1 text-xs">
                      {detalle.input_markdown && <div><strong>Input:</strong> {detalle.input_markdown}</div>}
                      {detalle.output_markdown && <div><strong>Output Esperado:</strong> {detalle.output_markdown}</div>}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="ml-11 space-y-3">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Tu respuesta:</span>{" "}
                    {renderRespuestaEstudiante(detalle)}
                  </div>
                  {!detalle.es_correcta && (
                    <div className="text-sm text-emerald-600 dark:text-emerald-400">
                      <span className="font-medium">Respuesta correcta:</span>{" "}
                      {renderRespuestaCorrecta(detalle)}
                    </div>
                  )}
                </div>
                {detalle.explicacion && (
                  <div className="bg-secondary/30 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Explicación:</p>
                    <div className="text-sm text-muted-foreground">
                      <MarkdownRenderer content={detalle.explicacion} />
                    </div>
                  </div>
                )}
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
