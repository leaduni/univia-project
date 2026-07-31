# Esquema de Base de Datos Actual

## Estructura de Tablas

| Tabla                | Columna               | Tipo_Dato                | Permite_Null |
| -------------------- | --------------------- | ------------------------ | ------------ |
| carreras             | id                    | integer                  | NO           |
| carreras             | facultad_id           | integer                  | YES          |
| carreras             | codigo                | character varying        | NO           |
| carreras             | name                  | character varying        | NO           |
| carreras             | description           | text                     | YES          |
| carreras             | duracion_ciclos       | integer                  | YES          |
| carreras             | created_at            | timestamp with time zone | YES          |
| curso_prerrequisitos | id                    | integer                  | NO           |
| curso_prerrequisitos | curso_id              | integer                  | YES          |
| curso_prerrequisitos | prerrequisito_id      | integer                  | YES          |
| curso_prerrequisitos | created_at            | timestamp with time zone | YES          |
| cursos               | id                    | integer                  | NO           |
| cursos               | carrera_id            | integer                  | YES          |
| cursos               | code                  | character varying        | NO           |
| cursos               | name                  | character varying        | NO           |
| cursos               | credits               | integer                  | NO           |
| cursos               | description           | text                     | YES          |
| cursos               | ciclo                 | integer                  | NO           |
| cursos               | created_at            | timestamp with time zone | YES          |
| eventos_actividad    | id                    | bigint                   | NO           |
| eventos_actividad    | perfil_id             | uuid                     | NO           |
| eventos_actividad    | tipo                  | character varying        | NO           |
| eventos_actividad    | curso_id              | integer                  | YES          |
| eventos_actividad    | metadata              | jsonb                    | NO           |
| eventos_actividad    | created_at            | timestamp with time zone | NO           |
| facultades           | id                    | integer                  | NO           |
| facultades           | codigo                | character varying        | NO           |
| facultades           | nombre                | character varying        | NO           |
| facultades           | descripcion           | text                     | YES          |
| facultades           | created_at            | timestamp with time zone | YES          |
| learning_path_steps  | id                    | integer                  | NO           |
| learning_path_steps  | curso_id              | integer                  | YES          |
| learning_path_steps  | title                 | character varying        | NO           |
| learning_path_steps  | description           | text                     | YES          |
| learning_path_steps  | duration              | character varying        | YES          |
| learning_path_steps  | order_index           | integer                  | NO           |
| learning_path_steps  | topics                | ARRAY                    | YES          |
| learning_path_steps  | icon                  | character varying        | YES          |
| learning_path_steps  | created_at            | timestamp with time zone | YES          |
| logros               | id                    | integer                  | NO           |
| logros               | nombre                | character varying        | NO           |
| logros               | descripcion           | text                     | YES          |
| logros               | icon                  | character varying        | YES          |
| logros               | created_at            | timestamp with time zone | YES          |
| logros_usuarios      | id                    | integer                  | NO           |
| logros_usuarios      | perfil_id             | uuid                     | YES          |
| logros_usuarios      | logro_id              | integer                  | YES          |
| logros_usuarios      | unlocked_at           | timestamp with time zone | YES          |
| perfiles             | id                    | uuid                     | NO           |
| perfiles             | email                 | character varying        | NO           |
| perfiles             | nombre_completo       | character varying        | YES          |
| perfiles             | carrera_id            | integer                  | YES          |
| perfiles             | ciclo_actual          | integer                  | YES          |
| perfiles             | onboarding_completado | boolean                  | YES          |
| perfiles             | avatar_url            | text                     | YES          |
| perfiles             | created_at            | timestamp with time zone | YES          |
| perfiles             | updated_at            | timestamp with time zone | YES          |
| perfiles             | codigo_estudiante     | character varying        | YES          |
| progreso_cursos      | id                    | integer                  | NO           |
| progreso_cursos      | perfil_id             | uuid                     | YES          |
| progreso_cursos      | curso_id              | integer                  | YES          |
| progreso_cursos      | status                | character varying        | YES          |
| progreso_cursos      | nota                  | numeric                  | YES          |
| progreso_cursos      | fecha_completado      | timestamp with time zone | YES          |
| progreso_cursos      | updated_at            | timestamp with time zone | YES          |
| progreso_unidades    | id                    | integer                  | NO           |
| progreso_unidades    | perfil_id             | uuid                     | YES          |
| progreso_unidades    | step_id               | integer                  | YES          |
| progreso_unidades    | curso_id              | integer                  | YES          |
| progreso_unidades    | completado            | boolean                  | YES          |
| progreso_unidades    | fecha_completado      | timestamp with time zone | YES          |
| progreso_unidades    | created_at            | timestamp with time zone | YES          |
| recursos             | id                    | integer                  | NO           |
| recursos             | curso_id              | integer                  | YES          |
| recursos             | titulo                | character varying        | NO           |
| recursos             | tipo                  | character varying        | NO           |
| recursos             | ciclo                 | integer                  | YES          |
| recursos             | year                  | integer                  | YES          |
| recursos             | downloads             | integer                  | YES          |
| recursos             | rating                | numeric                  | YES          |
| recursos             | preview_url           | text                     | YES          |
| recursos             | has_solucionario      | boolean                  | YES          |
| recursos             | created_at            | timestamp with time zone | YES          |
| recursos             | url_drive             | text                     | YES          |
| recursos             | drive_file_id         | text                     | YES          |
| recursos             | nombre_curso          | text                     | YES          |
| recursos             | codigo_curso          | text                     | YES          |
| resource_chunks      | id                    | uuid                     | NO           |
| resource_chunks      | recurso_id            | integer                  | NO           |
| resource_chunks      | curso_id              | integer                  | NO           |
| resource_chunks      | contenido             | text                     | NO           |
| resource_chunks      | embedding             | USER-DEFINED             | NO           |
| resource_chunks      | created_at            | timestamp with time zone | NO           |

---

| Tabla_Origen         | Columna_Origen   | Tabla_Destino       | Columna_Destino |
| -------------------- | ---------------- | ------------------- | --------------- |
| perfiles             | carrera_id       | carreras            | id              |
| carreras             | facultad_id      | facultades          | id              |
| cursos               | carrera_id       | carreras            | id              |
| progreso_cursos      | perfil_id        | perfiles            | id              |
| progreso_cursos      | curso_id         | cursos              | id              |
| recursos             | curso_id         | cursos              | id              |
| logros_usuarios      | perfil_id        | perfiles            | id              |
| logros_usuarios      | logro_id         | logros              | id              |
| learning_path_steps  | curso_id         | cursos              | id              |
| curso_prerrequisitos | curso_id         | cursos              | id              |
| curso_prerrequisitos | prerrequisito_id | cursos              | id              |
| resource_chunks      | recurso_id       | recursos            | id              |
| resource_chunks      | curso_id         | cursos              | id              |
| progreso_unidades    | perfil_id        | perfiles            | id              |
| progreso_unidades    | step_id          | learning_path_steps | id              |
| progreso_unidades    | curso_id         | cursos              | id              |
| eventos_actividad    | perfil_id        | perfiles            | id              |
| eventos_actividad    | curso_id         | cursos              | id              |