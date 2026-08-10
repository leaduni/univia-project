# Proposal: Fix Course Modal & Onboarding Bugs

## Intent

Two bugs degrade UniVia UX. **Bug A**: HTML entities (`&iacute;`, `&oacute;`, etc.) render as literal text in JSX — 15+ strings show garbled Spanish. Course completion has no auto-redirect to dashboard. **Bug B**: POST `/api/onboarding/complete` returns 400 on re-submission because already-persisted courses are filtered out, producing an empty list. Frontend wraps structured errors into `[object Object]`.

## Scope

### In Scope
- Replace all HTML entities in `learning-path.tsx` with Unicode characters
- Auto-redirect to dashboard 2-3s after course completion
- Make onboarding completion idempotent (200 OK on re-submit, skip duplicates)
- Parse structured backend errors into readable field-level messages on frontend

### Out of Scope
- Component tests for learning-path
- Live DB diagnosis of specific 400 trigger
- UX redesign of success banner or wizard

## Capabilities

### New Capabilities
- `course-completion-redirect`: Auto-redirect to dashboard after completion with visible confirmation
- `onboarding-completion-idempotency`: Re-submissions return 200 OK, duplicates silently skipped
- `frontend-error-display`: Structured `raise_field_error` responses surface as field-level messages

### Modified Capabilities
None — `openspec/specs/` is empty.

## Approach

| Bug | File | Fix |
|-----|------|-----|
| HTML entities | `learning-path.tsx` | Replace `&aacute;` etc. with Unicode across 15+ lines |
| No redirect | `learning-path.tsx` | `router.push("/")` after success banner timeout |
| Onboarding 400 | `onboarding.py` L601-604 | Replace 400 empty-list rejection with log + 200 OK |
| Error display | `api-service.ts` | Parse `errorBody.errors[]` array; fallback to `detail` |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/learning-path.tsx` | Modified | 15+ entity replacements + redirect |
| `backend/app/routers/onboarding.py` | Modified | Idempotency in `complete_onboarding` |
| `frontend/lib/api-service.ts` | Modified | Structured error parsing |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing an entity replacement | Low | Grep `&[a-z]+;` post-fix |
| Idempotency masks real errors | Med | Only soften the empty-list gate; other validators stay strict |
| Error format breaks other consumers | Low | Keep response shape; only change frontend consumption |

## Rollback Plan

Git revert the three files. No schema changes, no migrations. All replacements are 1:1 reversible.

## Dependencies

None.

## Success Criteria

- [ ] All Spanish characters render correctly (no raw `&...;` strings visible)
- [ ] Course completion → banner → auto-redirect to `/` within 4s
- [ ] Re-submitting onboarding with existing courses → 200 OK
- [ ] Backend field errors display as readable text, not `[object Object]`
