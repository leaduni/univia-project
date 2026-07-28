# Guía de esquema y convenciones — Backend UniVia

Entregable de la **Fase 1 (Núcleo de datos, seguridad y validaciones transversales)**.

Sirve para que las Fases 2, 3 y 4 no improvisen estructuras de datos paralelas:
antes de crear una tabla o una columna nueva, busca aquí si el dato ya tiene lugar.

- **Esquema canónico:** [`base_de_datos/esquema/db_schema.sql`](../../base_de_datos/esquema/db_schema.sql)
- **Migración de esta fase:** [`base_de_datos/esquema/migracion_fase1_fundacion.sql`](../../base_de_datos/esquema/migracion_fase1_fundacion.sql)
- **Validaciones compartidas:** [`backend/app/core/validators.py`](../../backend/app/core/validators.py)

---

## 1. Estado de la auditoría

Se comparó el esquema declarado contra lo que el backend realmente consulta.
Dos desviaciones rompían cualquier base recreada desde cero:

| Hallazgo | Estado |
|---|---|
| `perfiles.codigo_estudiante` se usa en registro y login, pero no existía en ningún SQL del repo (solo en la base viva, aplicada a mano) | Corregido: declarada en el esquema + migración |
| `curso_prerrequisitos` se consulta en 3 routers, pero su `CREATE TABLE` vivía dentro de un archivo de **semillas** | Corregido: trasladada al esquema canónico |

> **Acción requerida:** ejecutar `migracion_fase1_fundacion.sql` en el SQL Editor de
> Supabase. Es idempotente. Sin esto, las restricciones de unicidad y formato no
> están activas en la base de datos real.

---

## 1b. Cómo levantar la base desde cero

Ejecutar **en este orden** en el SQL Editor de Supabase:

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `esquema/db_schema.sql` | Tablas, triggers y relaciones |
| 2 | `esquema/migracion_fase1_fundacion.sql` | Restricciones e índices de la Fase 1 |
| 3 | `semillas/seed_catalogo.sql` | Facultad, carreras, 59 cursos y 40 prerrequisitos |
| 4 | `semillas/seed_learning_paths*.sql` | Pasos de las rutas de aprendizaje |

`seed_catalogo.sql` se generó desde la base de datos real y resuelve todas las
relaciones **por código** (`FIIS`, `IND`, `SI`, `SW`, y el `code` de cada curso),
nunca por ID. Los IDs son `SERIAL` y difieren entre entornos: ese fue exactamente
el fallo de los seeds anteriores.

### Seeds obsoletos — no ejecutar

Se conservan solo por historial. Todos usan IDs fijos que ya no corresponden:

| Archivo | Por qué no sirve |
|---|---|
| `db_seed.sql` | Crea carreras `CS`, `CE`, `EE`, `IE` que no existen en el proyecto. Sin `ON CONFLICT`: falla al repetirse |
| `seed_requirements.sql` | Inserta cursos con `carrera_id` 2/3/4; las carreras reales son 5/6/7 |
| `seed_industrial.sql` | Solo Industrial, con `carrera_id` 6 fijo. Cubierto por `seed_catalogo.sql` |

---

## 2. Mapa de tablas

### Identidad y perfil

**`perfiles`** — extensión de `auth.users`. Un registro por estudiante.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | Referencia a `auth.users(id)`. **Es el identificador del estudiante en todo el sistema.** |
| `email` | VARCHAR UNIQUE | Correo institucional `@uni.pe` (RF-EST-01/02) |
| `codigo_estudiante` | VARCHAR(9) UNIQUE | 8 dígitos + letra (ej. `20210001K`) |
| `nombre_completo` | VARCHAR | Único dato personal editable (RF-PRF-02) |
| `carrera_id` | FK → `carreras` | Se asigna al completar el onboarding |
| `ciclo_actual` | INTEGER | Ciclo relativo del estudiante |
| `onboarding_completado` | BOOLEAN | Controla el redireccionamiento tras el login |

Las contraseñas **no** viven aquí: las gestiona Supabase Auth (bcrypt, RNF-04).

### Estructura académica

- **`facultades`** → **`carreras`** → **`cursos`**: jerarquía del catálogo.
  `carreras.duracion_ciclos` define el largo del plan de estudios.
- **`cursos`**: `code` es único global, `ciclo` ubica el curso en la malla,
  `credits` alimenta el cálculo de avance de carrera (RF-07).
- **`curso_prerrequisitos`**: pares `(curso_id, prerrequisito_id)`. Solo relaciones
  **directas**; la cadena transitiva se resuelve en código (ver sección 4).

### Progreso del estudiante

- **`progreso_cursos`**: estado por curso, único por `(perfil_id, curso_id)`.
  Valores de `status`: `available`, `in_progress`, `completed`, `locked`.
- **`progreso_unidades`**: estado por paso de la ruta de aprendizaje,
  único por `(perfil_id, step_id)`.
- **`learning_path_steps`**: pasos de la ruta por curso, ordenados por `order_index`.

### Contenido y gamificación

- **`recursos`**: banco de exámenes y material. `tipo` discrimina
  (`Examen`, `Práctica`, `Libro`, `Apunte`, `Video`).
- **`logros`** / **`logros_usuarios`**: catálogo y desbloqueos por estudiante.

---

## 3. Reglas de validación compartidas

**Importa siempre desde `app.core.validators`.** No redefinas patrones ni mensajes
en tu router o schema: si cambia una regla, debe cambiar en un solo lugar.

```python
from app.core.validators import (
    validar_email_institucional,   # RF-EST-02
    validar_codigo_estudiante,     # RF-EST-02
    validar_password,              # RNF-04 / RF-PRF-03
    es_email_institucional,        # variante que devuelve bool, no lanza
    es_codigo_estudiante,
)
```

Reglas vigentes:

| Regla | Definición |
|---|---|
| Correo | Debe terminar en `@uni.pe`. Se normaliza a minúsculas |
| Código | 8 dígitos + 1 letra. Se normaliza a mayúsculas |
| Contraseña | Mínimo 8 caracteres, al menos una letra y un número |

Para errores de campo usa `raise_field_error(campo, mensaje)` de
`app.core.exceptions`: produce la forma de respuesta estándar
`{"status": "error", "errors": [{"field": ..., "message": ...}]}`
que el frontend ya sabe mapear a cada input del formulario.

---

## 4. Cómo extender el modelo de curso / malla

**Prerrequisitos.** La tabla guarda solo relaciones directas. Para obtener la
cadena completa usa los helpers de `app.core.prereqs`, no reimplementes el
recorrido:

```python
from app.core.prereqs import resolve_prereq_chain, check_course_status
```

- `resolve_prereq_chain(curso_id, prereq_map)` → todos los prerrequisitos
  transitivos (BFS). Si A requiere B y B requiere C, devuelve `[B, C]`.
- `check_course_status(...)` → estado final del curso más el detalle de qué
  prerrequisitos faltan.

**Si necesitas un dato nuevo de un curso**, agrégalo como columna en `cursos`
antes que crear una tabla paralela. Solo crea tabla nueva si la relación es
uno-a-muchos real (como los pasos de la ruta).

**Progreso.** Nunca dupliques el cálculo de avance. El porcentaje de carrera y
el estado por curso los expone la Fase 3 (`routers/malla.py`, `routers/dashboard.py`);
consúmelos en vez de recalcularlos desde `progreso_cursos`.

---

## 5. Acceso a datos y seguridad

`app.core.database` ofrece dos clientes, y **la elección importa**:

```python
get_supabase(token)   # Cliente con la sesión del estudiante. RESPETA RLS.
get_admin_client()    # Llave de servicio. OMITE RLS.
```

- **Usa `get_supabase(token)` por defecto.** El token llega desde la dependencia
  `get_current_user`, que devuelve la tupla `(user, token)`.
- **`get_admin_client()` solo cuando no hay sesión posible**: crear la cuenta en
  el registro, o resolver un código a correo durante el login. Nunca lo uses
  para saltarte un permiso por comodidad: RLS es lo que impide que un estudiante
  lea el progreso de otro (RNF-09).

Convenciones de seguridad:

- **Nunca registrar tokens ni contraseñas** en logs. Usa `logger`, no `print()`.
- Los errores del proveedor de auth no se devuelven al cliente tal cual: pueden
  filtrar información interna de la sesión.
- En login, un fallo de credenciales devuelve **siempre el mismo mensaje**, sin
  distinguir si el usuario existe (evita enumeración de cuentas).

---

## 6. Configuración

Todas las variables están documentadas en
[`backend/.env.example`](../../backend/.env.example). Las cuatro de Supabase son
obligatorias: la API no arranca sin ellas.

`CORS_ORIGINS` y `LOG_LEVEL` son opcionales y tienen valor por defecto, así que
no hace falta tocar código para desplegar en otro dominio.

---

## 7. Observaciones pendientes

Detectadas durante la auditoría, **no resueltas en esta fase** porque pertenecen
a otro módulo o requieren decisión del equipo:

1. **El trigger `handle_new_user` no rellena `codigo_estudiante`.** Copia solo
   `id`, `email` y `nombre_completo` desde los metadatos de auth. Hoy funciona
   porque el registro hace un `upsert` inmediatamente después, pero un usuario
   creado directamente desde el panel de Supabase quedaría sin código.
2. **Los routers de Fases 2–4 aún usan `print()` para depurar** (`usuarios.py`,
   `dashboard.py`, `cursos.py`). Deberían migrar a `logger`; algunos imprimen
   payloads completos de perfil.
3. **La política de contraseña ahora exige 8 caracteres**, pero el formulario de
   signup del frontend valida 6. Debe alinearse en la Fase 2 del rebrand para
   que el usuario no reciba el rechazo recién al enviar.
