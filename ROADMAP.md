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

---

Este documento detalla la ruta de desarrollo del proyecto UniVia, el estado actual de los módulos y las tareas pendientes para completar la plataforma.

## 📌 Estado Actual del Proyecto
- **Frontend**: Totalmente integrado con Supabase Auth y Backend API. Navegación fluida y persistencia de datos funcional.
- **Backend (FastAPI)**: Operativo y conectado a Supabase. Gestiona perfiles, currículum y progreso real de los estudiantes.
- **Base de Datos**: Esquema de Supabase configurado y poblado con datos reales (Facultades, Carreras, Cursos).

---

## 🚀 Fase 1: Cimentación y Diseño (Completado ✅)
- [x] Estructura base del Dashboard (Next.js + ShadcnUI).
- [x] Visualización de la Malla Curricular (Componentes UI).
- [x] Mock Data para visualización inmediata inicial.
- [x] Onboarding Wizard (Interfaz y flujo de pasos).
- [x] Biblioteca de Recursos (Filtros y lista de materiales).

## 🔒 Fase 2: Autenticación y Navegación (Completado ✅)
- [x] Integración con Supabase Auth (Registro e Inicio de sesión reales).
- [x] Manejo de Sesión (JWT con Supabase).
- [x] Protección de rutas mediante Middleware/Context.
- [x] Perfiles de usuario automáticos con Triggers en Base de Datos.

## ⚙️ Fase 3: Integración de Backend y Datos (Completado ✅)
- [x] Configuración de FastAPI con Cliente de Supabase (Python).
- [x] Sincronización de Onboarding con persistencia en Base de Datos.
- [x] Endpoint de Malla Curricular con estados reales (`completed`, `in_progress`).
- [x] Corrección de IDs de cursos sincronizados entre Frontend y DB.

## 🧠 Fase 4: Inteligencia y Valor Agregado (Próximamente 🔜)
- [ ] **IA de Recomendación**: Generación de insights basados en el rendimiento académico.
- [ ] **Biblioteca Avanzada**: Buscador inteligente y categorización automática de recursos.
- [ ] **Gamificación**: Visualización de logros y barras de progreso por ciclos y carrera.
- [ ] **Ruta Interactiva**: Visualización de prerrequisitos avanzada en la malla.

---

## 🛠️ Stack Tecnológico
- **Frontend**: React (Next.js 14), Tailwind CSS, Lucide React, Radix UI.
- **Backend**: Python (FastAPI), Supabase (Auth, DB).
- **Herramientas**: MCP Supabase Server para gestión de base de datos.
- **IA**: (Pendiente) Integración con modelos de lenguaje para análisis de datos.

---

## 📈 Próximos Pasos Inmediatos
1. Implementar la API de **Gamificación** para leer y mostrar logros reales en el dashboard.
2. Diseñar el motor de **IA Insights** para sugerir cursos y recursos según el progreso del usuario.
3. Optimizar la **Biblioteca Central** con búsqueda por palabras clave en tiempo real.
