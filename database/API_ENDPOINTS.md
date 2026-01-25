# UniVia - API Endpoints Documentation

## Resumen
Este documento define todos los endpoints de la API que el frontend necesita para funcionar correctamente, basado en el análisis del código frontend.

---

## 🔐 Autenticación

### POST `/api/auth/signup`
Registrar nuevo usuario

**Request Body:**
```json
{
  "email": "estudiante@univia.edu",
  "password": "password123",
  "nombre_completo": "Juan Pérez"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "estudiante@univia.edu",
    "nombre_completo": "Juan Pérez"
  },
  "session": { "access_token": "...", "refresh_token": "..." }
}
```

### POST `/api/auth/login`
Iniciar sesión

**Request Body:**
```json
{
  "email": "estudiante@univia.edu",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": { "id": "uuid", "email": "...", "nombre_completo": "..." },
  "session": { "access_token": "...", "refresh_token": "..." }
}
```

---

## 👤 Perfil de Usuario

### GET `/api/perfil`
Obtener perfil del usuario autenticado

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "estudiante@univia.edu",
  "nombre_completo": "Juan Pérez",
  "foto_url": "https://...",
  "carrera": {
    "id": "uuid",
    "codigo": "CS",
    "nombre": "Ingeniería en Ciencias de la Computación",
    "facultad": "Ingeniería"
  },
  "ciclo_actual": 2,
  "codigo_estudiante": "2024001",
  "onboarding_completado": true
}
```

### PUT `/api/perfil`
Actualizar perfil del usuario

**Request Body:**
```json
{
  "nombre_completo": "Juan Carlos Pérez",
  "foto_url": "https://..."
}
```

---

## 🎓 Carreras y Catálogos

### GET `/api/carreras`
Obtener lista de carreras disponibles

**Response:**
```json
[
  {
    "id": "uuid",
    "codigo": "CS",
    "nombre": "Ingeniería en Ciencias de la Computación",
    "facultad": "Ingeniería",
    "descripcion": "Programa de formación en ciencias de la computación",
    "duracion_ciclos": 10
  }
]
```

---

## 📚 Cursos y Malla Curricular

### GET `/api/malla-curricular`
Obtener malla curricular del estudiante con estado de cada curso

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
[
  {
    "ciclo": "Ciclo I",
    "numero": 1,
    "credits": 18,
    "courses": [
      {
        "id": "uuid",
        "code": "CS101",
        "name": "Programación Fundamental",
        "credits": 4,
        "status": "completed",
        "description": "Introducción a los conceptos básicos de programación"
      }
    ]
  },
  {
    "ciclo": "Ciclo II",
    "numero": 2,
    "credits": 19,
    "courses": [
      {
        "id": "uuid",
        "code": "CS201",
        "name": "Estructuras de Datos",
        "credits": 4,
        "status": "in_progress",
        "description": "Listas, pilas, colas, árboles y grafos"
      }
    ]
  }
]
```

**Nota:** El `status` se calcula basado en:
- `completed`: Matrícula con estado 'completed'
- `in_progress`: Matrícula con estado 'in_progress'
- `available`: Prerrequisitos cumplidos pero no matriculado
- `locked`: Prerrequisitos no cumplidos

### GET `/api/cursos/{id}`
Obtener detalles de un curso específico

**Response:**
```json
{
  "id": "uuid",
  "code": "CS201",
  "name": "Estructuras de Datos",
  "credits": 4,
  "description": "Listas, pilas, colas, árboles y grafos",
  "ciclo": {
    "numero": 2,
    "nombre": "Ciclo II"
  },
  "prerequisitos": [
    {
      "id": "uuid",
      "code": "CS101",
      "name": "Programación Fundamental"
    }
  ]
}
```

---

## 🛤️ Learning Path (Ruta de Aprendizaje)

### GET `/api/curso/{id}/learning-path`
Obtener ruta de aprendizaje completa de un curso

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "curso": {
    "code": "CS201",
    "name": "Estructuras de Datos",
    "professor": "Dr. Carlos Mendez",
    "description": "Fundamentos de estructuras de datos",
    "credits": 4,
    "progress": 45,
    "startDate": "2024-01-15",
    "endDate": "2024-05-30"
  },
  "timeline": [
    {
      "id": "uuid",
      "title": "Introducción a Estructuras de Datos",
      "description": "Conceptos fundamentales y clasificación",
      "duration": "1 semana",
      "status": "completed",
      "topics": ["Arrays", "Linked Lists", "Memory Management"],
      "icon": "BookOpen",
      "resources": [
        {
          "type": "video",
          "title": "Introducción a ED",
          "duration": "15 min",
          "url": "https://..."
        }
      ]
    }
  ],
  "ai_insights": [
    {
      "type": "strength",
      "title": "Dominio de Conceptos Básicos",
      "description": "Tu desempeño en arrays es excelente",
      "impact": "+15% en pruebas",
      "action": "Ver análisis detallado"
    }
  ],
  "exam_bank": [
    {
      "id": "uuid",
      "title": "Examen Parcial - Ciclo II 2024",
      "type": "midterm",
      "year": 2024,
      "difficulty": "hard",
      "questions": 45,
      "duration": 120,
      "downloads": 342,
      "hasAnswers": true
    }
  ]
}
```

---

## 📖 Recursos (Biblioteca)

### GET `/api/recursos`
Obtener recursos de la biblioteca central

**Query Parameters:**
- `tipo` (opcional): "Examen" | "Práctica" | "Libro" | "Apunte"
- `ciclo` (opcional): número del ciclo
- `codigo_curso` (opcional): código del curso (ej: "CS201")
- `search` (opcional): búsqueda por título

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Estructuras de Datos",
    "code": "CS201",
    "semester": "2024-II",
    "type": "Examen",
    "ciclo": 2,
    "facultad": "Ingeniería",
    "year": 2024,
    "downloads": 2450,
    "rating": 4.8,
    "preview": true,
    "hasSolucionario": true
  }
]
```

### GET `/api/recursos/{id}/download`
Descargar un recurso

**Response:**
Archivo descargable

---

## 📊 Dashboard y Estadísticas

### GET `/api/dashboard/stats`
Obtener estadísticas del dashboard del estudiante

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "activeCourses": 5,
  "semesterProgress": 68,
  "masterSkills": 12,
  "currentCourses": [
    {
      "id": "uuid",
      "code": "CS201",
      "name": "Estructuras de Datos",
      "progress": 45,
      "nextDeadline": "2024-03-15",
      "status": "in_progress"
    }
  ]
}
```

### GET `/api/logros`
Obtener logros del estudiante

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "logros_desbloqueados": [
    {
      "id": "uuid",
      "name": "Primer Paso",
      "description": "Completar el primer curso",
      "icon": "🎓",
      "unlockedAt": "2024-01-15"
    }
  ],
  "logros_disponibles": [
    {
      "id": "uuid",
      "name": "Dedicación Premium",
      "description": "Completar 90 horas de estudio",
      "icon": "🏆",
      "unlockedAt": null
    }
  ]
}
```

---

## 🚀 Onboarding

### POST `/api/onboarding/complete`
Completar proceso de onboarding

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "carrera_id": "uuid",
  "ciclo_actual": 2,
  "cursos_completados": ["uuid1", "uuid2", "uuid3"],
  "matricula_actual": ["uuid4", "uuid5"]
}
```

**Response:**
```json
{
  "success": true,
  "estudiante": {
    "id": "uuid",
    "carrera_id": "uuid",
    "ciclo_actual": 2,
    "onboarding_completado": true
  }
}
```

---

## 🔄 Actualización de Progreso

### PUT `/api/matriculas/{id}/progreso`
Actualizar progreso en un curso

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "progreso_porcentaje": 65
}
```

**Response:**
```json
{
  "id": "uuid",
  "progreso_porcentaje": 65,
  "updated_at": "2024-03-15T10:30:00Z"
}
```

---

## 📝 Notas Importantes

### Estados de Curso
- `completed`: Curso completado exitosamente
- `in_progress`: Estudiante actualmente matriculado
- `available`: Puede matricularse (prerrequisitos cumplidos)
- `locked`: No puede matricularse (prerrequisitos pendientes)

### Autenticación
Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer {access_token}
```

### Paginación
Los endpoints que retornan listas soportan paginación:
```
?page=1&limit=20
```

### Manejo de Errores
Formato estándar de errores:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token inválido o expirado"
  }
}
```

Códigos de error comunes:
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error
