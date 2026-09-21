"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Search, X, ChevronRight, ChevronLeft, BookOpen, Clock,
  MapPin, User, Check, Loader2, GraduationCap, Beaker, FlaskConical, UploadCloud, FileText
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

interface AddCourseSectionModalProps {
  onClose: () => void
  etiquetas: Etiqueta[]
  semesterStart: string
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

export function AddCourseSectionModal({
  onClose,
  etiquetas,
  semesterStart,
  onAddEvents,
}: AddCourseSectionModalProps) {
  const [tab, setTab] = useState<Tab>("manual")
  
  // Tab Manual
  const [step, setStep] = useState<Step>("search")
  const [query, setQuery] = useState("")
  const [selectedCourse, setSelectedCourse] = useState<CourseGroup | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [courses, setCourses] = useState<CourseGroup[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  // Tab PDF
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pdfResult, setPdfResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCargaHoraria("2026-II").then(rows => {
      setCourses(groupSchedulesByCourse(rows))
      setLoadingCourses(false)
    })
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return courses
    const q = query.toLowerCase()
    return courses.filter(
      (c) => c.codigo.toLowerCase().includes(q) || c.nombre_curso.toLowerCase().includes(q)
    )
  }, [courses, query])

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
        fechaISO: getFirstDateForDay(semesterStart, b.dia),
        horaInicio,
        duracion: horaFin - horaInicio,
        todoElDia: false,
        recurrencia: "Cada semana",
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
      <div ref={modalRef} className="relative z-10 w-full max-w-lg bg-[#151522]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
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

        {/* CONTENIDO MANUAL */}
        {tab === "manual" && step === "search" && (
          <div className="flex flex-col">
            <div className="px-6 py-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código o nombre de curso..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[45vh] custom-scrollbar">
              {loadingCourses ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center"><GraduationCap className="w-8 h-8 text-slate-600 mx-auto mb-3" /><p className="text-sm text-slate-500">No se encontraron cursos</p></div>
              ) : (
                <div className="p-2 space-y-1">
                  {filtered.map((course) => {
                    const secs = Object.keys(course.secciones)
                    return (
                      <button key={course.codigo} onClick={() => handleSelectCourse(course)} className="w-full flex items-center gap-4 p-3.5 rounded-xl text-left hover:bg-white/[0.04] transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0"><span className="text-[10px] font-black text-indigo-400 tracking-wider">{course.codigo.slice(0, 3)}</span></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2"><span className="text-xs font-bold text-indigo-400">{course.codigo}</span><span className="text-[10px] text-slate-500">{secs.length} secc.</span></div>
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
                <div className="flex gap-2 ml-[42px] mt-2 flex-wrap">
                  {data.bloques.map((b) => (
                    <span key={`${b.tipo_clase}_${b.dia}`} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-medium text-slate-300">{TIPO_LABELS[b.tipo_clase] || b.tipo_clase}: {DIA_LABELS[b.dia]?.slice(0, 3) || b.dia} {b.hora_inicio}</span>
                  ))}
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
              <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 mt-2"><p className="text-[11px] text-indigo-300/80">Se agregarán <strong>{selectedBloques.length} bloques</strong> con recurrencia semanal.</p></div>
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

