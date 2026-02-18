# 🗺️ Roadmap - UniVia

Este documento detalla la ruta de desarrollo alineada con los requerimientos funcionales (RF) del proyecto.

## 📌 Estado Actual del Proyecto
- **Frontend**: Operativo con Next.js 14, Tailwind y ShadcnUI.
- **Backend**: FastAPI integrado con Supabase.
- **Base de Datos**: Esquema desplegado y con datos semilla.

---

## 🚀 Fase 1: Alcance Inicial y Estructura (RF-ALC)
**Objetivo**: Establecer los cimientos del MVP (RF-ALC-01, RF-ALC-02).

- [x] **Plataforma Web (MVP)**: Despliegue inicial con Next.js.
- [x] **Diseño UI/UX**: Implementación de ShadcnUI y temas.
- [x] **Base de Datos**: Esquema inicial en Supabase.

## 👤 Fase 2: Registro y Perfil de Estudiante (RF-EST & RF-PRF)
**Objetivo**: Gestión de usuarios y configuración académica.

- [x] **Registro de Usuarios (RF-EST-01)**:
    - [x] Autenticación con Supabase Auth.
    - [x] Validación de correo institucional (@uni.pe) (RF-EST-02).
    - [x] Unicidad de código universitario.
- [x] **Configuración de Perfil**:
    - [x] Selección de carrera y ciclo relativo.
    - [x] Carga inicial de cursos (RF-EST-01).
- [ ] **Gestión de Perfil (RF-PRF)**:
    - [ ] Actualización de lista de cursos (RF-PRF-01).
    - [ ] Actualización de nombres/apellidos (RF-PRF-02).
    - [ ] Actualización de contraseña segura (RF-PRF-03).
- [ ] **Validaciones Académicas**:
    - [ ] Restricción por prerrequisitos (RF-EST-03).

## 📚 Fase 3: Rutas de Aprendizaje y Evaluaciones (RF-APR)
**Objetivo**: Núcleo educativo del sistema.

- [x] **Malla Curricular**: Visualización de cursos y estados.
- [x] **Pantalla Inicial (RF-APR-01)**: Lista de cursos y avance.
- [ ] **Módulos de Aprendizaje (RF-APR-02)**:
    - [ ] Segmentación por semanas (sílabo).
    - [ ] Visualización de recursos semana a semana.
- [ ] **Sistema de Evaluación (RF-APR-03)**:
    - [ ] Motor de quizzes (Opción múltiple, V/F).
    - [ ] Panel de código para cursos de programación.
    - [ ] Configuración de evaluaciones (RF-APR-04).
- [ ] **Reforzamiento con IA (RF-APR-05)**:
    - [ ] Feedback automático basado en resultados.
    - [ ] Generación de preguntas de refuerzo.

## 🛠️ Stack Tecnológico
- **Frontend**: Next.js, TypeScript, Tailwind CSS.
- **Backend**: Python (FastAPI).
- **Base de Datos**: PostgreSQL (Supabase).
- **IA**: (Pendiente) Integración con LLMs para RF-APR-05.

---

## 📈 Próximos Pasos Prioritarios
1. Implementar la validación de prerrequisitos (RF-EST-03).
2. Desarrollar la vista de detalle del curso con módulos semanales (RF-APR-02).
3. Integrar el motor de evaluaciones básicas (RF-APR-03).
