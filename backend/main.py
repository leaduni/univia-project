from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="UniVia API",
    description="Backend para la plataforma de orientación académica personalizada",
    version="2.0.0"
)

# Configuración de CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "UniVia API v2.0 - Online", "status": "healthy"}

# Importar Routers
from routers import malla, usuarios, onboarding, dashboard, cursos, evaluaciones

app.include_router(malla.router, prefix="/api", tags=["malla"])
app.include_router(usuarios.router, prefix="/api", tags=["usuarios"])
app.include_router(onboarding.router, prefix="/api", tags=["onboarding"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(cursos.router, prefix="/api", tags=["cursos"])
app.include_router(evaluaciones.router, prefix="/api", tags=["evaluaciones"])
