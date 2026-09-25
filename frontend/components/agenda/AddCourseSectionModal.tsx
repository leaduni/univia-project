"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Search, X, ChevronRight, ChevronLeft, BookOpen, Clock,
  MapPin, User, Check, Loader2, GraduationCap, Beaker, FlaskConical, UploadCloud, FileText,
  RefreshCw, ExternalLink, CalendarDays
} from "lucide-react"
import {
  timeToDecimal,
  dayCodeToWeekday,
  type FacultyScheduleRow,
  type CourseGroup,
  groupSchedulesByCourse
} from "@/lib/mockData"
import type { CalendarioEvento, Etiqueta } from "./calendar-grid"
import { fetchCargaHoraria, parseMatricula } from "@/lib/agenda-service"
import { fetchWithAuth } from "@/lib/api-service"
import { supabase } from "@/lib/supabase"
import { API_URL } from "@/lib/env"

interface AddCourseSectionModalProps {
  onClose: () => void
  etiquetas: Etiqueta[]
  semesterSettings: { start: string, end: string }
  onSaveSemester: (s: { start: string, end: string }) => void
  onAddEvents: (events: CalendarioEvento[]) => void
}

type Tab = "manual" | "pdf"
type Step = "search" | "sections" | "detail"

const TIPO_LABELS: Record<string, string> = { T: "Teoría", P: "Práctica", LAB: "Laboratorio" }
const TIPO_ICONS: Record<string, typeof BookOpen> = { T: BookOpen, P: Beaker, LAB: FlaskConical }
const DIA_LABELS: Record<string, string> = { LU: "Lunes", MA: "Martes", MI: "Miércoles", JU: "Jueves", VI: "Viernes", SA: "Sábado" }

function getFirstDateForDay(semesterStart: string, dayCode: string): string {
  const targetDay = dayCodeToWeekday(dayCode)
  const d = new Date(semesterStart + "T00:00:00")
  const currentDay = d.getDay() === 0 ? 7 : d.getDay()
  let diff = targetDay - currentDay
  if (diff < 0) diff += 7
  d.setDate(d.getDate() + diff)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function getDateForDayThisWeek(dayCode: string): string {
  const targetDay = dayCodeToWeekday(dayCode)
  const d = new Date()
  const currentDay = d.getDay() === 0 ? 7 : d.getDay()
  const diff = targetDay - currentDay
  d.setDate(d.getDate() + diff)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function AddCourseSectionModal({
  onClose,
  etiquetas,
  semesterSettings,
  onSaveSemester,
  onAddEvents,
}: AddCourseSectionModalProps) {
  const [tab, setTab] = useState<Tab>("manual")

  // Local state for semester settings
  const [semStart, setSemStart] = useState(semesterSettings.start)
  const [semEnd, setSemEnd] = useState(semesterSettings.end)

  // Auto-save when local state changes
  useEffect(() => {
    if (semStart !== semesterSettings.start || semEnd !== semesterSettings.end) {
      onSaveSemester({ start: semStart, end: semEnd })
    }
  }, [semStart, semEnd, semesterSettings, onSaveSemester])

  // Tab Manual
  const [step, setStep] = useState<Step>("search")
  const [query, setQuery] = useState("")
  const [selectedCourse, setSelectedCourse] = useState<CourseGroup | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [courses, setCourses] = useState<CourseGroup[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [myCourseCodes, setMyCourseCodes] = useState<string[]>([])
  const [showOnlyMine, setShowOnlyMine] = useState(true)

  // Tab PDF
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pdfResult, setPdfResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isFullSemester, setIsFullSemester] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const rows = await fetchCargaHoraria("2026-II")
        setCourses(groupSchedulesByCourse(rows))

        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: progreso } = await supabase
              .from("progreso_cursos")
              .select("curso_id")
              .eq("perfil_id", user.id)
              .eq("status", "in_progress")

            if (progreso && progreso.length > 0) {
              const cursoIds = progreso.map(p => p.curso_id)
              const { data: cursosData } = await supabase
                .from("cursos")
                .select("code")
                .in("id", cursoIds)

              if (cursosData) {
                const codes = cursosData.map(c => c.code)
                setMyCourseCodes(codes)
                if (codes.length === 0) setShowOnlyMine(false)
              }
            } else {
              setShowOnlyMine(false)
            }
          }
        } catch (e) {
          console.warn("Ignorando error al obtener onboarding:", e);
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingCourses(false)
      }
    }
    loadData()
  }, [])

  const filtered = useMemo(() => {
    let list = courses
    if (showOnlyMine && myCourseCodes.length > 0) {
      list = list.filter(c => myCourseCodes.includes(c.codigo))
    }
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(
      (c) => c.codigo.toLowerCase().includes(q) || c.nombre_curso.toLowerCase().includes(q)
    )
  }, [courses, query, showOnlyMine, myCourseCodes])

  useEffect(() => {
    if (tab === "manual" && step === "search") inputRef.current?.focus()
  }, [tab, step])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const clasesTag = etiquetas.find(e => e.nombre.toLowerCase().includes("clases"))
  const etiquetaId = clasesTag?.id || etiquetas[0]?.id || ""

  const handleSelectCourse = (course: CourseGroup) => { setSelectedCourse(course); setStep("sections") }
  const handleSelectSection = (section: string) => { setSelectedSection(section); setStep("detail") }
  const handleBack = () => {
    if (step === "detail") { setSelectedSection(null); setStep("sections") }
    else if (step === "sections") { setSelectedCourse(null); setStep("search") }
  }

  const handleConfirmManual = () => {
    if (!selectedCourse || !selectedSection) return
    setAdding(true)
    const bloques = selectedCourse.secciones[selectedSection]?.bloques || []
    const events: CalendarioEvento[] = bloques.map((b, i) => {
      const horaInicio = timeToDecimal(b.hora_inicio)
      const horaFin = timeToDecimal(b.hora_fin)
      return {
        id: `sched_${Date.now()}_${i}`,
        titulo: `${b.codigo} - ${TIPO_LABELS[b.tipo_clase] || b.tipo_clase}`,
        subtitulo: `${b.nombre_curso} | Sección ${b.seccion} | Aula: ${b.aula} | ${b.docente}`,
        etiquetaId,
        fechaISO: isFullSemester ? getFirstDateForDay(semStart, b.dia) : getDateForDayThisWeek(b.dia),
        fechaFinISO: isFullSemester ? semEnd : undefined,
        horaInicio,
        duracion: horaFin - horaInicio,
        todoElDia: false,
        recurrencia: isFullSemester ? "Cada semana" : "No se repite",
        ubicacion: b.aula,
      }
    })

    onAddEvents(events)
    setAdding(false)
    onClose()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0])
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0])
  }
  const startUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    try {
      const res = await parseMatricula(selectedFile)

      const newEvents: CalendarioEvento[] = res.eventos_creados.map(ev => ({
        id: ev.id?.toString() || `ev_${Date.now()}_${Math.random()}`,
        titulo: ev.titulo,
        subtitulo: ev.subtitulo,
        etiquetaId: ev.etiqueta_id?.toString() || etiquetaId,
        fechaISO: ev.fecha_iso,
        horaInicio: Number(ev.hora_inicio),
        duracion: Number(ev.duracion),
        todoElDia: ev.todo_el_dia,
        recurrencia: ev.recurrencia === 'weekly' ? 'Cada semana' : 'No se repite',
        ubicacion: ev.ubicacion || undefined
      }))

      onAddEvents(newEvents)
      setPdfResult(`Éxito: ${res.message}`)
      setTimeout(() => onClose(), 2500)
    } catch (err: any) {
      alert(`Error al procesar PDF: ${err.message}`)
      setIsUploading(false)
    }
  }

  const selectedBloques = selectedCourse && selectedSection ? selectedCourse.secciones[selectedSection]?.bloques || [] : []

  const hayMisCursos = myCourseCodes.length > 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
      <div ref={modalRef} className="relative z-10 w-full max-w-2xl bg-[#151522]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Header con Tabs */}
        <div className="border-b border-white/[0.08]">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              {tab === "manual" && step !== "search" ? (
                <>
                  <button onClick={handleBack} className="w-6 h-6 hover:bg-white/10 rounded flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                  {step === "sections" ? selectedCourse?.nombre_curso : `Sección ${selectedSection}`}
                </>
              ) : "Inscribir Cursos 2026-II"}
            </h2>
            <button onClick={onClose} disabled={isUploading} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          {step === "search" && (
            <div className="flex px-6 gap-6 border-t border-white/5 bg-white/[0.02]">
              <button onClick={() => setTab("manual")} className={`py-3 text-xs font-semibold border-b-2 transition-all ${tab === "manual" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>Selección Manual</button>
              <button onClick={() => setTab("pdf")} className={`py-3 text-xs font-semibold border-b-2 transition-all ${tab === "pdf" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>Subir Matrícula (PDF)</button>
            </div>
          )}
        </div>

        {/* Banner de configuración del semestre */}
        <div className="bg-indigo-900/30 border-b border-indigo-500/20 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-indigo-200">
            <CalendarDays className="w-4 h-4 text-indigo-400 shrink-0" />
            <p className="text-[11px] sm:text-xs">
              Según estas fechas se agregarán tus cursos en tu horario semanal:
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={semStart}
              onChange={e => setSemStart(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              title="Día de inicio de clases"
            />
            <span className="text-slate-400 text-xs">hasta</span>
            <input
              type="date"
              value={semEnd}
              onChange={e => setSemEnd(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              title="Día de fin de clases"
            />
          </div>
        </div>

        {/* CONTENIDO MANUAL */}
        {tab === "manual" && step === "search" && (
          <div className="flex flex-col">
            {/* Toggle Mis cursos / Todos + buscador */}
            <div className="px-6 py-3 border-b border-white/5 space-y-3">
              {/* Toggle de vista - AHORA SIEMPRE SE MUESTRA */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <button
                  onClick={() => setShowOnlyMine(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${showOnlyMine
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Mis cursos ({myCourseCodes.length})
                </button>
                <button
                  onClick={() => setShowOnlyMine(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${!showOnlyMine
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Todos los cursos
                </button>
              </div>

              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código o nombre de curso..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>

              {/* Banner informativo: cómo cambiar los cursos */}
              {showOnlyMine && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[11px] text-indigo-300/80 leading-relaxed">
                    {hayMisCursos ? (
                      <p>Estos son los cursos que marcaste como en curso.</p>
                    ) : (
                      <p>No tienes cursos en curso registrados actualmente.</p>
                    )}
                    <a
                      href="/perfil"
                      className="inline-flex items-center gap-0.5 font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                    >
                      Actualizar situación académica
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de cursos */}
            <div className="overflow-y-auto max-h-[50vh] custom-scrollbar">
              {loadingCourses ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-500">
                    {showOnlyMine
                      ? hayMisCursos
                        ? "Tus cursos activos no tienen horarios programados en la base de datos. (¿Subiste el Excel de la facultad?)"
                        : "No tienes cursos 'en curso' registrados actualmente."
                      : "No se encontraron cursos"}
                  </p>
                  {showOnlyMine && (
                    <button
                      onClick={() => setShowOnlyMine(false)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Ver todos los cursos disponibles →
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filtered.map((course) => {
                    const secs = Object.keys(course.secciones)
                    const esMio = myCourseCodes.includes(course.codigo)
                    return (
                      <button key={course.codigo} onClick={() => handleSelectCourse(course)} className="w-full flex items-center gap-4 p-3.5 rounded-xl text-left hover:bg-white/[0.04] transition-all group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${esMio
                            ? "bg-indigo-500/15 border border-indigo-500/25"
                            : "bg-white/5 border border-white/10"
                          }`}>
                          <span className={`text-[10px] font-black tracking-wider ${esMio ? "text-indigo-400" : "text-slate-500"
                            }`}>{course.codigo.slice(0, 3)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${esMio ? "text-indigo-400" : "text-slate-400"}`}>{course.codigo}</span>
                            <span className="text-[10px] text-slate-500">{secs.length} secc.</span>
                            {esMio && !showOnlyMine && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">EN CURSO</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-200 truncate mt-0.5">{course.nombre_curso}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "manual" && step === "sections" && selectedCourse && (
          <div className="p-6 space-y-3 overflow-y-auto max-h-[50vh] custom-scrollbar">
            {Object.entries(selectedCourse.secciones).map(([seccion, data]) => (
              <button key={seccion} onClick={() => handleSelectSection(seccion)} className="w-full p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all group text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center"><span className="text-sm font-black text-indigo-400">{seccion}</span></div>
                    <span className="text-sm font-semibold text-white">Sección {seccion}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="ml-[42px] mt-2 flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    {data.bloques.map((b, i) => (
                      <span key={`${b.tipo_clase}_${b.dia}_${b.hora_inicio}_${i}`} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-medium text-slate-300">
                        {TIPO_LABELS[b.tipo_clase] || b.tipo_clase}: {DIA_LABELS[b.dia]?.slice(0, 3) || b.dia} {b.hora_inicio?.slice(0, 5)} - {b.hora_fin?.slice(0, 5)}
                      </span>
                    ))}
                  </div>
                  {data.bloques.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <User className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {Array.from(new Set(data.bloques.map(b => b.docente).filter(Boolean))).join(" | ")}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "manual" && step === "detail" && selectedCourse && selectedSection && (
          <>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
              {selectedBloques.map((b, i) => {
                const Icon = TIPO_ICONS[b.tipo_clase] || BookOpen
                return (
                  <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${b.tipo_clase === "T" ? "bg-blue-500/15 text-blue-400" : b.tipo_clase === "P" ? "bg-emerald-500/15 text-emerald-400" : "bg-purple-500/15 text-purple-400"}`}><Icon className="w-4 h-4" /></div>
                      <div><p className="text-sm font-semibold text-white">{TIPO_LABELS[b.tipo_clase] || b.tipo_clase}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 ml-11">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300"><Clock className="w-3 h-3 text-slate-500" /><span>{DIA_LABELS[b.dia] || b.dia} {b.hora_inicio} - {b.hora_fin}</span></div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-300"><MapPin className="w-3 h-3 text-slate-500" /><span>{b.aula}</span></div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 col-span-2"><User className="w-3 h-3 text-slate-500" /><span>{b.docente}</span></div>
                    </div>
                  </div>
                )
              })}
              <div 
                className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3.5 mt-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-indigo-500/10 transition-colors" 
                onClick={() => setIsFullSemester(!isFullSemester)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-indigo-200">Repetir todo el semestre</span>
                  <span className="text-[10px] text-indigo-300/70">
                    {isFullSemester 
                      ? "Se programará semanalmente hasta el fin del semestre." 
                      : "Solo se agregará a la semana actual. Útil para clases puntuales o de recuperación."}
                  </span>
                </div>
                <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isFullSemester ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                  <span 
                    className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform" 
                    style={{ transform: isFullSemester ? 'translateX(18px)' : 'translateX(4px)' }} 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-[#11121d] border-t border-white/5">
              <button onClick={handleBack} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all">Volver</button>
              <button onClick={handleConfirmManual} disabled={adding} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Agregar
              </button>
            </div>
          </>
        )}

        {/* CONTENIDO PDF */}
        {tab === "pdf" && (
          <div className="p-8 flex flex-col items-center justify-center">
            <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
            {isUploading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-indigo-400 opacity-50" />
                  <div className="absolute inset-0 border-t-2 border-indigo-400 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-slate-300 animate-pulse">Analizando cursos y horarios con Gemini...</p>
              </div>
            ) : pdfResult ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-sm text-emerald-300">{pdfResult}</p>
              </div>
            ) : selectedFile ? (
              <div className="w-full border-2 border-indigo-500/30 bg-indigo-500/10 rounded-xl flex flex-col items-center justify-center p-6 transition-all">
                <FileText className="w-10 h-10 text-indigo-400 mb-3" />
                <p className="text-sm font-semibold text-white truncate max-w-full mb-1">{selectedFile.name}</p>
                <button onClick={startUpload} className="w-full py-2.5 mt-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md">Analizar e Inscribir</button>
                <button onClick={() => fileInputRef.current?.click()} className="mt-3 text-[11px] text-slate-400 hover:text-white">Cambiar archivo</button>
              </div>
            ) : (
              <div onDragOver={e => { e.preventDefault(); setIsDragActive(true) }} onDragLeave={() => setIsDragActive(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`w-full py-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isDragActive ? "border-indigo-400 bg-indigo-500/10" : "border-white/20 bg-white/5 hover:border-indigo-400 hover:bg-white/10"}`}>
                <UploadCloud className={`w-8 h-8 ${isDragActive ? "text-indigo-400" : "text-slate-400"}`} />
                <p className="text-sm font-medium text-white">Arrastra tu Ficha de Matrícula aquí (PDF)</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
