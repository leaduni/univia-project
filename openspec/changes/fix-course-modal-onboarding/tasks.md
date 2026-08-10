# Tasks: Fix Course Modal & Onboarding Bugs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150-200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Fix onboarding idempotency + frontend errors + entities + redirect | Single PR | `pytest backend/tests/test_onboarding_completion.py -v; npm --prefix frontend test -- learning-path api-service` | `npm --prefix frontend dev` — complete a course, verify redirect | Git revert `onboarding.py`, `learning-path.tsx`, `api-service.ts` |

## Phase 1: Backend — Onboarding Idempotency (Bug B)

- [x] 1.1 RED: Write `backend/tests/test_onboarding_completion.py` — re-submit identical `cursos_inscritos` returns 200 OK (no duplicates)
- [x] 1.2 RED: Same file — invalid `carrera_id` and invalid `curso_id` still return 400 with structured errors
- [x] 1.3 GREEN: In `backend/app/routers/onboarding.py` L601-604, replace `raise HTTPException(400)` with `logger.info("All courses already persisted, skipping enrollment")` + continue to 200 OK

## Phase 2: Frontend — HTML Entities & Redirect (Bug A)

- [x] 2.1 RED: Write `frontend/__tests__/learning-path.test.tsx` — assert no `&...;` entity strings in rendered output; assert completion triggers redirect to `/` after 2500ms
- [x] 2.2 GREEN: Replace all `&aacute;`, `&eacute;`, `&iacute;`, `&oacute;`, `&uacute;`, `&iquest;` entities with Unicode characters in `frontend/components/learning-path.tsx` (14 occurrences)
- [x] 2.3 GREEN: In `handleConfirmComplete` (`learning-path.tsx` L143-161), add `setTimeout(() => router.push("/"), 2500)` after successful completion

## Phase 3: Frontend — Structured Error Parsing (Bug C)

- [x] 3.1 RED: Write `frontend/lib/__tests__/api-service.test.ts` — verify `completeOnboarding` surfaces `errors[0].message`, falls back to `detail`, falls back to status text
- [x] 3.2 GREEN: In `frontend/lib/api-service.ts` `completeOnboarding` (L378-380), call `extraerMensajeError(errorBody)` instead of reading `errorBody.detail` directly

## Verification Checklist

- [x] `pytest backend/tests/test_onboarding_completion.py -v` — all pass (3/3)
- [x] `npm --prefix frontend test -- learning-path api-service` — all pass (7/7)
- [ ] Manual: complete a course → success banner renders clean Spanish → auto-redirects to `/` within 3s
- [ ] Manual: re-submit onboarding with same courses → 200 OK
