// Curso detail page - learning path, exams, resources
import { DashboardLayout } from "@/components/dashboard-layout"
import { LearningPath } from "@/components/learning-path"

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <DashboardLayout>
      <LearningPath courseId={id} />
    </DashboardLayout>
  )
}
