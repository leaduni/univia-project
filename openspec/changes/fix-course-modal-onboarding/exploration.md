## Exploration: fix-course-modal-onboarding — HTML entity corruption & onboarding 400

### Current State

Two independent bugs exist in the frontend and backend of the UniVia platform. Bug A manifests as unreadable text in the course completion modal button (and several other labels in the learning-path view). Bug B manifests as a 400 Bad Request when the onboarding wizard submits to `/onboarding/complete`.

### Affected Areas

#### Bug A — HTML Entity Corruption

- `frontend/components/learning-path.tsx:398` — Confirm button text `"S&iacute;, completar al 100%"` renders as literal `S&iacute;` instead of `Sí`
- `frontend/components/learning-path.tsx:74` — Access-denied message: `a&uacute;n`
- `frontend/components/learning-path.tsx:91` — Success message: `desbloquear&aacute;n`
- `frontend/components/learning-path.tsx:216` — IA button: `evaluaci&oacute;n`
- `frontend/components/learning-path.tsx:223` — Exam bank button: `ex&aacute;menes`
- `frontend/components/learning-path.tsx:233` — Credits metric: `cr&eacute;ditos`
- `frontend/components/learning-path.tsx:241` — Syllabus label: `s&iacute;labo`
- `frontend/components/learning-path.tsx:248` — Resources metric: `Ex&aacute;menes, pr&aacute;cticas`
- `frontend/components/learning-path.tsx:315` — AI widget heading: `An&aacute;lisis`
- `frontend/components/learning-path.tsx:324` — AI widget button: `pr&aacute;ctica`
- `frontend/components/learning-path.tsx:351` — Streak widget: `d&iacute;as`
- `frontend/components/learning-path.tsx:371` — Professor quote: `ex&aacute;menes`, `an&aacute;lisis`, `pr&aacute;cticos`
- `frontend/components/learning-path.tsx:381` — Modal heading: `&iquest;`
- `frontend/components/learning-path.tsx:383` — Modal body: `acci&oacute;n`, `registrar&aacute;`, `desbloquear&aacute;n`

**Root cause**: The file uses HTML entity references (`&aacute;`, `&eacute;`, `&iacute;`, `&oacute;`, `&uacute;`, `&iquest;`) as literal text strings inside JSX. React's JSX engine escapes all text content by default — HTML entities are NOT decoded. The correct approach is to use the actual Unicode characters directly (e.g., `"Sí, completar al 100%"`).

**Secondary issue — no redirect after completion**: `learning-path.tsx:148-150` — after successful `completarCurso()`, the component shows a success banner with a manual "Volver a Mi Malla" link, then hides the banner after 4 seconds. No automatic `router.push("/")` redirect occurs. The user must explicitly click the link. Expected behavior: automatic redirect to the main dashboard.

#### Bug B — 400 Bad Request on POST /api/onboarding/complete

- `backend/app/routers/onboarding.py:543-690` — `complete_onboarding` endpoint handler
- `backend/app/schemas/onboarding.py:15-44` — `OnboardingCompleteRequest(SeleccionCursosBase)` Pydantic schema
- `frontend/components/onboarding-wizard.tsx:71-76` — payload assembly (`carrera_id`, `ciclo_actual`, `cursos_inscritos`)
- `frontend/lib/api-service.ts:364-388` — `completeOnboarding()` HTTP client
- `frontend/components/onboarding/current-enrollment-step.tsx:98-452` — course selection UI

**Pydantic schema (expected payload)**:
- `carrera_id: int = Field(gt=0)` — career ID, must be positive
- `ciclo_actual: int = Field(ge=1, le=20)` — current semester cycle
- `cursos_inscritos: List[int]` — enrolled course IDs (1–12, no duplicates, all positive)

**Frontend payload (what's sent)**: `{"carrera_id": 7, "ciclo_actual": 2, "cursos_inscritos": [21]}` — structurally matches the schema. Pydantic validation passes.

**Root cause**: The 400 originates from business-level validators inside `complete_onboarding`, not from Pydantic. The exact trigger depends on database state, but the possible 400 triggers are:

1. `_obtener_carrera` (line 42-64): carrera_id=7 doesn't exist in `carreras` table → detail: `"La carrera seleccionada no existe."`
2. `_validar_ciclo` (line 67-76): `ciclo_actual=2` exceeds the carrera's `duracion_ciclos` → detail: `"XXX tiene N ciclos, así que el ciclo 2 no es válido."`
3. `_validar_cursos_de_carrera` (line 79-94): curso 21 has a different `carrera_id` in the DB → detail: `"Seleccionaste 1 curso(s) que no pertenecen a XXX."`
4. Regla A — exclusión mutua (line 588-598): curso 21's direct prerequisite is also in the `inscritos_set` (but [21] has no dupe, so unlikely)
5. Courses already in DB (line 601-604): curso 21 already exists in `progreso_cursos` for this user in `db_status` → the list is filtered to empty → detail: `"Debes inscribirte en al menos 1 curso nuevo."`

**Most probable cause**: Options 1, 3, or 5. Without access to the live database, the exact trigger cannot be confirmed. However, option 5 (course already persisted) is the most subtle bug pattern: if the onboarding was partially completed or the user navigates back/forward in the wizard and re-submits, the backend filters out already-inserted courses and rejects the empty list.

**Secondary issue — error detail serialization**: `raise_field_error` (backend `exceptions.py:17-20`) sends structured error: `{"status":"error","errors":[{"field":"...","message":"..."}]}`. The frontend `api-service.ts:380` wraps `errorBody.detail` in `new Error()`, which becomes `[object Object]` — unreadable to the user.

### Approaches

#### Bug A — Entity Fix

1. **Replace all HTML entities with Unicode characters directly in the JSX strings**
   - Pros: One-line fix per occurrence, no behavior change, maintains VSX semantics
   - Cons: Manual, must catch all 15+ occurrences
   - Effort: Low

2. **Use `dangerouslySetInnerHTML` or `html-entities` decode**
   - Pros: Could handle entities programmatically
   - Cons: `dangerouslySetInnerHTML` introduces XSS risk; decoding library adds dependency; breaks JSX's built-in XSS protection
   - Effort: Medium

#### Bug A — Redirect

1. **Auto-redirect with `router.push("/")` after success + brief delay**
   - Pros: Matches expected UX, simple one-line addition in `handleConfirmComplete`
   - Cons: Brief delay needed for user to see success confirmation
   - Effort: Low

#### Bug B — Onboarding 400

1. **Add explicit error parsing in frontend to surface field-level errors from `raise_field_error`**
   - Pros: Users see actionable error messages ("La carrera no existe", "El curso no pertenece a esta carrera")
   - Cons: Changes error parsing in `api-service.ts`
   - Effort: Low

2. **Fix the specific data integrity issue (determine which validator triggers 400 and fix the data/code)**
   - Pros: Solves the root cause
   - Cons: Requires DB access to diagnose; may be data issue, not code bug
   - Effort: Medium (requires live debugging)

3. **Add idempotency to onboarding completion (skip existing courses instead of rejecting)**
   - Pros: More robust; handles retry/network-recovery scenarios; no 400 for already-saved courses
   - Cons: Changes business logic semantics; must verify it doesn't silently hide real errors
   - Effort: Medium

### Recommendation

**For Bug A**: Approach 1 — replace all HTML entities with Unicode characters in `learning-path.tsx`. This is a one-time edit of ~15 text strings. Combine with approach 1 for the redirect: add `router.push("/")` inside `handleConfirmComplete` after the 4-second timeout.

**For Bug B**: Approach 1 first (improve error parsing) so the user can see which field caused the 400. Then investigate the specific data trigger. If the cause is option 5 (re-submission of already-persisted courses), adopt approach 3 (idempotent filtering with a warning log instead of a 400 rejection).

### Risks

- `learning-path.tsx` has no existing tests — any refactor of the text must be verified manually or by adding component tests first
- Bug B diagnosis is incomplete without database access — the exploration identifies the 5 possible 400 trigger points but not the specific one for the user's payload
- The onboarding wizard has no existing unit/integration tests (backend `tests/` is empty)
- Changing the error detail format in `raise_field_error` could break other consumers that parse the structured error response
- The `completarCurso` backend endpoint does NOT validate that the course belongs to the user's career — a separate concern but worth noting

### Ready for Proposal

Yes. The exploration has identified exact file paths, line numbers, and root causes for Bug A. Bug B's exact trigger depends on the database state but all 5 possible code paths have been identified and can be addressed holistically in the proposal.
