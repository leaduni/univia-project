-- =============================================================================
-- SEED — Secciones iniciales del Foro (Global + 11 Facultades UNI)
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Puebla el "Foro Global" y un canal por cada facultad creada en
-- `seed_facultades_carreras.sql`. Cada canal de facultad se vincula por
-- facultad_id, de modo que el backend filtra la visibilidad por la carrera del
-- estudiante (perfiles.carrera_id -> carreras.facultad_id).
--
-- Re-ejecutable: protege contra duplicados por (tipo, facultad_id) y por
-- titulo para el canal global. Se borran primero los posibles duplicados para
-- mantener una única fila por canal.
--
-- Dependencias: debe ejecutarse DESPUÉS de `seed_facultades_carreras.sql` y de
-- `migracion_foro_fase1.sql`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Foro Global (transversal, visible para todos)
-- -----------------------------------------------------------------------------
DELETE FROM public.foro_secciones
WHERE tipo = 'global' AND titulo = 'Foro Global';

INSERT INTO public.foro_secciones (tipo, titulo, descripcion, facultad_id)
VALUES (
    'global',
    'Foro Global',
    'Discusión general de la comunidad UniVia: noticias, avisos y dudas que cruzan toda la UNI.',
    NULL
);

-- -----------------------------------------------------------------------------
-- 2. Canales por facultad (una sección por cada facultad de la UNI)
-- -----------------------------------------------------------------------------
DELETE FROM public.foro_secciones
WHERE tipo = 'facultad' AND facultad_id IN (SELECT id FROM public.facultades);

INSERT INTO public.foro_secciones (tipo, titulo, descripcion, facultad_id)
SELECT
    'facultad',
    f.nombre,
    'Comunidad de la ' || f.nombre || ' (UNI). Comparte material, dudas y avisos de tu facultad.',
    f.id
FROM public.facultades f;

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT s.tipo, s.titulo, f.codigo AS facultad
-- FROM public.foro_secciones s
-- LEFT JOIN public.facultades f ON f.id = s.facultad_id
-- ORDER BY s.tipo, s.titulo;