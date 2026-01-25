# UniVia Backend API

Backend API para UniVia construido con FastAPI y Supabase.

## 🚀 Inicio Rápido

### Requisitos
- Docker y Docker Compose
- Python 3.11+ (para desarrollo local)

### Configuración

1. **Variables de Entorno**

Crea un archivo `.env` en la raíz del backend:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
DEBUG=False
```

2. **Ejecutar con Docker**

```bash
docker compose up --build
```

El servidor estará disponible en `http://localhost:8000`

3. **Desarrollo Local (sin Docker)**

```bash
# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 📁 Estructura del Proyecto

```
backend/
├── app/
│   ├── main.py              # Aplicación FastAPI principal
│   ├── config.py            # Configuración y settings
│   ├── database.py          # Cliente de Supabase
│   │
│   ├── models/              # Modelos Pydantic
│   │   ├── __init__.py
│   │   ├── curso.py         # Modelos de cursos
│   │   ├── usuario.py       # Modelos de usuarios
│   │   ├── recurso.py       # Modelos de recursos
│   │   └── onboarding.py    # Modelos de onboarding
│   │
│   └── routers/             # Endpoints organizados
│       ├── __init__.py
│       ├── carreras.py      # GET /api/carreras
│       ├── cursos.py        # GET /api/cursos/{id}
│       ├── malla.py         # GET /api/malla-curricular
│       ├── learning_path.py # GET /api/curso/{id}/learning-path
│       ├── recursos.py      # GET /api/recursos
│       ├── dashboard.py     # GET /api/dashboard/stats
│       └── onboarding.py    # POST /api/onboarding/complete
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env
```

---

## 📚 API Endpoints

### Documentación Interactiva

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoints Principales

#### Health Check
```
GET /health
```
Verifica el estado del servidor y conexión a Supabase.

#### Carreras
```
GET /api/carreras
GET /api/carreras/{id}
```

#### Malla Curricular
```
GET /api/malla-curricular
```
Retorna la malla curricular con estados de cursos calculados dinámicamente.

#### Cursos
```
GET /api/cursos/{id}
GET /api/curso/{id}/learning-path
```

#### Recursos
```
GET /api/recursos?tipo=Examen&ciclo=2
GET /api/recursos/{id}/download
```

#### Dashboard
```
GET /api/dashboard/stats
GET /api/dashboard/logros
```

#### Onboarding
```
POST /api/onboarding/complete
```

---

## 🔧 Configuración

### Settings (`app/config.py`)

```python
class Settings:
    APP_NAME: str = "UniVia API"
    APP_VERSION: str = "1.0.0"
    SUPABASE_URL: str
    SUPABASE_KEY: str
    ALLOWED_ORIGINS: list
```

### Database (`app/database.py`)

Cliente de Supabase centralizado:

```python
from app.database import get_supabase

supabase = get_supabase()
result = supabase.table("cursos").select("*").execute()
```

---

## 🧪 Testing

### Test de Conexión

```bash
curl http://localhost:8000/health
```

### Test de Base de Datos

```bash
curl http://localhost:8000/api/test-db
```

### Test de Endpoints

```bash
# Obtener carreras
curl http://localhost:8000/api/carreras

# Obtener malla curricular
curl http://localhost:8000/api/malla-curricular

# Obtener recursos
curl http://localhost:8000/api/recursos?tipo=Examen
```

---

## 🔐 Autenticación

**Nota**: La autenticación con JWT está pendiente de implementación.

Actualmente los endpoints marcados con `authorization: Optional[str] = Header(None)` están preparados para recibir tokens JWT pero no los validan.

**TODO**:
- Implementar validación de JWT tokens
- Crear middleware de autenticación
- Agregar endpoints de login/signup

---

## 📊 Modelos de Datos

### Course
```python
class Course(BaseModel):
    id: int
    code: str
    name: str
    credits: int
    status: str  # "completed", "in_progress", "available", "locked"
    description: str
```

### Recurso
```python
class Recurso(BaseModel):
    id: int
    title: str
    code: str
    type: str  # "Examen", "Práctica", "Libro", "Apunte"
    ciclo: int
    downloads: int
    rating: float
```

Ver más modelos en `app/models/`

---

## 🚨 Manejo de Errores

Todos los endpoints retornan errores en formato estándar:

```json
{
  "detail": "Error message here"
}
```

Códigos de estado:
- `200`: Success
- `404`: Not Found
- `500`: Internal Server Error
- `401`: Unauthorized (cuando se implemente auth)

---

## 🔄 CORS

Configurado para permitir requests desde:
- `http://localhost:3000` (Frontend dev)
- `http://localhost:3001`
- `https://univia.app` (Producción)

Modificar en `app/config.py` si es necesario.

---

## 📝 Logs

Los logs se muestran en la consola cuando ejecutas con Docker:

```bash
docker compose logs -f
```

---

## 🛠️ Desarrollo

### Agregar un Nuevo Endpoint

1. Crear router en `app/routers/nuevo_router.py`
2. Definir modelos en `app/models/` si es necesario
3. Importar y registrar en `app/main.py`:

```python
from app.routers import nuevo_router

app.include_router(nuevo_router, prefix="/api")
```

### Hot Reload

Con `uvicorn --reload`, los cambios se reflejan automáticamente.

---

## 📦 Dependencias

- **FastAPI**: Framework web
- **Uvicorn**: ASGI server
- **Supabase**: Cliente de base de datos
- **Pydantic**: Validación de datos
- **python-dotenv**: Variables de entorno

---

## 🚀 Deployment

### Docker

```bash
docker build -t univia-backend .
docker run -p 8000:8000 --env-file .env univia-backend
```

### Variables de Entorno en Producción

Asegúrate de configurar:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `DEBUG=False`

---

## 📞 Soporte

Para más información, consulta:
- `database/API_ENDPOINTS.md` - Documentación completa de endpoints
- `database/INTEGRATION_GUIDE.md` - Guía de integración
- `/docs` - Documentación interactiva Swagger

---

## ✅ Checklist de Implementación

- [x] Estructura básica del proyecto
- [x] Configuración de Supabase
- [x] Modelos Pydantic
- [x] Routers para todos los endpoints principales
- [x] CORS configurado
- [x] Health check endpoints
- [ ] Autenticación JWT
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Logging estructurado
- [ ] Rate limiting
- [ ] Caching

---

**Versión**: 1.0.0  
**Última actualización**: 2026-01-24
