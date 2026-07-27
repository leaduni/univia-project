"use client"
import { useRouter } from "next/navigation"
import { BookOpen, Sigma, Atom, GitBranch, BarChart3 } from "lucide-react"

interface CurrentCoursesSectionProps {
  courses: any[]
  isLoading: boolean
}

const COURSE_HEADER_GRADIENTS = [
  "from-[#f43f5e] via-[#e11d48] to-[#a855f7]",
  "from-[#a6249d] via-[#7957f1] to-[#1a1836]",
  "from-[#f97316] via-[#d93340] to-[#1a1836]",
  "from-[#a0218b] via-[#ff86ff] to-[#1a1836]",
]

const WATERMARK_ICONS = [Sigma, Atom, GitBranch, BarChart3]

function CourseGradientCard({ course, index }: { course: any; index: number }) {
  const router = useRouter()
  const courseCode = course.code || course.codigo || `CS${course.id}`
  const courseName = course.name || course.nombre || "Curso"
  const progress = course.progreso ?? 0
  const nextTopic = course.currentTopic || "Contenido del curso"
  const cicloRoman = course.ciclo_roman || `Ciclo ${course.ciclo || "III"}`
  const gradClass = COURSE_HEADER_GRADIENTS[index % COURSE_HEADER_GRADIENTS.length]
  const WatermarkIcon = WATERMARK_ICONS[index % WATERMARK_ICONS.length]

  const handleClick = () => {
    const courseId = String(course.id ?? course.code ?? course.codigo ?? "")
    if (courseId) router.push(`/curso/${courseId}`)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleClick()
        }
      }}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-[#151428] border border-[#262444] flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#ec4899] hover:shadow-lg hover:shadow-pink-500/10 active:scale-[0.99]"
    >
      {/* Header — gradient + watermark */}
      <div className={`relative h-32 p-4 flex flex-col justify-between bg-gradient-to-r ${gradClass} overflow-hidden`}>
        <div className="absolute -right-2 -bottom-2 opacity-20 text-white pointer-events-none">
          <WatermarkIcon className="w-28 h-28 stroke-[1.5]" />
        </div>
        <div className="flex justify-between items-center z-10">
          <span className="text-xs font-bold text-white/90 tracking-wider">{courseCode}</span>
          <span className="px-2.5 py-1 rounded-full text-xs bg-black/30 backdrop-blur-md text-white font-medium border border-white/10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En curso
          </span>
        </div>
        <h3 className="text-lg font-bold text-white z-10 leading-snug drop-shadow-sm">{courseName}</h3>
      </div>

      {/* Metadata */}
      <div className="p-4 flex flex-col justify-between bg-[#131224] gap-2">
        <div className="text-xs text-slate-400"><span className="font-semibold">{cicloRoman}</span></div>
        <div className="text-xs text-slate-300">
          <span className="text-slate-400">Sigue:</span> {nextTopic}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-1.5 bg-[#262444] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">{progress}%</span>
        </div>
      </div>
    </div>
  )
}

export function CurrentCoursesSection({ courses, isLoading }: CurrentCoursesSectionProps) {
  return (
    <div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-[#151428] animate-pulse rounded-xl border border-[#262444]" />
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course, index) => (
            <CourseGradientCard key={course.id} course={course} index={index} />
          ))}
        </div>
      ) : (
        <div className="p-10 text-center bg-[#151428] rounded-xl border border-dashed border-[#262444]">
          <div className="p-3 rounded-lg gradient-brand-br inline-flex mb-4">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <p className="text-white/50 font-medium">No tienes cursos activos en este momento.</p>
          <p className="text-xs text-white/30 mt-2">Los cursos aparecerán aquí cuando te inscribas.</p>
        </div>
      )}
    </div>
  )
}
