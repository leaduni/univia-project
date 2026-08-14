# ADR 0001 - Selección Flexible de Cursos y Validación en Cadena de Prerrequisitos en Onboarding

- **Estado:** ACEPTADO
- **Fecha:** 2026-08-10
- **Autores:** Luis & Equipo Lead UNI

## Contexto y Problema

UniVia es un asistente de aprendizaje académico. Los estudiantes no necesariamente usan la plataforma para cada asignatura de su carrera, ya que pueden haber aprobado materias en ciclos anteriores sin registrar actividad en la app.

Por ende, exigir una secuencia rígida donde el usuario deba marcar todos los cursos previos como completados antes de usar la plataforma genera fricción innecesaria.

## Decisión de Diseño

1. **Selección "Hacia Atrás" (Flexibilidad de Ciclo):**
   - El estudiante es libre de seleccionar cualquier curso de su ciclo actual o de ciclos anteriores durante el flujo de onboarding.

2. **Validación Estricta de la Cadena de Ancestros (Integridad de la Malla):**
   - Un curso **se bloqueará** automáticamente si cualquiera de sus **prerrequisitos directos o indirectos** (prerrequisitos de sus prerrequisitos y toda su línea sucesiva hacia arriba) se encuentra en estado "En progreso" o no ha sido satisfecho.
   - El backend debe evaluar recursivamente el grafo de la malla curricular para garantizar que ningún curso se habilite si sus ancestros directos no están correctamente resueltos.

## Consecuencias

- **Positivas:** Autonomía total para el estudiante al enfocarse solo en los cursos que le interesan en la app. Eliminación de bloqueos innecesarios en el onboarding.
- **Mitigación:** La validación recursiva en el backend evita incoherencias lógicas (ej. llevar un curso de nivel avanzado teniendo la materia base en progreso).
