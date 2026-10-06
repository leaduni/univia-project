-- Remote course/professor IDs are denormalized; no FK to Supabase tables.
CREATE TABLE IF NOT EXISTS rag_course_professors (
    curso_id integer NOT NULL,
    profesor_id integer NOT NULL,
    profesor_nombre text,
    synced_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (curso_id, profesor_id)
);

CREATE INDEX IF NOT EXISTS idx_rag_course_professors_profesor_curso
    ON rag_course_professors (profesor_id, curso_id);
