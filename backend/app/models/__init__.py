"""
Models package initialization
"""
from .curso import Course, CourseDetail, LearningPath, TimelineStep, AIInsight, ExamBankItem
from .usuario import UserBase, UserCreate, UserUpdate, UserProfile, EstudianteCreate
from .recurso import Recurso
from .onboarding import OnboardingData, OnboardingResponse

__all__ = [
    "Course",
    "CourseDetail",
    "LearningPath",
    "TimelineStep",
    "AIInsight",
    "ExamBankItem",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserProfile",
    "EstudianteCreate",
    "Recurso",
    "OnboardingData",
    "OnboardingResponse",
]
