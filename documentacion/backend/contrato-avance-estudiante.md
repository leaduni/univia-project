# Contrato de avance y perfil del estudiante — Backend UniVia

Entregable de la **Fase 3 (Malla curricular, dashboard y perfil)**.

Este documento describe la forma exacta de las respuestas que exponen **quién es
el estudiante y cuánto lleva de su carrera**. Está escrito para la **Fase 4**
(Omar), que necesita ese contexto para personalizar evaluaciones y
recomendaciones de IA sin recalcular el avance por su cuenta.

> **Regla de convivencia:** si necesitas saber qué aprobó, qué puede llevar o
> cuánto avanzó un estudiante, **consúmelo desde aquí**. No vuelvas a calcularlo
> leyendo `progreso_cursos` directamente: ya pasó una vez y terminamos con dos
> porcentajes de avance distintos para la misma persona (ver §7).

- **Cálculo de avance:** [`backend/app/core/avance.py`](../../backend/app/core/avance.py)
- **Diagnóstico y ruta:** [`backend/app/core/diagnostico.py`](../../backend/app/core/diagnostico.py)
- **Actividad:** [`backend/app/core/actividad.py`](../../backend/app/core/actividad.py)
- **Prerrequisitos:** [`backend/app/core/prereqs.py`](../../backend/app/core/prereqs.py)
- **Esquema de datos:** [`esquema-datos.md`](./esquema-datos.md)

---

## 0. Antes de consumir nada

| # | Requisito | Por qué |
|---|---|---|
| 1 | Ejecutar `migracion_fase3_actividad.sql` | Sin la tabla `eventos_actividad`, `/dashboard/actividad` responde con ceros (no falla, pero no sirve) |
| 2 | Enviar `Authorization: Bearer <access_token>` | Todos los endpoints exigen sesión; el token acota lo que RLS deja leer |
| 3 | El estudiante debe tener onboarding completo | Sin `carrera_id` en su perfil, la malla y el diagnóstico responden **400**, no una respuesta vacía |

---

## 1. Estados de curso — vocabulario común

Todo el backend usa estos cuatro valores. No inventes otros ni los traduzcas.

| Estado | Significado |
|---|---|
| `completed` | Aprobado |
| `in_progress` | Matriculado este ciclo |
| `available` | Puede llevarlo: toda su cadena de prerrequisitos está aprobada |
| `locked` | Le falta aprobar al menos un prerrequisito (directo o indirecto) |

**Regla de "disponible":** se evalúa la cadena **transitiva** completa, no solo
los prerrequisitos directos. Está implementada una sola vez en
`core/prereqs.check_course_status`. Úsala, no la reimplementes.

---

## 2. `GET /api/malla/` — malla completa por ciclos (RF-04, RF-05, RF-06)

Devuelve un **array** de ciclos, en orden ascendente. Los cursos van ordenados
por código dentro de cada ciclo.

```jsonc
[
  {
    "ciclo": "Ciclo 1",        // etiqueta lista para mostrar
    "ciclo_num": 1,            // el número en crudo: úsalo para ordenar o filtrar
    "credits": 22,             // créditos totales del ciclo
    "resumen": {               // conteo ya calculado; no lo rehagas contando courses
      "total": 6,
      "aprobados": 4,
      "en_curso": 1,
      "disponibles": 1,
      "bloqueados": 0,
      "creditos_aprobados": 15
    },
    "courses": [
      {
        "id": "12",                    // ⚠️ string — ver §7
        "code": "MB146",
        "name": "Cálculo I",
        "credits": 5,
        "status": "completed",
        "description": null,
        "progreso": 100,               // binario: 100 si completed, 0 si no — ver §7
        "nota": 15.5,                  // null si no hay nota registrada
        "fecha_completado": "2026-01-15T00:00:00+00:00",  // null si no aplica
        "prerequisitos": [             // DIRECTOS: de qué cuelga este curso
          { "id": "8", "code": "MB101", "name": "Álgebra", "completado": true }
        ],
        "prerequisitos_faltantes": [], // de toda la cadena, los que aún no aprueba
        "prerequisitos_cumplidos": true
      }
    ]
  }
]
```

### `prerequisitos` vs `prerequisitos_faltantes`

Son dos preguntas distintas y conviene no confundirlas:

- **`prerequisitos`** — los **directos**. No cambian nunca; describen la malla.
- **`prerequisitos_faltantes`** — de la cadena **completa**, los que este
  estudiante no aprobó. Dependen de su avance y **pueden incluir cursos que no
  están en la lista de arriba**.

Ejemplo: Cálculo III tiene un solo prerrequisito directo (Cálculo II). Si el
estudiante no aprobó nada, `prerequisitos_faltantes` traerá Cálculo II, Cálculo I
y Álgebra.

> Para explicarle a alguien **por qué** un curso está bloqueado, usa
> `prerequisitos_faltantes`. Para mostrar la estructura de la malla, usa
> `prerequisitos`.

---

## 3. `GET /api/malla/avance` — avance de carrera (RF-07)

La cifra oficial de "cuánto llevo". **Medida sobre créditos**, no sobre cantidad
de cursos.

```jsonc
{
  "carrera_id": 5,
  "porcentaje_avance": 37.5,     // creditos_aprobados / creditos_totales * 100
  "creditos_aprobados": 9,
  "creditos_en_curso": 5,
  "creditos_totales": 24,
  "creditos_restantes": 15,
  "cursos_aprobados": 2,
  "cursos_en_curso": 1,
  "cursos_totales": 6
}
```

Si necesitas el avance dentro de tu propio código Python, importa
`core.avance.calcular_avance(cursos, progreso)` — es una función pura, sin
consultas, y es la misma que alimenta este endpoint, el dashboard y el resumen
del onboarding.

---

## 4. `GET /api/dashboard/test-nivel` — diagnóstico y ruta sugerida (RF-19, RF-20)

**El insumo más útil para personalizar contenido con IA.** No es un cuestionario:
se deriva del récord que el estudiante ya declaró.

```jsonc
{
  "nivel": "intermedio",              // "inicial" | "intermedio" | "avanzado"
  "ciclo_actual": 3,
  "porcentaje_avance": 37.5,
  "creditos_aprobados": 9,
  "creditos_totales": 24,
  "promedio_ponderado": 13.67,        // escala 0-20, ponderado por créditos
  "cursos_atrasados": [               // de ciclos anteriores, sin aprobar ni llevar
    { "id": 5, "code": "CB301", "name": "Química", "credits": 3, "ciclo": 1 }
  ],
  "fortalezas": [                     // aprobados con nota >= 16
    { "id": 1, "code": "MB101", "name": "Álgebra", "credits": 4, "ciclo": 1, "nota": 17.0 }
  ],
  "a_reforzar": [                     // aprobados con nota < 13
    { "id": 2, "code": "MB146", "name": "Cálculo I", "credits": 5, "ciclo": 1, "nota": 11.0 }
  ],
  "recomendacion": {
    "mensaje": "Tienes 2 curso(s) pendientes de ciclos anteriores. Prioriza ...",
    "cursos_sugeridos": [
      { "id": 1, "code": "MB101", "name": "Álgebra", "credits": 4, "ciclo": 1, "desbloquea": 3 }
    ]
  }
}
```

**`desbloquea`** = cuántos cursos quedan habilitados, directa o indirectamente,
al aprobar ese curso. Es el criterio de prioridad de la ruta sugerida: aprobar un
curso del que cuelgan seis abre mucho más camino que uno que no habilita nada,
aunque den los mismos créditos.

### Cómo usarlo desde la Fase 4

| Para... | Usa |
|---|---|
| Ajustar la dificultad de una evaluación | `nivel`, `promedio_ponderado` |
| Elegir temas de refuerzo | `a_reforzar`, `cursos_atrasados` |
| Sugerir qué estudiar después | `recomendacion.cursos_sugeridos` |
| Evitar temas que aún no vio | los cursos con `status: "locked"` de la malla |

> **Ojo con `fortalezas` y `a_reforzar`:** salen de las notas registradas. Si el
> estudiante no cargó notas, **ambas listas llegan vacías**. Eso es intencional
> —no se inventa una clasificación— pero tu prompt debe tolerarlo.

---

## 5. `GET /api/dashboard/actividad` — actividad y filtros (RF-21, RF-22)

Parámetros: `?periodo=7d|30d|90d|semestre|todo` (por defecto `30d`) y
`?curso_id=<int>` (opcional).

```jsonc
{
  "periodo": "30d",
  "curso_id": null,
  "resumen": {
    "inicios_sesion": 12,
    "evaluaciones_rendidas": 4,
    "evaluaciones_aprobadas": 3,
    "tasa_aprobacion": 75.0,               // sobre las rendidas
    "nota_promedio_evaluaciones": 14.2,
    "unidades_completadas": 7,
    "ultimo_acceso": "2026-07-28T10:00:00+00:00",
    "total_eventos": 23
  },
  "actividad_por_dia": [                   // orden cronológico ascendente
    { "fecha": "2026-07-26", "eventos": 2 }
  ],
  "avance_por_curso": [
    {
      "curso_id": 12, "code": "MB146", "name": "Cálculo I",
      "credits": 5, "ciclo": 1, "status": "completed",
      "nota": 15.5, "fecha_completado": "2026-01-15T00:00:00+00:00",
      "progreso": 100
    }
  ]
}
```

### ⚠️ Acción requerida de la Fase 4

`evaluaciones_rendidas` y `evaluaciones_aprobadas` **darán 0 hasta que la Fase 4
registre los resultados.** Hoy `POST /evaluaciones/evaluar` calcula el resultado
y lo devuelve sin persistirlo — y ni siquiera pide autenticación, así que no se
sabe de quién es.

Cuando ese endpoint tenga sesión, basta con añadir una línea:

```python
from app.core.actividad import TIPO_EVALUACION, registrar_evento

registrar_evento(
    supabase, user.id, TIPO_EVALUACION,
    curso_id=curso_id,
    metadata={"nota": resultado.nota, "aprobado": resultado.aprobado},
)
```

`registrar_evento` **nunca lanza excepciones**: si la tabla no existe o la base
está caída, deja un aviso en el log y devuelve `False`. Puedes llamarla sin
envolverla en `try`, y un fallo de telemetría no tumbará la evaluación.

Tipos disponibles: `TIPO_LOGIN`, `TIPO_EVALUACION`, `TIPO_UNIDAD`,
`TIPO_CURSO_COMPLETADO`.

---

## 5b. `GET /api/dashboard/cursos-activos` — cursos en curso con avance real

Alimenta "Continúa donde te quedaste". Un solo llamado devuelve todos los
cursos que el estudiante lleva este ciclo, ya con su avance por temas.

```jsonc
{
  "cursos": [
    {
      "id": 12,
      "code": "MB146",
      "name": "Cálculo I",
      "credits": 5,
      "ciclo": 1,
      "progreso": 33,            // % de temas completados
      "temas_completados": 1,
      "temas_totales": 3,
      "siguiente_tema": "Derivadas"  // null si no hay ruta o ya terminó
    }
  ]
}
```

Ordenado de mayor a menor avance. Si el curso no tiene ruta de aprendizaje
cargada, `temas_totales` es 0 y `siguiente_tema` es `null` — no se inventa un
"sigue con...".

> Úsalo en vez de pedir `/curso/{id}/learning-path` por cada curso: eso eran
> hasta 12 peticiones, cada una con timeline completo, banco de exámenes e
> insights, para pintar unas tarjetas.

---

## 6. Perfil del estudiante

| Endpoint | Qué hace |
|---|---|
| `GET /api/usuarios/me` | Perfil completo (fila de `perfiles`) |
| `PUT /api/usuarios/perfil` | Cambia **solo** `nombre_completo` (RF-PRF-02) |
| `PUT /api/usuarios/password` | Cambia contraseña; exige `password_actual` (RF-PRF-03) |
| `GET /api/onboarding/resumen` | Resumen académico de la Fase 2; su avance sale del mismo cálculo de §3 |

**El correo y el código universitario no son editables por nadie.** Identifican
al estudiante ante la UNI y su unicidad sostiene el registro (RF-EST-02) y el
login por código (RF-01).

---

## 7. Trampas conocidas

Cosas que van a morderte si no las sabes de antemano.

### 7.1 Los ids de curso no tienen el mismo tipo en todas partes

| Endpoint | Tipo de id |
|---|---|
| `GET /api/malla/` | **string** (`"12"`) |
| `GET /api/dashboard/test-nivel` | **int** (`12`) |
| `GET /api/dashboard/actividad` | **int** (`12`) |

Viene de que el esquema de la malla declara `id: str` desde antes de la Fase 3.
**Normaliza antes de cruzar datos entre endpoints**: comparar `"12" == 12` en
Python da `False` en silencio, y en JavaScript `"12" === 12` también.

> Pendiente de decisión de equipo: unificar todo a `int` es un cambio de
> contrato en un endpoint que el frontend ya consume, así que no se hizo
> unilateralmente.

### 7.2 Hay dos `progreso` y significan cosas distintas

| Endpoint | Qué mide `progreso` |
|---|---|
| `GET /api/malla/` y `avance_por_curso` | **Binario**: 100 si el curso está aprobado, 0 si no |
| `GET /api/dashboard/cursos-activos` | **Porcentaje real** de temas completados dentro del curso |

La malla lo deja binario a propósito: colgarla de `progreso_unidades` —una
tabla que puede no existir en algunos entornos— la volvería frágil, y ahí lo
que importa es el estado del curso, no cuánto lleva por dentro.

Cuando necesites el avance fino, léelo de `cursos-activos` (§5b) en lugar de
recalcularlo: usa la misma fuente que el detalle de curso, así que las dos
pantallas no pueden discrepar.

### 7.3 Hay dos definiciones de "promedio" en circulación

- `promedio_ponderado` (diagnóstico) → **ponderado por créditos**. Es el correcto.
- `promedioPonderado` (`/dashboard/summary`) → ahora también ponderado, pero el
  campo conserva su nombre en *camelCase* por compatibilidad con el frontend.

Ambos salen de `core.avance.promedio_ponderado`. Un curso aprobado **sin nota
registrada se excluye** del promedio en lugar de contarse como cero.

### 7.4 El avance se mide en créditos, no en cursos

Ya ocurrió una vez que el dashboard lo calculaba por cantidad de cursos y el
onboarding por créditos. Para un estudiante con dos cursos de 1 crédito
aprobados y uno de 10 pendiente, eso daba **16.7% vs 66.7%** según la pantalla.
RF-07 fija créditos. Si necesitas el avance, no lo derives: pídelo.

### 7.5 Sin onboarding no hay contexto

`GET /api/malla/`, `/malla/avance` y `/dashboard/test-nivel` responden **400**
—no `[]` ni ceros— si el estudiante no eligió carrera. Tu código debe
distinguir "no completó su onboarding" de "falló el servidor".

---

## 8. Qué NO está en este contrato

Para que nadie lo asuma disponible:

- **Resultados de evaluaciones**: no se persisten todavía (§5).
- **Horas de estudio**: `/dashboard/summary` devuelve un `120` fijo, marcado como
  placeholder en el código. No hay tabla que lo respalde.
- **Avance por unidades dentro de un curso**: RF-11, Fase 4 (§7.2).
- **Historial de conversaciones con la IA**: RF-18, Fase 4.
