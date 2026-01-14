// Datos mock para desarrollo frontend

export const mockCourses = [
  {
    id: "c101",
    code: "CS101",
    name: "Programación Fundamental",
    credits: 4,
    description: "Introducción a los conceptos básicos de programación using Python",
    ciclo: 1,
    status: "completed",
    created_at: "2026-01-01T10:00:00Z"
  },
  {
    id: "c102",
    code: "MAT101",
    name: "Cálculo I",
    credits: 4,
    description: "Fundamentos de límites, derivadas e integrales",
    ciclo: 1,
    status: "completed",
    created_at: "2026-01-01T10:00:00Z"
  }
];

export const mockLearningPaths = [
  {
    id: "lp1",
    course_id: "c101",
    professor: "Dr. Juan Pérez",
    progress: 80,
    start_date: "2026-01-10",
    end_date: "2026-06-10",
    created_at: "2026-01-10T09:00:00Z"
  }
];

export const mockResources = [
  {
    id: "r101",
    title: "Examen Final Programación",
    code: "CS101",
    type: "Examen",
    ciclo: 1,
    year: 2025,
    downloads: 120,
    rating: 4.8,
    created_at: "2026-01-12T12:00:00Z"
  }
];
