"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, Lock, AlertCircle } from "lucide-react"
import type { Course } from "@/types/course"
import Link from "next/link"
import { COURSE_STATUS_MAP } from "@/lib/course-status"

interface MallaCourseCardProps {
  course: Course
  onClick: () => void
}

const icons: Record<string, React.ComponentType<{ className?: string }> | null> = {
  completed: CheckCircle2,
  in_progress: AlertCircle,
  available: null,
  locked: Lock,
}

const iconColors: Record<string, string> = {
  completed: "text-emerald-400",
  in_progress: "text-primary",
  locked: "text-muted-foreground",
}

export function MallaCourseCard({ course, onClick }: MallaCourseCardProps) {
  const config = COURSE_STATUS_MAP[course.status]
  const Icon = icons[course.status]

  const CardContent = (
    <button
      onClick={course.status === "locked" ? undefined : onClick}
      className={cn(
        "p-4 rounded-lg border-2 transition-all duration-200 text-left group",
        "hover:shadow-lg hover:scale-105 active:scale-95 disabled:pointer-events-none",
        config.card,
        course.status === "locked" && "cursor-not-allowed hover:scale-100",
      )}
      disabled={course.status === "locked"}
    >
      {/* Icon and Badge */}
      <div className="flex items-start justify-between mb-3">
        {Icon && <Icon className={cn("w-5 h-5", iconColors[course.status] || "text-foreground")} />}
        <span className={cn("text-xs font-semibold px-2 py-1 rounded", config.badge)}>{config.label}</span>
      </div>

      {/* Course Code */}
      <div className="text-xs text-muted-foreground font-medium mb-1">{course.code}</div>

      {/* Course Name */}
      <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
        {course.name}
      </h3>

      {/* Credits */}
      <div className="text-xs text-muted-foreground">{course.credits} créditos</div>
    </button>
  )

  if (course.status === "locked") {
    return CardContent
  }

  return <Link href={`/curso/${course.id}`}>{CardContent}</Link>
}
