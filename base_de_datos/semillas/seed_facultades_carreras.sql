-- =============================================================================
-- SEED — Facultades y Carreras base de la UNI
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Puebla las 11 facultades oficiales de la Universidad Nacional de Ingeniería
-- (UNI) y sus carreras, según la lista de `system.md`. Estas filas alimentan el
-- Foro (canales por facultad) y el catálogo académico general.
--
-- Re-ejecutable: usa ON CONFLICT (codigo) DO NOTHING, de modo que no duplica
-- filas si se corre más de una vez. Si una facultad/carrera ya existe con su
-- código, se respeta la fila existente.
--
-- Ejecutar en el SQL Editor de Supabase después de las migraciones base.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Facultades (11 oficiales de la UNI)
-- -----------------------------------------------------------------------------
INSERT INTO public.facultades (codigo, nombre, descripcion) VALUES
    ('FAUA',   'Facultad de Arquitectura, Urbanismo y Artes',                    'Arquitectura, Urbanismo y Artes.'),
    ('FC',     'Facultad de Ciencias',                                           'Ciencias básicas.'),
    ('FIA',    'Facultad de Ingeniería Ambiental',                               'Ingeniería Ambiental.'),
    ('FIC',    'Facultad de Ingeniería Civil',                                   'Ingeniería Civil.'),
    ('FIEECS', 'Facultad de Ingeniería Económica, Estadística y Ciencias Sociales', 'Ingeniería Económica, Estadística y Ciencias Sociales.'),
    ('FIEE',   'Facultad de Ingeniería Eléctrica y Electrónica',                 'Ingeniería Eléctrica y Electrónica.'),
    ('FIGMM',  'Facultad de Ingeniería Geológica, Minera y Metalúrgica',         'Ingeniería Geológica, Minera y Metalúrgica.'),
    ('FIIS',   'Facultad de Ingeniería Industrial y Sistemas',                   'Ingeniería Industrial y Sistemas.'),
    ('FIM',    'Facultad de Ingeniería Mecánica',                                'Ingeniería Mecánica.'),
    ('FIP',    'Facultad de Ingeniería de Petróleo, Gas Natural y Petroquímica', 'Ingeniería de Petróleo, Gas Natural y Petroquímica.'),
    ('FIQT',   'Facultad de Ingeniería Química y Textil',                        'Ingeniería Química y Textil.')
ON CONFLICT (codigo) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Carreras por facultad (base mínima de cada facultad)
-- -----------------------------------------------------------------------------
-- Cada facultad necesita al menos su carrera homónima para que el Foro por
-- facultad tenga datos que colgar (perfiles.carrera_id -> carreras.facultad_id).
INSERT INTO public.carreras (facultad_id, codigo, name, description) VALUES
    -- FAUA
    ((SELECT id FROM public.facultades WHERE codigo = 'FAUA'),   'FAUA',   'Arquitectura', 'Arquitectura.'),
    -- FC
    ((SELECT id FROM public.facultades WHERE codigo = 'FC'),     'FC',     'Ciencias', 'Ciencias.'),
    -- FIA
    ((SELECT id FROM public.facultades WHERE codigo = 'FIA'),    'FIA',    'Ingeniería Ambiental', 'Ingeniería Ambiental.'),
    -- FIC
    ((SELECT id FROM public.facultades WHERE codigo = 'FIC'),    'FIC',    'Ingeniería Civil', 'Ingeniería Civil.'),
    -- FIEECS
    ((SELECT id FROM public.facultades WHERE codigo = 'FIEECS'), 'FIEECS', 'Ingeniería Económica, Estadística y Ciencias Sociales', 'Ingeniería Económica, Estadística y Ciencias Sociales.'),
    -- FIEE
    ((SELECT id FROM public.facultades WHERE codigo = 'FIEE'),   'FIEE',   'Ingeniería Eléctrica y Electrónica', 'Ingeniería Eléctrica y Electrónica.'),
    -- FIGMM
    ((SELECT id FROM public.facultades WHERE codigo = 'FIGMM'),  'FIGMM',  'Ingeniería Geológica, Minera y Metalúrgica', 'Ingeniería Geológica, Minera y Metalúrgica.'),
    -- FIIS
    ((SELECT id FROM public.facultades WHERE codigo = 'FIIS'),   'FIIS',   'Ingeniería Industrial y Sistemas', 'Ingeniería Industrial y Sistemas.'),
    -- FIM
    ((SELECT id FROM public.facultades WHERE codigo = 'FIM'),    'FIM',    'Ingeniería Mecánica', 'Ingeniería Mecánica.'),
    -- FIP
    ((SELECT id FROM public.facultades WHERE codigo = 'FIP'),    'FIP',    'Ingeniería de Petróleo, Gas Natural y Petroquímica', 'Ingeniería de Petróleo, Gas Natural y Petroquímica.'),
    -- FIQT
    ((SELECT id FROM public.facultades WHERE codigo = 'FIQT'),   'FIQT',   'Ingeniería Química y Textil', 'Ingeniería Química y Textil.')
ON CONFLICT (codigo) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT f.codigo, f.nombre, COUNT(c.id) AS carreras
-- FROM public.facultades f
-- LEFT JOIN public.carreras c ON c.facultad_id = f.id
-- GROUP BY f.id ORDER BY f.codigo;