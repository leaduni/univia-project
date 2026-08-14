# Delta for Onboarding Completion Idempotency

## ADDED Requirements

### Requirement: Onboarding Completion Idempotency

When a user re-submits onboarding with the same `carrera_id`, `ciclo_actual`, and already-persisted `cursos_inscritos`, the endpoint MUST return 200 OK and silently skip duplicate courses instead of raising a 400 error.

#### Scenario: Re-submission with all courses already persisted

- GIVEN a user has already completed onboarding with `carrera_id=X`, `ciclo_actual=Y`, and `cursos_inscritos=[A, B, C]`
- WHEN the user re-submits `POST /api/onboarding/complete` with identical `carrera_id`, `ciclo_actual`, and `cursos_inscritos`
- THEN the endpoint returns 200 OK
- AND no new database rows are created for the duplicate courses
- AND the response includes the current enrollment summary

#### Scenario: Partial re-submission with some new courses

- GIVEN a user has persisted `cursos_inscritos=[A, B]`
- WHEN the user submits `cursos_inscritos=[A, B, C]` where C is new
- THEN only course C is enrolled in the database
- AND courses A and B are silently skipped
- AND the endpoint returns 200 OK

#### Scenario: Invalid course IDs still return 400

- GIVEN the user submits `cursos_inscritos` containing an ID not belonging to the selected carrera
- WHEN the endpoint validates `cursos_inscritos`
- THEN the endpoint returns 400 with a structured field error on `cursos_inscritos`
- AND the duplicate-skipping logic does not mask this validation error

#### Scenario: Invalid carrera_id still returns 400

- GIVEN the user submits a `carrera_id` that does not exist
- WHEN the endpoint validates the carrera
- THEN the endpoint returns 400 with a structured field error on `carrera_id`
