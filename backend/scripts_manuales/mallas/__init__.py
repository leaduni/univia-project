"""Mallas curriculares por facultad, transcritas de los planes de estudio oficiales.

Un módulo por facultad (`fim.py`, `fiis.py`, ...). Todos exponen el mismo
contrato, que `scripts_manuales/cargar_mallas.py` consume para volcarlos a la
base sin lógica específica de ninguna facultad:

    FACULTAD   dict: codigo, nombre, descripcion
    CARRERAS   {codigo: (nombre, descripcion, duracion_ciclos,
                         codigo_plan, nombre_malla)}
    NOMBRES    {codigo_curso: nombre}  — `cursos.code` es UNIQUE global
    PLANES     {codigo_carrera: {ciclo: [(codigo, creditos, [prerrequisitos])]}}
    ELECTIVOS  {codigo_carrera: [codigo_curso, ...]}

Los PDFs de origen viven en `mallas_curriculares/<FACULTAD>/`.
"""
