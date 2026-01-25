"""
Pydantic models for Course-related endpoints
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class Course(BaseModel):
    id: int
    code: str
    name: str
    credits: int
    status: str  # "completed", "in_progress", "available", "locked"
    description: str

class CourseDetail(BaseModel):
    id: int
    code: str
    name: str
    credits: int
    description: str
    ciclo: dict
    prerequisitos: List[dict]

class TimelineStep(BaseModel):
    id: int
    title: str
    description: str
    duration: str
    status: str
    topics: List[str]
    icon: str
    resources: List[dict]

class AIInsight(BaseModel):
    type: str
    title: str
    description: str
    impact: str
    action: str

class ExamBankItem(BaseModel):
    id: int
    title: str
    type: str
    year: int
    difficulty: str
    questions: int
    duration: int
    downloads: int
    hasAnswers: bool

class LearningPath(BaseModel):
    curso: dict
    timeline: List[TimelineStep]
    ai_insights: List[AIInsight]
    exam_bank: List[ExamBankItem]
