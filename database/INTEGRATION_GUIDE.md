# UniVia - Guía de Integración Backend-Frontend

## 📋 Resumen

Este documento te guía paso a paso para integrar el backend de Supabase con el frontend de UniVia, garantizando que todos los endpoints funcionen correctamente.

---

## 🗂️ Archivos Creados

### 1. **`supabase-schema.sql`**
Esquema completo de la base de datos con:
- ✅ 20+ tablas relacionadas
- ✅ Índices para optimización
- ✅ Triggers para actualización automática
- ✅ Row Level Security (RLS) configurado
- ✅ Políticas de seguridad

### 2. **`seed-data.sql`**
Datos de ejemplo que coinciden con `mockData.ts`:
- ✅ Facultades y carreras
- ✅ Ciclos y cursos completos (4 ciclos)
- ✅ Profesores y secciones
- ✅ Timeline de aprendizaje
- ✅ Recursos y banco de exámenes
- ✅ Logros

### 3. **`API_ENDPOINTS.md`**
Documentación completa de todos los endpoints que el frontend necesita

---

## 🚀 Pasos de Implementación

### Paso 1: Configurar Supabase

1. **Crear proyecto en Supabase**
   - Ve a [supabase.com](https://supabase.com)
   - Crea un nuevo proyecto
   - Guarda la URL y la API Key

2. **Ejecutar el esquema**
   ```bash
   # En el SQL Editor de Supabase, ejecuta:
   # 1. supabase-schema.sql
   # 2. seed-data.sql
   ```

3. **Configurar variables de entorno**
   
   Crea `.env.local` en el frontend:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

   Crea `.env` en el backend:
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

---

### Paso 2: Configurar el Backend (FastAPI)

1. **Instalar dependencias**
   ```bash
   cd backend
   pip install fastapi uvicorn supabase python-dotenv pydantic
   ```

2. **Estructura recomendada del backend**
   ```
   backend/
   ├── app/
   │   ├── main.py              # FastAPI app principal
   │   ├── config.py            # Configuración y variables de entorno
   │   ├── database.py          # Cliente de Supabase
   │   ├── models/              # Modelos Pydantic
   │   │   ├── curso.py
   │   │   ├── estudiante.py
   │   │   ├── recurso.py
   │   │   └── ...
   │   ├── routers/             # Endpoints organizados
   │   │   ├── auth.py
   │   │   ├── cursos.py
   │   │   ├── malla.py
   │   │   ├── recursos.py
   │   │   ├── dashboard.py
   │   │   └── ...
   │   └── utils/               # Utilidades
   │       ├── auth.py          # Middleware de autenticación
   │       └── helpers.py
   ├── requirements.txt
   └── .env
   ```

3. **Ejemplo de configuración (`app/database.py`)**
   ```python
   from supabase import create_client, Client
   import os
   from dotenv import load_dotenv

   load_dotenv()

   supabase: Client = create_client(
       os.getenv("SUPABASE_URL"),
       os.getenv("SUPABASE_SERVICE_ROLE_KEY")
   )
   ```

4. **Ejemplo de endpoint (`app/routers/cursos.py`)**
   ```python
   from fastapi import APIRouter, Depends, HTTPException
   from app.database import supabase
   from app.utils.auth import get_current_user

   router = APIRouter(prefix="/api/cursos", tags=["cursos"])

   @router.get("/{curso_id}")
   async def get_curso(curso_id: str):
       result = supabase.table("cursos").select("*").eq("id", curso_id).execute()
       if not result.data:
           raise HTTPException(status_code=404, detail="Curso no encontrado")
       return result.data[0]
   ```

---

### Paso 3: Actualizar el Frontend

1. **Instalar Supabase client**
   ```bash
   cd frontend
   npm install @supabase/supabase-js
   ```

2. **Crear cliente de Supabase (`lib/supabase.ts`)**
   ```typescript
   import { createClient } from '@supabase/supabase-js'

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

3. **Crear funciones API (`lib/api/cursos.ts`)**
   ```typescript
   import { supabase } from '@/lib/supabase'

   export async function getCursos() {
     const { data, error } = await supabase
       .from('cursos')
       .select('*')
     
     if (error) throw error
     return data
   }

   export async function getCursoById(id: string) {
     const { data, error } = await supabase
       .from('cursos')
       .select('*')
       .eq('id', id)
       .single()
     
     if (error) throw error
     return data
   }
   ```

4. **Migrar de mockData a API (ejemplo)**
   
   **Antes:**
   ```typescript
   import { CURRICULUM_DATA } from "@/lib/mockData"
   
   export default function MallaView() {
     const data = CURRICULUM_DATA
     return <MallaGrid data={data} />
   }
   ```

   **Después:**
   ```typescript
   import { getMallaCurricular } from "@/lib/api/malla"
   
   export default async function MallaView() {
     const data = await getMallaCurricular()
     return <MallaGrid data={data} />
   }
   ```

---

### Paso 4: Implementar Autenticación

1. **Backend: Middleware de autenticación**
   ```python
   from fastapi import Depends, HTTPException, Header
   from app.database import supabase

   async def get_current_user(authorization: str = Header(None)):
       if not authorization or not authorization.startswith("Bearer "):
           raise HTTPException(status_code=401, detail="No autorizado")
       
       token = authorization.split(" ")[1]
       user = supabase.auth.get_user(token)
       
       if not user:
           raise HTTPException(status_code=401, detail="Token inválido")
       
       return user
   ```

2. **Frontend: Context de autenticación**
   ```typescript
   'use client'
   import { createContext, useContext, useEffect, useState } from 'react'
   import { supabase } from '@/lib/supabase'
   import { User } from '@supabase/supabase-js'

   const AuthContext = createContext<{ user: User | null }>({ user: null })

   export function AuthProvider({ children }: { children: React.ReactNode }) {
     const [user, setUser] = useState<User | null>(null)

     useEffect(() => {
       supabase.auth.getSession().then(({ data: { session } }) => {
         setUser(session?.user ?? null)
       })

       const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
         setUser(session?.user ?? null)
       })

       return () => subscription.unsubscribe()
     }, [])

     return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
   }

   export const useAuth = () => useContext(AuthContext)
   ```

---

## 🔄 Mapeo Frontend ↔ Backend

### Tipos TypeScript → Tablas SQL

| Frontend Type | Tabla SQL | Notas |
|--------------|-----------|-------|
| `Course` | `cursos` | Status se calcula dinámicamente |
| `Recurso` | `recursos` | Mapeo directo |
| `OnboardingData` | `estudiantes` | Se guarda al completar onboarding |

### Endpoints Críticos

| Página Frontend | Endpoint Backend | Tabla(s) Principal(es) |
|----------------|------------------|----------------------|
| `/` (Dashboard) | `GET /api/dashboard/stats` | `matriculas`, `estadisticas_estudiante` |
| `/mi-malla` | `GET /api/malla-curricular` | `cursos`, `ciclos`, `matriculas` |
| `/curso/[id]` | `GET /api/curso/{id}/learning-path` | `secciones_curso`, `timeline_pasos`, `ai_insights` |
| `/recursos` | `GET /api/recursos` | `recursos` |
| `/onboarding` | `POST /api/onboarding/complete` | `estudiantes`, `matriculas` |

---

## 🧪 Testing y Verificación

### 1. Verificar Schema
```sql
-- En Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deberías ver 20+ tablas
```

### 2. Verificar Seed Data
```sql
SELECT COUNT(*) FROM cursos;  -- Debería ser 20
SELECT COUNT(*) FROM carreras;  -- Debería ser 4
SELECT COUNT(*) FROM recursos;  -- Debería ser 8
```

### 3. Probar Endpoints
```bash
# Usando curl o Postman
curl http://localhost:8000/api/carreras
curl http://localhost:8000/api/cursos/curso-c201
```

### 4. Verificar Frontend
```bash
cd frontend
npm run dev
# Visita http://localhost:3000
```

---

## 📊 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Dashboard │  │Mi Malla  │  │  Curso   │  │Recursos │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │              │              │      │
│       └─────────────┴──────────────┴──────────────┘      │
│                         │                                │
│                  ┌──────▼──────┐                         │
│                  │  Supabase   │                         │
│                  │   Client    │                         │
│                  └──────┬──────┘                         │
└─────────────────────────┼────────────────────────────────┘
                          │
                          │ HTTP/REST
                          │
┌─────────────────────────▼────────────────────────────────┐
│                 BACKEND (FastAPI)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Auth    │  │  Cursos  │  │  Malla   │  │Recursos │ │
│  │ Router   │  │  Router  │  │  Router  │  │ Router  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │              │              │      │
│       └─────────────┴──────────────┴──────────────┘      │
│                         │                                │
│                  ┌──────▼──────┐                         │
│                  │  Supabase   │                         │
│                  │   Client    │                         │
│                  └──────┬──────┘                         │
└─────────────────────────┼────────────────────────────────┘
                          │
                          │ PostgreSQL Protocol
                          │
┌─────────────────────────▼────────────────────────────────┐
│                  SUPABASE DATABASE                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Usuarios │  │  Cursos  │  │Matrículas│  │Recursos │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Estudiantes│ │  Ciclos  │  │ Timeline │  │ Logros  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                          │
│  + Row Level Security (RLS)                              │
│  + Triggers automáticos                                  │
│  + Índices optimizados                                   │
└──────────────────────────────────────────────────────────┘
```

---

## ⚠️ Consideraciones Importantes

### Seguridad
- ✅ **RLS habilitado** en todas las tablas sensibles
- ✅ Los estudiantes solo ven sus propios datos
- ✅ Datos públicos (cursos, recursos) accesibles para todos
- ⚠️ Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend

### Performance
- ✅ Índices creados en columnas frecuentemente consultadas
- ✅ Usa `select('*')` con cuidado, especifica solo campos necesarios
- ✅ Implementa paginación en listas largas

### Estado de Cursos
El `status` de un curso se calcula dinámicamente:
```typescript
function calcularEstadoCurso(curso, matriculas, prerequisitos) {
  const matricula = matriculas.find(m => m.curso_id === curso.id)
  
  if (matricula?.estado === 'completed') return 'completed'
  if (matricula?.estado === 'in_progress') return 'in_progress'
  
  const prerequisitosCumplidos = prerequisitos.every(p => 
    matriculas.some(m => m.curso_id === p.id && m.estado === 'completed')
  )
  
  return prerequisitosCumplidos ? 'available' : 'locked'
}
```

---

## 🎯 Próximos Pasos

1. ✅ Ejecutar `supabase-schema.sql` en Supabase
2. ✅ Ejecutar `seed-data.sql` para datos de prueba
3. ⬜ Implementar endpoints del backend según `API_ENDPOINTS.md`
4. ⬜ Migrar frontend de `mockData.ts` a llamadas API reales
5. ⬜ Implementar autenticación completa
6. ⬜ Testing end-to-end

---

## 📞 Soporte

Si tienes dudas sobre:
- **Schema SQL**: Revisa `supabase-schema.sql` y sus comentarios
- **Endpoints**: Consulta `API_ENDPOINTS.md`
- **Datos de ejemplo**: Revisa `seed-data.sql`

¡Buena suerte con la integración! 🚀
