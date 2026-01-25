from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import get_supabase
from app.routers import (
    carreras_router,
    cursos_router,
    malla_router,
    learning_path_router,
    recursos_router,
    dashboard_router,
    onboarding_router,
    usuarios_router,
    auth_router
)

# Inicializar FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="API Backend para UniVia - Sistema de Gestión Académica",
    version=settings.APP_VERSION
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(carreras_router, prefix="/api")
app.include_router(cursos_router, prefix="/api")
app.include_router(malla_router, prefix="/api")
app.include_router(learning_path_router, prefix="/api")
app.include_router(recursos_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(onboarding_router, prefix="/api")
app.include_router(usuarios_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "message": "UniVia Backend API",
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """Endpoint para verificar el estado del servidor y la conexión a Supabase"""
    try:
        supabase = get_supabase()
        # Try a simple query to test connection
        supabase.table("carreras").select("id").limit(1).execute()
        supabase_connected = True
    except:
        supabase_connected = False
    
    return {
        "status": "healthy",
        "supabase_connected": supabase_connected,
        "supabase_url": settings.SUPABASE_URL
    }

@app.get("/api/test-db")
async def test_database():
    """Endpoint para probar la conexión con la base de datos"""
    try:
        supabase = get_supabase()
        # Intentar obtener las carreras como prueba
        result = supabase.table("carreras").select("*").limit(5).execute()
        
        return {
            "status": "success",
            "message": "Conexión a base de datos exitosa",
            "carreras_count": len(result.data),
            "carreras": result.data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al conectar con la base de datos: {str(e)}"
        )
