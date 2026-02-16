# 🚀 GUÍA DE EJECUCIÓN - UniVia Platform

## ✅ SISTEMA COMPLETO IMPLEMENTADO

### 📌 Funcionalidades Disponibles
- ✅ Backend FastAPI con autenticación
- ✅ Frontend Next.js 
- ✅ Sistema de Evaluaciones con IA (Gemini API)
  - RF-APR-02: Módulos de aprendizaje por semanas
  - RF-APR-03: Evaluaciones con múltiple selección, única respuesta, V/F
  - RF-APR-04: Configuración personalizada (lenguaje, metodología)
  - RF-APR-05: Retroalimentación inteligente con IA

---

## 🔧 CONFIGURACIÓN INICIAL (Una sola vez)

### 1. Instalar Dependencias del Backend
```powershell
cd backend
pip install -r requirements.txt
```

### 2. Instalar Dependencias del Frontend  
```powershell
cd frontend
npm install
# o si usas pnpm:
pnpm install
```

### 3. Verificar Archivos .env

**Backend (.env)**
```
SUPABASE_URL=https://pggpscrbpcasbgjhjigw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyD_u7EC3rXIyS0qAdfHyScAu-f8yKaTN6A
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_SUPABASE_URL=https://pggpscrbpcasbgjhjigw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🎯 CÓMO EJECUTAR EL SISTEMA

### Opción 1: Terminal Integrada de VS Code

**1. Abrir Terminal 1 (Backend):**  
```powershell
cd "C:\Users\Rafael Cly\Desktop\Developer\Proyectos\univia-project\backend"
python -m uvicorn main:app --reload --port 8000
```

**Deberías ver:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**2. Abrir Terminal 2 (Frontend):**  
```powershell
cd "C:\Users\Rafael Cly\Desktop\Developer\Proyectos\univia-project\frontend"
npm run dev
```

**Deberías ver:**
```
▲ Next.js 16.0.10
- Local:    http://localhost:3000
```

---

### Opción 2: Comandos Rápidos desde la Raíz

**Terminal 1 - Backend:**
```powershell
cd backend; python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```powershell
cd frontend; npm run dev
```

---

## 🛠️ REQUISITO DE INFRAESTRUCTURA (Para Evaluaciones de Programación)

Para poder ejecutar y validar los retos de programación, es **indispensable** tener la instancia de Judge0 corriendo localmente a través de Docker.

Para más detalles sobre la arquitectura y el despliegue, consulta la guía: `evaluacion_programacion/GUIDE_JUDGE0.md`.

---

## 🧪 PROBAR EL SISTEMA

### 1. Verificar Backend
Abre en tu navegador:
```
http://localhost:8000/docs
```
Verás la documentación automática de FastAPI (Swagger UI)

### 2. Verificar Frontend
Abre en tu navegador:
```
http://localhost:3000
```
Verás la interfaz de UniVia

### 3. Probar Sistema de Evaluaciones con IA

**Desde terminal:**
```powershell
python test_evaluaciones.py
```

**O visita directamente:**
```
http://localhost:8000/api/evaluaciones/test
```

---

## 📊 ENDPOINTS DE EVALUACIONES

### GET /api/evaluaciones/test
Verifica que Gemini API esté funcionando

### POST /api/evaluaciones/generar
Genera una evaluación con IA

**Nota técnica:** El prompt del sistema que se envía a Gemini es dinámico. Si el curso es de programación, el campo `pregunta` devolverá un objeto JSON estructurado (`{contexto, input, output_esperado}`). Para otros cursos, será un `string` simple.


**Ejemplo de request:**
```json
{
  "curso_id": 102,
  "modulo": "Semana 7: Límites",
  "temas": ["Límites algebraicos", "Límites Trigonométricos"],
  "num_preguntas": 5,
  "observaciones": "Curso de Cálculo Diferencial - FIIS UNI",
  "tipo_evaluacion": "mixta"
}
```

### POST /api/evaluaciones/evaluar
Evalúa respuestas y genera retroalimentación con IA

**Nota técnica:** Para los retos de programación, este endpoint integra los resultados del motor de ejecución **Judge0**. Compara el `stdout` del código del usuario con el `output_esperado` para validar la corrección técnica de la respuesta.

---

## ⚡ SOLUCIÓN DE PROBLEMAS

### Error: "Could not read package.json"
**Causa:** Estás ejecutando `npm run dev` desde la raíz  
**Solución:** Navega primero a `frontend/`
```powershell
cd frontend
npm run dev
```

### Error: "Module not found: google.genai"
**Causa:** Falta instalar dependencias
**Solución:**
```powershell
cd backend
pip install -r requirements.txt
```

### Backend no arranca en puerto 8000
**Causa:** Puerto en uso
**Solución:**
```powershell
# Encontrar proceso usando el puerto
netstat -ano | findstr :8000

# Matar el proceso (reemplaza PID)
taskkill /PID <número> /F
```

### Frontend muestra "Failed to fetch"
**Causa:** Backend no está corriendo  
**Solución:** Inicia el backend primero

---

## 🔑 INFORMACIÓN DE LA API DE GEMINI

### Límites del Tier Gratuito:
- ✅ **1,000,000 tokens/día** - Suficiente para desarrollo
- ✅ **15 requests por minuto**
- ✅ **Sin expiración** - Uso indefinido
- ✅ **Sin costo** mientras estés dentro de los límites

### Modelo Usado:
- `gemini-2.0-flash-exp` - Rápido y eficiente

---

## 📱 URLS PRINCIPALES

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:3000 | Interfaz principal |
| Backend API | http://localhost:8000 | API REST |
| API Docs | http://localhost:8000/docs | Documentación interactiva |
| API Redoc | http://localhost:8000/redoc | Docs alternativa |

---

## 🎓 PRÓXIMOS PASOS

1. ✅ Backend funcionando
2. ✅ Frontend funcionando
3. ✅ Sistema de evaluaciones con IA implementado
4. ✅ Crear interfaz de evaluaciones en frontend
5. 📝 Implementar banco de exámenes
6. ✅ Panel de código ejecutable para programación
7. 📝 Refinamiento de prompts y casos de prueba complejos (Deuda técnica)

---

## 💡 TIPS

- Mantén ambos terminales abiertos mientras desarrollas
- El backend se recarga automáticamente al guardar cambios (--reload)
- El frontend también tiene hot reload
- Usa Ctrl+C para detener cualquier servidor
- Revisa http://localhost:8000/docs para probar los endpoints

---

## 🆘 AYUDA

Si tienes problemas:
1. Verifica que ambos servicios estén corriendo
2. Revisa los archivos .env
3. Asegúrate de estar en el directorio correcto
4. Ejecuta: `python test_evaluaciones.py` para diagnóstico

---

**¡Sistema listo para usar! 🚀**
