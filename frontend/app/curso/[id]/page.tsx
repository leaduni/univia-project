"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { LearningPath } from "@/components/learning-path"

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardLayout>
      <LearningPath courseId={params.id} />
    </DashboardLayout>
  )
}
