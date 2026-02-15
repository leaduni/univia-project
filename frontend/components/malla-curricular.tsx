"use client"

import { CourseCard } from "./course-card"


interface Course {
    id: string
    code: string
    name: string
    credits: number
    status: "available" | "in_progress" | "completed" | "locked"
    description?: string
}

interface Ciclo {
    ciclo: string
    credits: number
    courses: Course[]
}

interface MallaCurricularProps {
    malla: Ciclo[]
    isLoading?: boolean
}

export function MallaCurricular({ malla, isLoading = false }: MallaCurricularProps) {
    if (isLoading) {
        return <div>Cargando plan de estudios...</div>
    }

    if (!malla || malla.length === 0) {
        return <div>No hay información del plan de estudios disponible.</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Plan de Estudios</h2>
            </div>

            <div className="space-y-8">
                {malla.map((ciclo) => (
                    <div key={ciclo.ciclo} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-foreground">{ciclo.ciclo}</h3>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                                {ciclo.credits} créditos
                            </span>
                        </div>

                        {/* Scrollable Container */}
                        <div className="w-full overflow-x-auto pb-4">
                            <div className="flex w-max space-x-4">
                                {ciclo.courses.map((course) => (
                                    <div key={course.id} className="w-[300px]">
                                        <CourseCard
                                            id={course.id}
                                            title={course.name}
                                            status={course.status}
                                            progress={course.status === 'completed' ? 100 : (course.status === 'in_progress' ? 0 : 0)}
                                        // Optional props not available in malla response
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
