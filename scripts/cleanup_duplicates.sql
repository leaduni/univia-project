-- Clean up duplicate careers and courses
-- Target: Remove Carrera ID 1 (Old 'Ingeniería de Sistemas'/'Software' placeholder) and its courses.
-- Target: Ensure only Carrera ID 5 (Software) and 7 (Systems) remain for those fields.

BEGIN;

-- 1. Remove courses associated with Carrera ID 1
-- These are the ones with codes like 'MA115', 'SY101', etc.
DELETE FROM cursos WHERE carrera_id = 1;

-- 2. Remove Carrera ID 1
DELETE FROM carreras WHERE id = 1;

-- 3. Verify and Fix 'Ingeniería de Sistemas' if duplicates exist in name but different code
-- We found ID 7 is the new one with code 'SI'.
-- If there are any other duplicates with valid courses, we might need to merge, but based on analysis ID 1 was the main culprit.

-- 4. Check for any other courses that might be orphans or incorrectly assigned
-- (Optional safety check)

COMMIT;
