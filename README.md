# UniVia - Plataforma de Orientación Académica

UniVia es una solución integral diseñada para guiar a los estudiantes en su trayectoria académica, proporcionando herramientas visuales, recursos de aprendizaje y análisis inteligente mediante IA.

---

## 🛠️ Stack Tecnológico

El proyecto está dividido en tres componentes principales:

### 📱 Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4 + [Shadcn UI](https://ui.shadcn.com/)
- **Gestión de Datos**: Integración preparada para Supabase y mock data centralizado.
- **Ubicación**: [/frontend](file:///d:/Familia/Escritorio/Work/Univia/univia-project/frontend)

### ⚙️ Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Contenedores**: Docker & Docker Compose
- **Documentación**: Swagger UI (disponible en `/docs`)
- **Ubicación**: [/backend](file:///d:/Familia/Escritorio/Work/Univia/univia-project/backend)

### 🗄️ Database
- **Motor**: PostgreSQL (vía Supabase)
- **Esquemas y Migraciones**: Scripts SQL organizados para la gestión de mallas, cursos y recursos.
- **Ubicación**: [/database](file:///d:/Familia/Escritorio/Work/Univia/univia-project/database)

---

## 📂 Estructura del Proyecto

```text
univia-project/
├── frontend/          # Aplicación Next.js (Dashboard, Malla, Onboarding)
├── backend/           # API REST con FastAPI (Lógica de negocio, Datos)
├── database/          # Esquemas SQL y documentación de la base de datos
├── scripts/           # Utilidades de desarrollo
└── README.md          # Este archivo
```

---

## 🚀 Inicio Rápido

### 1. Clonar el repositorio e instalar dependencias

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### 2. Configuración de Entorno

Asegúrate de configurar los archivos `.env` tanto en `frontend/` como en `backend/` con tus credenciales de Supabase.

### 3. Ejecución del Proyecto

#### Con Docker (Recomendado para Backend)
```bash
cd backend
docker compose up --build
```

#### Desarrollo Local
- **Backend**: `uvicorn app.main:app --reload` (desde la carpeta `backend/`)
- **Frontend**: `npm run dev` (desde la carpeta `frontend/`)

---

## 📚 Documentación Adicional

- [**Guía del Desarrollador (AGENT.md)**](file:///d:/Familia/Escritorio/Work/Univia/univia-project/AGENT.md)
- [**Estado del Proyecto (ROADMAP.md)**](file:///d:/Familia/Escritorio/Work/Univia/univia-project/ROADMAP.md)
- [Guía de Estructura de Frontend](file:///d:/Familia/Escritorio/Work/Univia/univia-project/frontend/PROJECT_STRUCTURE.md)
- [Guía de Integración de API (Frontend)](file:///d:/Familia/Escritorio/Work/Univia/univia-project/frontend/API_INTEGRATION_GUIDE.md)
- [Documentación del Backend](file:///d:/Familia/Escritorio/Work/Univia/univia-project/backend/README.md)
- [Esquema de Base de Datos](file:///d:/Familia/Escritorio/Work/Univia/univia-project/database/supabase-schema-simple.sql)

---

## ✅ Funcionalidades Principales

- **Registro de Estudiantes (RF-EST)**: Gestión de perfil con validación de correo institucional y unicidad de código.
- **Rutas de Aprendizaje (RF-APR)**: Visualización de cursos y módulos semanales integrados con el sílabo.
- **Evaluaciones Dinámicas (RF-APR-03)**: Generación de quizzes y ejercicios de código/IA por módulo.
- **Reforzamiento con IA (RF-APR-05)**: Retroalimentación inteligente basada en el desempeño del estudiante.
- **Panel de Control (RF-ALC-02)**: Vista unificada del progreso académico y próximos pasos.
- **Dashboard Personalizado**: Visualización de progreso y estadísticas del estudiante.
- **Malla Curricular Dinámica**: Seguimiento visual de cursos aprobados, en curso y pendientes.
- **Learning Path**: Ruta detallada de aprendizaje para cada curso.
- **Banco de Exámenes**: Biblioteca de recursos y exámenes históricos.
- **Onboarding Wizard**: Configuración inicial para nuevos estudiantes.

---

**Versión**: 1.0.0  
**Última actualización**: Febrero 2026