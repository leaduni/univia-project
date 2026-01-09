"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, Lock, AlertCircle } from "lucide-react"
import type { Course } from "@/types/course"
import Link from "next/link"

interface MallaCourseCardProps {
  course: Course
  onClick: () => void
}

export function MallaCourseCard({ course, onClick }: MallaCourseCardProps) {
  const statusConfig = {
    completed: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-300 dark:border-emerald-700",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    in_progress: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-300 dark:border-blue-700 animate-pulse",
      icon: AlertCircle,
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    available: {
      bg: "bg-card dark:bg-card",
      border: "border-border",
      icon: null,
      iconColor: "",
    },
    locked: {
      bg: "bg-gray-50 dark:bg-gray-950/30 grayscale",
      border: "border-border",
      icon: Lock,
      iconColor: "text-gray-600 dark:text-gray-400",
    },
  }

  const config = statusConfig[course.status]
  const Icon = config.icon

  const badgeLabel = {
    completed: "Completado",
    in_progress: "En Progreso",
    available: "Pendiente",
    locked: "Bloqueado",
  }[course.status]

  const badgeStyle = {
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    available: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    locked: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  }[course.status]

  const CardContent = (
    <button
      onClick={course.status === "locked" ? undefined : onClick}
      className={cn(
        "p-4 rounded-lg border-2 transition-all duration-200 text-left group",
        "hover:shadow-lg hover:scale-105 active:scale-95 disabled:pointer-events-none",
        config.bg,
        config.border,
        course.status === "locked" && "cursor-not-allowed opacity-75 hover:scale-100",
      )}
      disabled={course.status === "locked"}
    >
      {/* Icon and Badge */}
      <div className="flex items-start justify-between mb-3">
        {Icon && <Icon className={cn("w-5 h-5", config.iconColor)} />}
        <span className={cn("text-xs font-semibold px-2 py-1 rounded", badgeStyle)}>{badgeLabel}</span>
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
