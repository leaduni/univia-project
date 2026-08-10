# Frontend Error Display Specification

## Purpose

Defines how the frontend api-service parses structured backend error responses into readable field-level messages for the user.

## Requirements

### Requirement: Structured Error Parsing

The frontend api-service MUST parse structured error responses of the form `{errors: [{field: string, message: string}]}` and extract field-level messages. When the `errors` array is absent or empty, the service MUST fall back to the `detail` string.

#### Scenario: Structured field error renders as readable text

- GIVEN the backend returns `400` with body `{"errors": [{"field": "cursos_inscritos", "message": "El curso 123 no pertenece a la carrera seleccionada."}]}`
- WHEN the frontend api-service processes the error response
- THEN the user sees the message "El curso 123 no pertenece a la carrera seleccionada."
- AND the error is NOT displayed as `[object Object]`

#### Scenario: Multiple field errors surface all messages

- GIVEN the backend returns `400` with `{"errors": [{"field": "a", "message": "M1"}, {"field": "b", "message": "M2"}]}`
- WHEN the frontend api-service processes the error
- THEN at minimum the first field-level message is surfaced
- AND no raw object string is shown to the user

#### Scenario: Fallback to detail when errors array is empty

- GIVEN the backend returns `400` with `{"errors": [], "detail": "Solicitud inválida."}`
- WHEN the frontend api-service processes the error response
- THEN the error message "Solicitud inválida." is surfaced to the user

#### Scenario: Fallback to detail when errors array is absent

- GIVEN the backend returns `400` with `{"detail": "Forbidden"}`
- WHEN the frontend api-service processes the error response and no `errors` key exists
- THEN the error message "Forbidden" is surfaced to the user

#### Scenario: Fallback to status text when no parsable body

- GIVEN the backend returns `500` with no JSON body
- WHEN the frontend api-service fails to parse the response body
- THEN the error message falls back to the HTTP status text
