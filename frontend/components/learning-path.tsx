"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LearningTimeline } from "./learning-path/timeline"
import { ExamBank } from "./learning-path/exam-bank"
import { EvaluacionIA } from "./learning-path/evaluacion-ia"
import { Sparkles, GraduationCap, Calendar, FileText, Target, Lock, CheckCircle2 } from "lucide-react"
import { apiService } from "@/lib/api-service"

const TABS = [
  { key: "path", label: "Ruta de aprendizaje" },
  { key: "exams", label: "Banco de exámenes" },
  { key: "evaluacion", label: "Mis evaluaciones" },
]

interface LearningPathProps {
  courseId: string
}

export function LearningPath({ courseId }: LearningPathProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("path")
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [preSelectedModulo, setPreSelectedModulo] = useState<string | null>(null)
  const [showingEvaluationResults, setShowingEvaluationResults] = useState(false)

  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeSuccess, setCompleteSuccess] = useState(false)
  const [examCount, setExamCount] = useState(0)

  useEffect(() => {
    const fetchLearningPath = async () => {
      try {
        setIsLoading(true)
        const cleanId = courseId.toString().startsWith("c")
          ? courseId.toString().substring(1)
          : courseId
        const result = await apiService.getLearningPath(cleanId)
        setData(result)
      } catch (err: any) {
        if (err.status === 403) {
          setAccessDenied(true)
        } else {
          setError(err.message || "Error al cargar la ruta de aprendizaje.")
        }
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLearningPath()
  }, [courseId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ec4899]" />
        <p className="text-slate-400 animate-pulse">Cargando ruta de aprendizaje...</p>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="bg-amber-500/10 text-amber-200 p-6 rounded-2xl border border-amber-500/30">
          <Lock className="h-10 w-10 mx-auto mb-3 text-amber-400" />
          <h2 className="text-lg font-bold mb-2 text-white">Curso Bloqueado</h2>
          <p className="text-sm text-amber-300/80">
            Este curso tiene prerrequisitos que aún no has completado. Debes aprobar los cursos anteriores para acceder a su contenido.
          </p>
        </div>
        <Link href="/malla" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] transition-all shadow-md">
          Volver a Mi Malla
        </Link>
      </div>
    )
  }

  if (completeSuccess) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="bg-emerald-500/10 text-emerald-200 p-6 rounded-2xl border border-emerald-500/30">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
          <h2 className="text-lg font-bold mb-2 text-white">Curso completado exitosamente</h2>
          <p className="text-sm text-emerald-300/80">
            El curso ha sido marcado al 100% de progreso. Los cursos correlativos se desbloquearán en tu malla.
          </p>
        </div>
        <Link href="/malla" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] transition-all shadow-md">
          Volver a Mi Malla
        </Link>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="bg-rose-500/10 text-rose-200 p-4 rounded-2xl border border-rose-500/20 font-semibold">
          {error || "No se encontraron datos para este curso."}
        </div>
        <Link href="/malla" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] transition-all shadow-md">
          Volver a Mi Malla
        </Link>
      </div>
    )
  }

  const { curso, timeline, ai_insights } = data

  const parseTopics = (topics: any): string[] => {
    if (Array.isArray(topics)) return topics
    if (typeof topics === "string") {
      return topics.replace(/^\{|\}$/g, "").split(",").map((t: string) => t.trim()).filter(Boolean)
    }
    return []
  }

  const modulos = (timeline ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    topics: parseTopics(item.topics),
    status: item.status,
    completado: item.completado,
  }))

  const weeksCompleted = timeline.filter((s: any) => s.status === "completed").length
  const totalWeeks = timeline.length
  const progress = curso.progress ?? 0
  const aiText = ai_insights?.[0]?.description
    || "Basado en tu desempeño actual, recomendamos reforzar los temas de la semana en curso."

  const handleStartEvaluation = (moduleTitle: string) => {
    setPreSelectedModulo(moduleTitle)
    setActiveTab("evaluacion")
  }

  const handleConfirmComplete = async () => {
    setCompleting(true)
    try {
      const courseIdNum = Number(courseId.toString().replace(/^c/, ""))
      await apiService.completarCurso(courseIdNum)
      setShowCompleteModal(false)
      setCompleteSuccess(true)
      setTimeout(() => router.push("/malla"), 2500)
      setTimeout(() => setCompleteSuccess(false), 4000)
      const cleanId = courseId.toString().startsWith("c")
        ? courseId.toString().substring(1)
        : courseId
      const result = await apiService.getLearningPath(cleanId)
      setData(result)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al completar el curso")
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* Hero Banner */}
      {!showingEvaluationResults && <div className="bg-gradient-to-r from-[#17112c] via-[#0f0e21] to-[#0b0a16] rounded-2xl border border-[#27244a] p-6 md:p-8">
        {/* Breadcrumbs */}
        <p className="text-xs text-slate-500 mb-4">
          <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Inicio</Link>
          <span className="mx-1.5">/</span>
          <Link href="/malla" className="hover:text-slate-300 transition-colors">Mi malla</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-400">{curso.name}</span>
        </p>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#211d45] text-purple-300 border border-[#3b3475]">
            {curso.code || "S/C"}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1a233d] text-sky-300 border border-[#283b66]">
            {curso.ciclo_roman || `Ciclo ${curso.ciclo || "III"}`}
          </span>
          {(progress ?? 0) < 100 && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="ml-auto px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-[#1d1a3b] border border-[#3b3475] hover:bg-[#282452] transition-all"
            >
              Marcar como completado
            </button>
          )}
        </div>

        {/* Title & Description */}
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
          {curso.name}
        </h1>
        {curso.professor && (
          <p className="text-sm text-slate-400 mb-3">{curso.professor}</p>
        )}
        {curso.description && (
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            {curso.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button
            onClick={() => setActiveTab("evaluacion")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] hover:opacity-90 transition-all shadow-lg shadow-pink-500/20"
          >
            <Sparkles className="w-4 h-4" />
            Generar evaluación con IA
          </button>
          <button
            onClick={() => setActiveTab("exams")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-[#1a1735]/80 border border-[#2b2654] hover:bg-[#231f47] transition-all"
          >
            <FileText className="w-4 h-4" />
            Ver banco de exámenes
          </button>
        </div>
      </div>}

      {/* Metrics Grid */}
      {!showingEvaluationResults && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#121124]/60 border border-[#232045] flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
          <div>
            <p className="text-sm font-bold text-white">{curso.credits || 4} créditos</p>
            <p className="text-xs text-slate-400">Obligatorio &middot; FIIS</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#121124]/60 border border-[#232045] flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <div>
            <p className="text-sm font-bold text-white">{totalWeeks || 8} semanas</p>
            <p className="text-xs text-slate-400">Alineado al sílabo 2026-1</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#121124]/60 border border-[#232045] flex items-center gap-3">
          <FileText className="w-5 h-5 text-indigo-400" />
          <div>
            <p className="text-sm font-bold text-white">{examCount || 15} recursos</p>
            <p className="text-xs text-slate-400">Exámenes, prácticas y clases</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#121124]/60 border border-[#232045] flex items-center gap-3">
          <Target className="w-5 h-5 text-indigo-400" />
          <div>
            <p className="text-sm font-bold text-white">Nivel exigente</p>
            <p className="text-xs text-slate-400">Estilo examen real UNI</p>
          </div>
        </div>
      </div>}

      {/* 2-Column Layout */}
      <div className={`grid grid-cols-1 gap-8 ${showingEvaluationResults ? "" : "lg:grid-cols-12"}`}>

        {/* Left Column — Tabs + Content */}
        <div className={showingEvaluationResults ? "space-y-6" : "lg:col-span-8 space-y-6"}>
          {/* Inline Tab Buttons */}
          <div className="flex items-center gap-1 border-b border-[#232045]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-[1px] ${
                  activeTab === tab.key
                    ? "text-[#ec4899] border-[#ec4899]"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          {activeTab === "path" && (
            <LearningTimeline
              courseId={courseId}
              timeline={timeline}
              onStartEvaluation={handleStartEvaluation}
            />
          )}
          {activeTab === "exams" && (
            <ExamBank courseId={courseId} onCountChange={setExamCount} />
          )}
          {activeTab === "evaluacion" && (
            <EvaluacionIA
              courseId={courseId}
              modulos={modulos}
              preSelectedModulo={preSelectedModulo}
              onClearPreselection={() => {
                setPreSelectedModulo(null)
              }}
              onResultsChange={setShowingEvaluationResults}
            />
          )}
        </div>

        {/* Right Column — Widgets */}
        {!showingEvaluationResults && <div className="lg:col-span-4 space-y-6">

          {/* AI Analysis Widget */}
          <div className="p-5 rounded-2xl bg-[#121124]/80 border border-[#232045] space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ec4899] to-[#a855f7] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white">Análisis de tu asistente IA</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {aiText}
            </p>
            <button
              onClick={() => setActiveTab("evaluacion")}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] hover:opacity-90 transition-all shadow-md shadow-pink-500/20"
            >
              Generar práctica dirigida
            </button>
          </div>

          {/* Progress Widget */}
          <div className="p-5 rounded-2xl bg-[#121124]/80 border border-[#232045] space-y-4">
            <h3 className="text-sm font-bold text-white">Progreso del Curso</h3>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{weeksCompleted} de {totalWeeks}</span>
              <span className="text-sm font-bold text-[#ec4899]">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-[#232045] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] rounded-full transition-all"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center justify-between">
                <span>Evaluaciones completadas</span>
                <span className="font-semibold text-white">{weeksCompleted}/{totalWeeks}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Promedio</span>
                <span className="font-semibold text-white">15.2 / 20</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Racha activa</span>
                <span className="font-semibold text-emerald-400">3 días</span>
              </li>
            </ul>
          </div>

          {/* Professor Widget */}
          <div className="p-5 rounded-2xl bg-[#121124]/80 border border-[#232045] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#a855f7] to-[#ec4899] p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-[#121124] rounded-full flex items-center justify-center text-sm font-black text-white">
                  {curso.professor ? curso.professor.charAt(0) : "M"}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{curso.professor || "Docente"}</p>
                <p className="text-xs text-slate-400">Profesor del curso</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              &quot;Sus exámenes priorizan análisis de casos prácticos aplicados a la realidad nacional.&quot;
            </p>
          </div>
        </div>}
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#14132a] border border-[#27244a] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">¿Marcar curso como completado?</h3>
            <p className="text-sm text-slate-400">
              Esta acción registrará el curso al 100% de progreso.
              Los cursos correlativos dependientes en tu malla curricular se desbloquearán.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmComplete}
                disabled={completing}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#ec4899] to-[#a855f7] hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-pink-500/20"
              >
                {completing ? "Completando..." : "Sí, completar al 100%"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}