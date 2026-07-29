"""Test de nivel inicial y recomendación de ruta (RF-19, RF-20).

El diagnóstico no es un cuestionario: se deriva del récord académico que el
estudiante ya declaró en el onboarding. Eso evita pedirle que responda
preguntas para averiguar algo que la plataforma ya sabe.

Todo aquí es cálculo puro sobre datos ya leídos, sin tocar Supabase, para
poder probarlo con casos concretos.
"""

from typing import Dict, List, Mapping, Optional, Sequence

from app.core.avance import ESTADO_APROBADO, ESTADO_EN_CURSO, AvanceCarrera

# Cortes de nivel sobre el avance en créditos (RF-19). Son tramos de tercios:
# no hay una definición institucional de 'nivel', así que se elige una regla
# simple y explícita en vez de una que aparente precisión que no existe.
UMBRAL_INTERMEDIO = 25.0
UMBRAL_AVANZADO = 60.0

# Escala vigesimal de la UNI. Se usan solo para agrupar, no para decidir si un
# curso está aprobado: eso ya lo dice el estado en progreso_cursos.
NOTA_DESTACADA = 16.0
NOTA_A_REFORZAR = 13.0

# Cuántos cursos sugerir como siguiente paso.
MAX_SUGERENCIAS = 5


def _clasificar_nivel(porcentaje: float) -> str:
    if porcentaje < UMBRAL_INTERMEDIO:
        return "inicial"
    if porcentaje < UMBRAL_AVANZADO:
        return "intermedio"
    return "avanzado"


def contar_desbloqueos(prereq_map: Mapping) -> Dict:
    """Cuántos cursos depende de cada curso, directa o indirectamente.

    Sirve para priorizar: aprobar un curso del que cuelgan seis abre mucho más
    camino que aprobar uno que no habilita nada, aunque ambos den los mismos
    créditos.
    """
    # Grafo inverso: prerrequisito -> cursos que lo exigen.
    sucesores: Dict = {}
    for curso_id, prereqs in prereq_map.items():
        for pid in prereqs:
            sucesores.setdefault(pid, []).append(curso_id)

    impacto: Dict = {}
    for curso_id in sucesores:
        vistos = set()
        cola = [curso_id]
        while cola:
            actual = cola.pop(0)
            for dependiente in sucesores.get(actual, []):
                if dependiente not in vistos:
                    vistos.add(dependiente)
                    cola.append(dependiente)
        impacto[curso_id] = len(vistos)

    return impacto


def generar_diagnostico(
    cursos: Mapping,
    progreso: Mapping,
    prereq_map: Mapping,
    disponibles: Sequence,
    ciclo_actual: int,
    avance: AvanceCarrera,
    promedio: float,
) -> dict:
    """Diagnóstico académico y ruta sugerida.

    Args:
        cursos: {curso_id: {code, name, credits, ciclo}} de la carrera.
        progreso: {curso_id: {status, nota}} del estudiante.
        prereq_map: {curso_id: [prereq_ids]} de la carrera.
        disponibles: ids de cursos que ya puede llevar.
        ciclo_actual: ciclo declarado por el estudiante.
        avance: avance ya calculado (RF-07), para no recalcularlo aquí.
        promedio: promedio ponderado ya calculado.
    """

    def describir(curso_id, extra: Optional[dict] = None) -> dict:
        curso = cursos.get(curso_id) or {}
        base = {
            "id": curso_id,
            "code": curso.get("code", ""),
            "name": curso.get("name", ""),
            "credits": curso.get("credits") or 0,
            "ciclo": curso.get("ciclo"),
        }
        if extra:
            base.update(extra)
        return base

    nivel = _clasificar_nivel(avance.porcentaje_avance)

    # Cursos de ciclos ya pasados que el estudiante no aprobó ni está llevando.
    # Es la señal más concreta de atraso y la que ninguna otra pantalla muestra.
    atrasados = []
    for curso_id, curso in cursos.items():
        ciclo = curso.get("ciclo")
        if ciclo is None or ciclo >= ciclo_actual:
            continue
        estado = (progreso.get(curso_id) or {}).get("status")
        if estado in (ESTADO_APROBADO, ESTADO_EN_CURSO):
            continue
        atrasados.append(describir(curso_id))
    atrasados.sort(key=lambda c: (c["ciclo"], c["code"]))

    # Fortalezas y puntos a reforzar salen de las notas ya registradas. Si el
    # estudiante no cargó notas, ambas listas quedan vacías en vez de inventar
    # una clasificación.
    fortalezas: List[dict] = []
    a_reforzar: List[dict] = []
    for curso_id, registro in progreso.items():
        if (registro or {}).get("status") != ESTADO_APROBADO:
            continue
        nota = registro.get("nota")
        if nota is None or curso_id not in cursos:
            continue
        nota = float(nota)
        if nota >= NOTA_DESTACADA:
            fortalezas.append(describir(curso_id, {"nota": nota}))
        elif nota < NOTA_A_REFORZAR:
            a_reforzar.append(describir(curso_id, {"nota": nota}))

    fortalezas.sort(key=lambda c: c["nota"], reverse=True)
    a_reforzar.sort(key=lambda c: c["nota"])

    # Ruta sugerida (RF-20): entre lo que ya puede llevar, primero lo que
    # desbloquea más carrera y lo que es de ciclos más tempranos.
    impacto = contar_desbloqueos(prereq_map)
    sugeridos = [
        describir(cid, {"desbloquea": impacto.get(cid, 0)})
        for cid in disponibles
        if cid in cursos
    ]
    sugeridos.sort(
        key=lambda c: (-c["desbloquea"], c["ciclo"] if c["ciclo"] is not None else 99, c["code"])
    )
    sugeridos = sugeridos[:MAX_SUGERENCIAS]

    # El curso que nombra el mensaje. Se decide aquí y no en el frontend: si
    # cada consumidor eligiera el suyo, el botón podría llevar a un curso
    # distinto del que el texto le está recomendando.
    destacado = atrasados[0] if atrasados else (sugeridos[0] if sugeridos else None)

    return {
        "nivel": nivel,
        "ciclo_actual": ciclo_actual,
        "porcentaje_avance": avance.porcentaje_avance,
        "creditos_aprobados": avance.creditos_aprobados,
        "creditos_totales": avance.creditos_totales,
        "promedio_ponderado": promedio,
        "cursos_atrasados": atrasados,
        "fortalezas": fortalezas,
        "a_reforzar": a_reforzar,
        "recomendacion": {
            "mensaje": _mensaje_recomendacion(atrasados, sugeridos, a_reforzar),
            "curso_destacado": destacado,
            "cursos_sugeridos": sugeridos,
        },
    }


def _mensaje_recomendacion(
    atrasados: Sequence, sugeridos: Sequence, a_reforzar: Sequence
) -> str:
    """Una sola frase con lo más accionable, en el orden en que importa."""
    if atrasados:
        pendiente = atrasados[0]
        return (
            f"Tienes {len(atrasados)} curso(s) pendientes de ciclos anteriores. "
            f"Prioriza {pendiente['code']} — {pendiente['name']} para no seguir arrastrando el atraso."
        )

    if sugeridos and sugeridos[0]["desbloquea"] > 0:
        siguiente = sugeridos[0]
        return (
            f"Vas al día. {siguiente['code']} — {siguiente['name']} es tu mejor siguiente paso: "
            f"habilita {siguiente['desbloquea']} curso(s) más adelante."
        )

    if a_reforzar:
        debil = a_reforzar[0]
        return (
            f"Tu avance está en orden. Te conviene repasar {debil['code']} — {debil['name']}, "
            "donde tu nota quedó baja y es base para lo que viene."
        )

    if sugeridos:
        return f"Vas al día. Puedes continuar con {sugeridos[0]['code']} — {sugeridos[0]['name']}."

    return "No hay cursos disponibles por ahora. Revisa tu malla para ver qué te falta aprobar."
