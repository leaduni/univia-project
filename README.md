# UniVia - Plataforma de Orientación Académica

UniVia es una solución integral diseñada para guiar a los estudiantes en su trayectoria académica, proporcionando herramientas visuales, recursos de aprendizaje y análisis inteligente mediante IA.

---

## 🛠️ Stack Tecnológico

El proyecto está dividido en los siguientes componentes principales:

### 📱 Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4 + [Shadcn UI](https://ui.shadcn.com/)
- **Gestión de Datos**: Supabase (auth) + API propia vía `lib/api-service.ts`
- **Ubicación**: [/frontend](./frontend)

### ⚙️ Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+), organizado como paquete `app/` (`app/main.py`, `app/core/`, `app/routers/`, `app/rag/`)
- **Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL + pgvector)
- **Contenedores**: Docker & Docker Compose
- **Documentación**: Swagger UI (disponible en `/docs`)
- **Ubicación**: [/backend](./backend)

### 🗄️ Base de Datos
- **Motor**: PostgreSQL (vía Supabase)
- **Esquemas, semillas y SQL del RAG**: organizados en `base_de_datos/`
- **Ubicación**: [/base_de_datos](./base_de_datos)

### 📥 Ingesta de Sílabos (RAG)
- Pipeline de scraping/extracción de sílabos y exámenes pasados ("planchas") que alimenta el sistema RAG del backend.
- No versionado en detalle (carpeta ignorada por git salvo scripts base); ver `.gitignore`.
- **Ubicación**: [/ingesta_silabos](./ingesta_silabos)

### 🧪 Motor de Ejecución de Código
- Infraestructura de [Judge0](https://judge0.com/) usada para evaluar ejercicios de programación de los estudiantes.
- **Ubicación**: [/motor_ejecucion_codigo](./motor_ejecucion_codigo)

---

## 📂 Estructura del Proyecto

```text
univia-project/
├── frontend/               # Aplicación Next.js (Dashboard, Malla, Onboarding)
├── backend/                # API REST con FastAPI (paquete app/: core, routers, rag)
├── base_de_datos/          # Esquemas SQL, semillas y SQL del RAG
├── ingesta_silabos/        # Pipeline de scraping/RAG de sílabos y exámenes
├── motor_ejecucion_codigo/ # Infraestructura Judge0 (ejecución de código)
├── documentacion/          # Documentación de marca, planificación y manuales
├── mallas_curriculares/    # PDFs de referencia de mallas curriculares
├── GUIA_EJECUCION.md       # Guía de instalación y ejecución
├── ROADMAP.md              # Estado y hoja de ruta del proyecto
├── AGENTE.md               # Contexto operativo para agentes de IA
├── iniciar.bat             # Arranque rápido de backend + frontend (Windows)
└── README.md               # Este archivo
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

O usa `iniciar.bat` desde la raíz del proyecto para levantar ambos servicios a la vez (Windows).

---

## 📚 Documentación Adicional

- [**Guía del Desarrollador (AGENTE.md)**](./AGENTE.md)
- [**Estado del Proyecto (ROADMAP.md)**](./ROADMAP.md)
- [**Guía de Ejecución (GUIA_EJECUCION.md)**](./GUIA_EJECUCION.md)
- [Guía de Estructura de Frontend (desactualizada, en revisión)](./frontend/docs/PROJECT_STRUCTURE.md)
- [Guía de Integración de API (desactualizada, en revisión)](./frontend/docs/API_INTEGRATION_GUIDE.md)
- [Guía de Judge0](./motor_ejecucion_codigo/GUIA_JUDGE0.md)
- [Esquema de Base de Datos](./base_de_datos/esquema/db_schema.sql)

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
**Última actualización**: Julio 2026
