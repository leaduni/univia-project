# Diccionario de Datos del Sistema — UniVia

**Origen:** Archivos SQL canónicos del repositorio (`base_de_datos/esquema/`, `base_de_datos/rag/`)  
**Esquema:** `public`  
**Total de tablas:** 18  
**Generado:** 2026-08-12 03:47 UTC vía `scripts/extract_schema_metadata.py`

---

## Índice de Tablas

- [`carreras`](#tabla-carreras)
- [`curso_prerrequisitos`](#tabla-curso-prerrequisitos)
- [`curso_profesores`](#tabla-curso-profesores)
- [`cursos`](#tabla-cursos)
- [`eventos_actividad`](#tabla-eventos-actividad)
- [`facultades`](#tabla-facultades)
- [`learning_path_steps`](#tabla-learning-path-steps)
- [`logros`](#tabla-logros)
- [`logros_usuarios`](#tabla-logros-usuarios)
- [`malla_curso_prerrequisitos`](#tabla-malla-curso-prerrequisitos)
- [`malla_cursos`](#tabla-malla-cursos)
- [`mallas`](#tabla-mallas)
- [`perfiles`](#tabla-perfiles)
- [`profesores`](#tabla-profesores)
- [`progreso_cursos`](#tabla-progreso-cursos)
- [`progreso_unidades`](#tabla-progreso-unidades)
- [`recursos`](#tabla-recursos)
- [`resource_chunks`](#tabla-resource-chunks)

---
---

## Tabla: `carreras`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `facultades`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `carreras.facultad_id` → `facultades.id`
* **Descripción de Negocio:** Una facultad agrupa múltiples carreras. Si se elimina la facultad, sus carreras asociadas se eliminan en cascada.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `facultad_id` | INTEGER | `FK` → `facultades.id` | Referencia a la facultad. |
| `codigo` | VARCHAR(20) | `UNIQUE`, `NOT NULL` | Código alfanumérico único de la entidad. |
| `name` | VARCHAR(255) | `NOT NULL` | Nombre de la entidad. |
| `description` | TEXT | — | Descripción textual en formato libre. |
| `duracion_ciclos` | INTEGER | — | Duración total de la carrera en ciclos académicos (por defecto 10). |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `curso_prerrequisitos`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `curso_prerrequisitos.curso_id` → `cursos.id`
* **Descripción de Negocio:** Prerrequisitos a nivel de catálogo de cursos (modelo anterior a mallas). Un curso no puede ser prerrequisito de sí mismo.

* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `curso_prerrequisitos.prerrequisito_id` → `cursos.id`
* **Descripción de Negocio:** Prerrequisitos a nivel de catálogo de cursos (modelo anterior a mallas). Un curso no puede ser prerrequisito de sí mismo.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `curso_id` | INTEGER | `FK` → `cursos.id`, `UNIQUE` | Referencia al curso. |
| `prerrequisito_id` | INTEGER | `FK` → `cursos.id`, `UNIQUE` | Referencia al curso que actúa como prerrequisito (nivel catálogo). |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `curso_profesores`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `curso_profesores.curso_id` → `cursos.id`
* **Descripción de Negocio:** Un curso puede ser dictado por múltiples profesores (distintas secciones o grupos). Relación muchos a muchos.

* **Relacionada con:** `profesores`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `curso_profesores.profesor_id` → `profesores.id`
* **Descripción de Negocio:** Un profesor puede dictar múltiples cursos. Relación muchos a muchos.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `curso_id` | INTEGER | `FK` → `cursos.id`, `UNIQUE` | Referencia al curso. |
| `profesor_id` | INTEGER | `FK` → `profesores.id`, `UNIQUE` | Referencia al profesor. |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `cursos`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `carreras`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `cursos.carrera_id` → `carreras.id`
* **Descripción de Negocio:** Cada curso pertenece a una carrera específica. Al eliminar la carrera se eliminan sus cursos en cascada.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `carrera_id` | INTEGER | `FK` → `carreras.id` | Referencia a la carrera o programa académico. |
| `code` | VARCHAR(20) | `UNIQUE`, `NOT NULL` | Código único del curso (ej. 'FB101', 'MA115'). |
| `name` | VARCHAR(255) | `NOT NULL` | Nombre de la entidad. |
| `credits` | INTEGER | `NOT NULL` | Cantidad de créditos académicos del curso en este plan de estudios. |
| `description` | TEXT | — | Descripción textual en formato libre. |
| `ciclo` | INTEGER | `NOT NULL` | Ciclo académico al que pertenece el curso (1-10). |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `eventos_actividad`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `perfiles`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `eventos_actividad.perfil_id` → `perfiles.id`
* **Descripción de Negocio:** Cada evento de actividad (login, evaluación rendida, unidad completada) pertenece a un estudiante. Se elimina en cascada con el perfil.

* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `eventos_actividad.curso_id` → `cursos.id`
* **Descripción de Negocio:** Los eventos de actividad pueden asociarse opcionalmente a un curso (evaluaciones, unidades completadas). Si el curso se elimina, el evento se preserva (SET NULL).


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BIGSERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `perfil_id` | UUID | `FK` → `perfiles.id` | Referencia al perfil del estudiante (UUID de auth.users). |
| `tipo` | VARCHAR(40) | `NOT NULL` | Tipo o categoría del ítem (ej. `OBLIGATORIO`, `ELECTIVO`, `Examen`, `Práctica`, `Libro`, `Apunte`, `Video`, `login`, `evaluacion`, `unidad_completada`, `curso_completado`). |
| `curso_id` | INTEGER | `FK` → `cursos.id` | Referencia al curso. |
| `metadata` | JSONB | `NOT NULL` | Metadatos en formato JSONB. Campos variables según el tipo de evento o recurso (ej. nota, aprobado, pagina, tema). |
| `created_at` | TIMESTAMP | `NOT NULL` | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `facultades`

### 🔗 Relaciones y Cardinalidad
*Sin relaciones de clave foránea. Tabla independiente.*


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `codigo` | VARCHAR(20) | `UNIQUE`, `NOT NULL` | Código alfanumérico único de la entidad. |
| `nombre` | VARCHAR(255) | `NOT NULL` | Nombre descriptivo de la entidad. |
| `descripcion` | TEXT | — | Descripción textual en formato libre. |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `learning_path_steps`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `learning_path_steps.curso_id` → `cursos.id`
* **Descripción de Negocio:** Cada curso tiene una ruta de aprendizaje estructurada en pasos/unidades ordenados secuencialmente.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `curso_id` | INTEGER | `FK` → `cursos.id` | Referencia al curso. |
| `title` | VARCHAR(255) | `NOT NULL` | Título descriptivo del paso de aprendizaje. |
| `description` | TEXT | — | Descripción textual en formato libre. |
| `duration` | VARCHAR(50) | — | Duración estimada del paso de aprendizaje (formato libre, ej. '45 min'). |
| `order_index` | INTEGER | `NOT NULL` | Posición ordinal del paso dentro de la secuencia de aprendizaje del curso. |
| `topics` | TEXT[] | — | Array de strings con los temas o tópicos cubiertos en este paso. |
| `icon` | VARCHAR(50) | — | Identificador de icono (emoji o código de icono). |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `logros`

### 🔗 Relaciones y Cardinalidad
*Sin relaciones de clave foránea. Tabla independiente.*


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `nombre` | VARCHAR(255) | `NOT NULL` | Nombre descriptivo de la entidad. |
| `descripcion` | TEXT | — | Descripción textual en formato libre. |
| `icon` | VARCHAR(10) | — | Identificador de icono (emoji o código de icono). |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `logros_usuarios`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `perfiles`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `logros_usuarios.perfil_id` → `perfiles.id`
* **Descripción de Negocio:** Cada estudiante puede desbloquear logros. La relación perfil-logro es única (un logro no se desbloquea dos veces).

* **Relacionada con:** `logros`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `logros_usuarios.logro_id` → `logros.id`
* **Descripción de Negocio:** Un logro del catálogo puede ser desbloqueado por múltiples estudiantes.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `perfil_id` | UUID | `FK` → `perfiles.id`, `UNIQUE` | Referencia al perfil del estudiante (UUID de auth.users). |
| `logro_id` | INTEGER | `FK` → `logros.id`, `UNIQUE` | Referencia al logro del catálogo de gamificación. |
| `unlocked_at` | TIMESTAMP | — | Fecha y hora en que el estudiante desbloqueó el logro (UTC). |
---

## Tabla: `malla_curso_prerrequisitos`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `malla_cursos`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `malla_curso_prerrequisitos.malla_curso_id` → `malla_cursos.id`
* **Descripción de Negocio:** Los prerrequisitos entre cursos se definen a nivel de malla, no de curso suelto, para permitir variantes por plan de estudios.

* **Relacionada con:** `malla_cursos`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `malla_curso_prerrequisitos.prerrequisito_malla_curso_id` → `malla_cursos.id`
* **Descripción de Negocio:** Los prerrequisitos entre cursos se definen a nivel de malla, no de curso suelto, para permitir variantes por plan de estudios.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `malla_curso_id` | INTEGER | `FK` → `malla_cursos.id` | Referencia a la fila en malla_cursos que vincula un curso con una malla específica. |
| `prerrequisito_malla_curso_id` | INTEGER | `FK` → `malla_cursos.id` | Referencia al curso prerrequisito dentro de la misma malla (malla_cursos). |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `malla_cursos`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `mallas`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `malla_cursos.malla_id` → `mallas.id`
* **Descripción de Negocio:** Una malla contiene múltiples cursos posicionados en ciclos específicos con créditos definidos para ese plan.

* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** N:M (tabla intermedia)
* **Relación FK:** `malla_cursos.curso_id` → `cursos.id`
* **Descripción de Negocio:** Un curso del catálogo maestro puede aparecer en múltiples mallas con distinto ciclo y créditos según el plan de estudios.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `malla_id` | INTEGER | `FK` → `mallas.id` | Referencia a la malla curricular asignada al estudiante. |
| `curso_id` | INTEGER | `FK` → `cursos.id` | Referencia al curso. |
| `ciclo` | INTEGER | `NOT NULL` | Ciclo académico al que pertenece el curso (1-10). |
| `credits` | INTEGER | `NOT NULL` | Cantidad de créditos académicos del curso en este plan de estudios. |
| `tipo` | VARCHAR(255) | — | Tipo o categoría del ítem (ej. `OBLIGATORIO`, `ELECTIVO`, `Examen`, `Práctica`, `Libro`, `Apunte`, `Video`, `login`, `evaluacion`, `unidad_completada`, `curso_completado`). |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `mallas`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `carreras`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `mallas.carrera_id` → `carreras.id`
* **Descripción de Negocio:** Una carrera puede tener múltiples planes de estudio (mallas) a lo largo del tiempo. Cada malla pertenece a una única carrera y solo una es vigente.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `carrera_id` | INTEGER | `FK` → `carreras.id` | Referencia a la carrera o programa académico. |
| `nombre` | VARCHAR(255) | `NOT NULL` | Nombre descriptivo de la entidad. |
| `codigo_plan` | VARCHAR(255) | `NOT NULL` | Código identificador del plan de estudios. |
| `es_vigente` | BOOLEAN | — | Indica si esta malla es el plan de estudios vigente actualmente. |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `perfiles`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `auth.users`
* **Tipo de Cardinalidad:** 1:1 (extensión de auth.users)
* **Relación FK:** `perfiles.id` → `auth.users.id`
* **Descripción de Negocio:** Dependencia referencial entre `perfiles` y `auth.users`.

* **Relacionada con:** `carreras`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `perfiles.carrera_id` → `carreras.id`
* **Descripción de Negocio:** Un estudiante pertenece a una carrera. Esta referencia puede actualizarse si el estudiante cambia de programa.

* **Relacionada con:** `mallas`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `perfiles.malla_id` → `mallas.id`
* **Descripción de Negocio:** Un estudiante queda vinculado a una malla concreta al completar el onboarding, definiendo su plan de estudios activo.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | `PK`, `FK` → `auth.users.id` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `email` | VARCHAR(255) | `UNIQUE`, `NOT NULL` | Correo electrónico institucional con formato @uni.pe. |
| `codigo_estudiante` | VARCHAR(9) | `UNIQUE` | Código universitario de 8 dígitos + 1 letra verificadora. Único por estudiante. |
| `nombre_completo` | VARCHAR(255) | — | Nombre completo del perfil o docente. |
| `carrera_id` | INTEGER | `FK` → `carreras.id` | Referencia a la carrera o programa académico. |
| `ciclo_actual` | INTEGER | — | Ciclo actual en el que se encuentra el estudiante (por defecto 1). |
| `onboarding_completado` | BOOLEAN | — | Indica si el estudiante finalizó el flujo de onboarding inicial. |
| `avatar_url` | TEXT | — | URL de la imagen de avatar del perfil. |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
| `updated_at` | TIMESTAMP | — | Fecha y hora de última actualización (UTC). |
| `malla_id` | INTEGER | `FK` → `mallas.id` | Referencia a la malla curricular asignada al estudiante. |
---

## Tabla: `profesores`

### 🔗 Relaciones y Cardinalidad
*Sin relaciones de clave foránea. Tabla independiente.*


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `nombre_completo` | VARCHAR(255) | `NOT NULL` | Nombre completo del perfil o docente. |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `progreso_cursos`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `perfiles`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `progreso_cursos.perfil_id` → `perfiles.id`
* **Descripción de Negocio:** El progreso académico de un estudiante se rastrea por curso. Eliminar el perfil elimina todo su progreso en cascada.

* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `progreso_cursos.curso_id` → `cursos.id`
* **Descripción de Negocio:** Cada estudiante tiene un registro de progreso por curso indicando si está disponible, en progreso, completado o bloqueado por prerrequisitos.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `perfil_id` | UUID | `FK` → `perfiles.id`, `UNIQUE` | Referencia al perfil del estudiante (UUID de auth.users). |
| `curso_id` | INTEGER | `FK` → `cursos.id`, `UNIQUE` | Referencia al curso. |
| `status` | VARCHAR(50) | — | Estado del progreso del curso: `available`, `in_progress`, `completed`, `locked`. |
| `nota` | DECIMAL(4,2) | — | Calificación obtenida (escala decimal, ej. 0.00-20.00). |
| `fecha_completado` | TIMESTAMP | — | Fecha y hora en que se completó el ítem (UTC). |
| `updated_at` | TIMESTAMP | — | Fecha y hora de última actualización (UTC). |
---

## Tabla: `progreso_unidades`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `perfiles`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `progreso_unidades.perfil_id` → `perfiles.id`
* **Descripción de Negocio:** El progreso por unidad/step se rastrea por estudiante. Cada step puede completarse individualmente dentro de un curso.

* **Relacionada con:** `learning_path_steps`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `progreso_unidades.step_id` → `learning_path_steps.id`
* **Descripción de Negocio:** Cada step de la ruta de aprendizaje puede ser completado por múltiples estudiantes.

* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `progreso_unidades.curso_id` → `cursos.id`
* **Descripción de Negocio:** El progreso por unidad está vinculado al curso para facilitar consultas agregadas de avance por curso.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `perfil_id` | UUID | `FK` → `perfiles.id`, `UNIQUE` | Referencia al perfil del estudiante (UUID de auth.users). |
| `step_id` | INTEGER | `FK` → `learning_path_steps.id`, `UNIQUE` | Referencia al paso/unidad de la ruta de aprendizaje. |
| `curso_id` | INTEGER | `FK` → `cursos.id` | Referencia al curso. |
| `completado` | BOOLEAN | — | Indicador booleano de si la unidad/step fue completado. |
| `fecha_completado` | TIMESTAMP | — | Fecha y hora en que se completó el ítem (UTC). |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
---

## Tabla: `recursos`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `recursos.curso_id` → `cursos.id`
* **Descripción de Negocio:** Un curso puede tener múltiples recursos asociados: exámenes, prácticas, libros, apuntes y videos. Al eliminar el curso, los recursos quedan huérfanos (SET NULL).


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `curso_id` | INTEGER | `FK` → `cursos.id` | Referencia al curso. |
| `titulo` | VARCHAR(255) | `NOT NULL` | — |
| `tipo` | VARCHAR(50) | `NOT NULL` | Tipo o categoría del ítem (ej. `OBLIGATORIO`, `ELECTIVO`, `Examen`, `Práctica`, `Libro`, `Apunte`, `Video`, `login`, `evaluacion`, `unidad_completada`, `curso_completado`). |
| `ciclo` | INTEGER | — | Ciclo académico al que pertenece el curso (1-10). |
| `year` | INTEGER | — | Año del recurso (ej. año del examen). |
| `downloads` | INTEGER | — | Cantidad de descargas del recurso (por defecto 0). |
| `rating` | DECIMAL(3,1) | — | Calificación promedio del recurso en escala 0.0-5.0. |
| `preview_url` | TEXT | — | URL de previsualización del recurso. |
| `has_solucionario` | BOOLEAN | — | Indica si el recurso tiene solucionario vinculado disponible. |
| `created_at` | TIMESTAMP | — | Fecha y hora de creación del registro (UTC). |
| `url_drive` | TEXT | — | URL pública del archivo en Google Drive. |
| `drive_file_id` | TEXT | — | ID único del archivo en Google Drive para sincronización. |
| `nombre_curso` | TEXT | — | Nombre del curso (metadata de ingesta desde Drive; no es fuente de verdad para mostrar en pantalla). |
| `codigo_curso` | TEXT | — | Código del curso (metadata de ingesta desde Drive; no es fuente de verdad para mostrar en pantalla). |
| `url_solucionario` | TEXT | — | URL del solucionario vinculado en Google Drive. |
| `drive_id_solucionario` | TEXT | — | ID del archivo de solucionario en Google Drive. |
---

## Tabla: `resource_chunks`

### 🔗 Relaciones y Cardinalidad
* **Relacionada con:** `recursos`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `resource_chunks.recurso_id` → `recursos.id`
* **Descripción de Negocio:** Un recurso puede tener múltiples chunks vectorizados (divisiones del contenido) para búsqueda semántica RAG. Se eliminan en cascada con el recurso.

* **Relacionada con:** `cursos`
* **Tipo de Cardinalidad:** 1:N
* **Relación FK:** `resource_chunks.curso_id` → `cursos.id`
* **Descripción de Negocio:** Los chunks vectorizados de recursos se asocian a un curso para búsqueda semántica contextualizada en el pipeline RAG.


### 📋 Atributos y Restricciones

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | `PK` | Identificador único autoincremental (SERIAL / BIGSERIAL / UUID). |
| `recurso_id` | INTEGER | `FK` → `recursos.id` | Referencia al recurso del banco. |
| `curso_id` | INTEGER | `FK` → `cursos.id` | Referencia al curso. |
| `contenido` | TEXT | `NOT NULL` | Contenido textual del chunk utilizado en búsqueda semántica RAG. |
| `embedding` | VECTOR(1536) | `NOT NULL` | Vector de 1536 dimensiones que representa el embedding semántico del chunk para búsqueda por similitud coseno. |
| `metadata` | JSONB | — | Metadatos en formato JSONB. Campos variables según el tipo de evento o recurso (ej. nota, aprobado, pagina, tema). |
| `created_at` | TIMESTAMP | `NOT NULL` | Fecha y hora de creación del registro (UTC). |

---

## Resumen de Relaciones

- **Tablas totales:** 18
- **Relaciones FK totales:** 27
- **Tablas con FKs:** 15

| Tabla Origen | Columna FK | Tabla Destino | Columna Destino | Cardinalidad |
| :--- | :--- | :--- | :--- | :--- |
| `carreras` | `facultad_id` | `facultades` | `id` | 1:N |
| `curso_prerrequisitos` | `curso_id` | `cursos` | `id` | N:M (tabla intermedia) |
| `curso_prerrequisitos` | `prerrequisito_id` | `cursos` | `id` | N:M (tabla intermedia) |
| `curso_profesores` | `curso_id` | `cursos` | `id` | N:M (tabla intermedia) |
| `curso_profesores` | `profesor_id` | `profesores` | `id` | N:M (tabla intermedia) |
| `cursos` | `carrera_id` | `carreras` | `id` | 1:N |
| `eventos_actividad` | `perfil_id` | `perfiles` | `id` | 1:N |
| `eventos_actividad` | `curso_id` | `cursos` | `id` | 1:N |
| `learning_path_steps` | `curso_id` | `cursos` | `id` | 1:N |
| `logros_usuarios` | `perfil_id` | `perfiles` | `id` | N:M (tabla intermedia) |
| `logros_usuarios` | `logro_id` | `logros` | `id` | N:M (tabla intermedia) |
| `malla_curso_prerrequisitos` | `malla_curso_id` | `malla_cursos` | `id` | N:M (tabla intermedia) |
| `malla_curso_prerrequisitos` | `prerrequisito_malla_curso_id` | `malla_cursos` | `id` | N:M (tabla intermedia) |
| `malla_cursos` | `malla_id` | `mallas` | `id` | N:M (tabla intermedia) |
| `malla_cursos` | `curso_id` | `cursos` | `id` | N:M (tabla intermedia) |
| `mallas` | `carrera_id` | `carreras` | `id` | 1:N |
| `perfiles` | `id` | `auth.users` | `id` | 1:1 (extensión de auth.users) |
| `perfiles` | `carrera_id` | `carreras` | `id` | 1:N |
| `perfiles` | `malla_id` | `mallas` | `id` | 1:N |
| `progreso_cursos` | `perfil_id` | `perfiles` | `id` | 1:N |
| `progreso_cursos` | `curso_id` | `cursos` | `id` | 1:N |
| `progreso_unidades` | `perfil_id` | `perfiles` | `id` | 1:N |
| `progreso_unidades` | `step_id` | `learning_path_steps` | `id` | 1:N |
| `progreso_unidades` | `curso_id` | `cursos` | `id` | 1:N |
| `recursos` | `curso_id` | `cursos` | `id` | 1:N |
| `resource_chunks` | `recurso_id` | `recursos` | `id` | 1:N |
| `resource_chunks` | `curso_id` | `cursos` | `id` | 1:N |
