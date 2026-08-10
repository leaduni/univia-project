# Course Completion Redirect Specification

## Purpose

Defines accurate Spanish text rendering in the learning-path component and auto-redirect to dashboard after course completion.

## Requirements

### Requirement: Accurate Spanish Text Rendering

The learning-path component MUST render all Spanish characters as Unicode (e.g., `í`, `ó`, `á`, `é`, `ú`, `¿`, `ñ`) without displaying raw HTML entity strings (`&iacute;`, `&oacute;`, `&aacute;`, etc.).

#### Scenario: Spanish text renders correctly

- GIVEN a user opens the learning-path modal for any course
- WHEN the component renders static JSX text containing Spanish diacritics and special characters
- THEN no raw `&...;` entity string is visible in the rendered output
- AND all accented characters display as their correct Unicode equivalents

#### Scenario: Mixed content with credits badge

- GIVEN the course detail view shows credits or resource counts inline
- WHEN the component renders `créditos` or other inline Spanish text
- THEN the `é` renders as Unicode, not as `&eacute;`

### Requirement: Course Completion Redirect

After a user confirms course completion, the system MUST display a visible success banner for 2-3 seconds and then automatically redirect the user to the dashboard at `/`.

#### Scenario: Success banner appears after completion

- GIVEN a user opens the completion confirmation modal for a course
- WHEN the user confirms "Sí, completar al 100%" and the backend returns success
- THEN a success banner is displayed confirming the course was completed
- AND the banner remains visible for at least 2 seconds and no more than 3 seconds

#### Scenario: Auto-redirect to dashboard after banner timeout

- GIVEN the success banner is displayed after course completion
- WHEN the banner timeout expires (2-3 seconds)
- THEN the user is automatically redirected to `/` (dashboard)
- AND the redirect happens without requiring any further user action

#### Scenario: Completion failure does not redirect

- GIVEN a user confirms course completion
- WHEN the backend returns an error (network failure or server error)
- THEN no redirect occurs
- AND the error is surfaced to the user
