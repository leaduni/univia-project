# 🗺️ Roadmap - UniVia

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
