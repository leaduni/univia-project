"""
Routers package initialization
"""
from .carreras import router as carreras_router
from .cursos import router as cursos_router
from .malla import router as malla_router
from .learning_path import router as learning_path_router
from .recursos import router as recursos_router
from .dashboard import router as dashboard_router
from .onboarding import router as onboarding_router
from .usuarios import router as usuarios_router
from .auth import router as auth_router

__all__ = [
    "carreras_router",
    "cursos_router",
    "malla_router",
    "learning_path_router",
    "recursos_router",
    "dashboard_router",
    "onboarding_router",
    "usuarios_router",
    "auth_router",
]
