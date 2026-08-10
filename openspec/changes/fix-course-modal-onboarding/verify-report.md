```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:79fd996f9ce29dbaf832f7fa93d216aadf9108d68f0f1c0bc4be4b3c83cc94a8
verdict: fail
blockers: 0
critical_findings: 3
requirements: 1/4
scenarios: 11/14
test_command: python -m pytest tests/test_onboarding_completion.py -v (backend/) ; npx vitest run (frontend/)
test_exit_code: 0
test_output_hash: sha256:79fd996f9ce29dbaf832f7fa93d216aadf9108d68f0f1c0bc4be4b3c83cc94a8
build_command: npx tsc --noEmit (frontend/) ; python -c "import compileall; compileall.compile_dir('app', force=True, quiet=1)" (backend/)
build_exit_code: 0
build_output_hash: sha256:f9318a1caa8c84514f5205aa35a92b7dbd1f22c83fd798e6414ee119d16e3ddd
```

## Verification Report

**Change**: fix-course-modal-onboarding
**Version**: N/A
**Mode**: Standard

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 8 |
| Tasks complete | 8 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ✅ Passed
```text
# Frontend: npx tsc --noEmit
Exit code: 0 — no type errors.

# Backend: python -c "import compileall; compileall.compile_dir('app', force=True, quiet=1)"
Exit code: 0 — compilation successful.
```

**Tests**: ✅ 10 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
# Backend: python -m pytest tests/test_onboarding_completion.py -v
============================= test session starts =============================
platform win32 -- Python 3.14.6, pytest-9.1.1, pluggy-1.6.0
collected 3 items

tests/test_onboarding_completion.py::test_re_submission_all_courses_already_persisted_returns_200 PASSED
tests/test_onboarding_completion.py::test_invalid_carrera_id_returns_400 PASSED
tests/test_onboarding_completion.py::test_invalid_curso_id_returns_400 PASSED

======================== 3 passed, 1 warning in 0.19s =========================

# Frontend: npx vitest run
RUN  v2.1.9
api-service.test.ts (4 tests) 9ms
learning-path.test.tsx (3 tests) 107ms

Test Files  2 passed (2)
     Tests  7 passed (7)
```

**Coverage**: ➖ Not available (no coverage tool configured)

### Spec Compliance Matrix

**Spec: course-completion-redirect** (2 requirements, 5 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Accurate Spanish Text Rendering | Spanish text renders correctly | `__tests__/learning-path.test.tsx > HTML entity replacement > does not render HTML entities in the accessDenied view` | ✅ COMPLIANT |
| Accurate Spanish Text Rendering | Spanish text renders correctly | `__tests__/learning-path.test.tsx > HTML entity replacement > does not render HTML entities in the completeSuccess view` | ✅ COMPLIANT |
| Accurate Spanish Text Rendering | Mixed content with credits badge | (covered by entity-replacement tests — `&eacute;` included in ENTITY_PATTERN regex) | ✅ COMPLIANT |
| Course Completion Redirect | Success banner appears after completion | `__tests__/learning-path.test.tsx > Course completion redirect > redirects to / after 2500ms when course is completed` (verifies banner text before redirect) | ✅ COMPLIANT |
| Course Completion Redirect | Auto-redirect to dashboard after banner timeout | `__tests__/learning-path.test.tsx > Course completion redirect > redirects to / after 2500ms when course is completed` (verifies `mockRouterPush("/")`) | ✅ COMPLIANT |
| Course Completion Redirect | Completion failure does not redirect | (no dedicated test — implementation at `learning-path.tsx:159-161` catches error, sets `error` state, does NOT redirect) | ❌ UNTESTED |

**Spec: onboarding-completion-idempotency** (1 requirement, 4 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Onboarding Completion Idempotency | Re-submission with all courses already persisted | `backend/tests/test_onboarding_completion.py > test_re_submission_all_courses_already_persisted_returns_200` | ✅ COMPLIANT |
| Onboarding Completion Idempotency | Partial re-submission with some new courses | (no dedicated test — implementation at `onboarding.py:601` filters existing courses, only inserts new) | ❌ UNTESTED |
| Onboarding Completion Idempotency | Invalid course IDs still return 400 | `backend/tests/test_onboarding_completion.py > test_invalid_curso_id_returns_400` | ✅ COMPLIANT |
| Onboarding Completion Idempotency | Invalid carrera_id still returns 400 | `backend/tests/test_onboarding_completion.py > test_invalid_carrera_id_returns_400` | ✅ COMPLIANT |

**Spec: frontend-error-display** (1 requirement, 5 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Structured Error Parsing | Structured field error renders as readable text | `frontend/lib/__tests__/api-service.test.ts > completeOnboarding error parsing > parses structured {errors: [{field, message}]} into readable text` | ✅ COMPLIANT |
| Structured Error Parsing | Multiple field errors surface all messages | `frontend/lib/__tests__/api-service.test.ts > completeOnboarding error parsing > parses multiple structured errors and surfaces at least the first` | ✅ COMPLIANT |
| Structured Error Parsing | Fallback to detail when errors array is empty | (no dedicated test — `extraerMensajeError` at `api-service.ts:32` returns `body?.errors?.[0]?.message \|\| body?.detail \|\| null`; empty `errors: []` naturally falls through to `body.detail`) | ❌ UNTESTED |
| Structured Error Parsing | Fallback to detail when errors array is absent | `frontend/lib/__tests__/api-service.test.ts > completeOnboarding error fallback > falls back to detail when errors key is absent` | ✅ COMPLIANT |
| Structured Error Parsing | Fallback to status text when no parsable body | `frontend/lib/__tests__/api-service.test.ts > completeOnboarding error fallback > falls back to status text when body is not parseable JSON` | ✅ COMPLIANT |

**Compliance summary**: 11/14 scenarios compliant

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Accurate Spanish Text Rendering | ✅ Implemented | All 14 HTML entities replaced with Unicode in `learning-path.tsx`. Tests verify no `&aacute;`, `&eacute;`, `&iacute;`, `&oacute;`, `&uacute;`, `&ntilde;`, `&iquest;`, `&iexcl;` entities present. Non-Spanish entities (`&middot;`) out of scope. |
| Course Completion Redirect | ✅ Implemented | `handleConfirmComplete` at `learning-path.tsx:152` calls `setTimeout(() => router.push("/"), 2500)` after successful completion. Success banner displays "Curso completado exitosamente". On error, only `setError` is called — no redirect. |
| Onboarding Completion Idempotency | ✅ Implemented | `onboarding.py:601-604` filters already-persisted courses, logs "All courses already persisted, skipping enrollment", and proceeds to 200 OK. Only new courses are enrolled. Validation for invalid `carrera_id` and `curso_id` occurs before the idempotency filter. |
| Structured Error Parsing | ✅ Implemented | `extraerMensajeError` at `api-service.ts:31-33` extracts `errors[0].message` first, falls back to `detail`, then `null`. `completeOnboarding` at line 380 uses `extraerMensajeError(errorBody)`. |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| No design artifact found | N/A | Design coherence skipped — no design artifact exists for this change. |

### Issues Found

**CRITICAL**: 
1. **UNTESTED** — `course-completion-redirect / Completion failure does not redirect`: No dedicated test covers the scenario where `apiService.completarCurso` rejects and the component does NOT navigate. Implementation (`learning-path.tsx:159-161`) correctly sets error without redirect, but this is not proven at runtime.
2. **UNTESTED** — `onboarding-completion-idempotency / Partial re-submission with some new courses`: No test verifies that when a user resubmits `[A, B, C]` where A and B are already persisted, only C is enrolled and A/B are silently skipped. Implementation (`onboarding.py:601`) filters correctly, but no runtime proof exists.
3. **UNTESTED** — `frontend-error-display / Fallback to detail when errors array is empty`: No test verifies behavior when the backend returns `{"errors": [], "detail": "Solicitud inválida."}`. The `extraerMensajeError` function (`api-service.ts:32`) handles this via the `|| body?.detail` fallback since `body.errors[0]` is undefined for an empty array, but this path is not exercised at runtime.

**WARNING**: None.

**SUGGESTION**: 
1. Add a test in `learning-path.test.tsx` for the completion failure path: mock `completarCurso` to reject, verify no `router.push` call occurs and error state is set.
2. Add a test in `test_onboarding_completion.py` for partial re-submission: mock 2 of 3 courses as already in `progreso_cursos`, verify only the new one is inserted.
3. Add a test in `api-service.test.ts` for `errors: []` with `detail` fallback to cover the empty-array path explicitly.

### Verdict
**FAIL** — 3 spec scenarios are UNTESTED (no dedicated runtime covering test exists). The implementation code is correct for all 3 scenarios, but runtime test evidence is required per strict verification rules. All 10 existing tests pass, all 8 tasks are complete, builds succeed, and 11/14 scenarios have passing runtime coverage.
