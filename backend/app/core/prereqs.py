from typing import Container, List, Mapping, Optional, Sequence, Tuple, TypeVar


# Los IDs de curso llegan como int (onboarding) o como str (malla), pero cada
# llamada usa un solo tipo de forma consistente. Un TypeVar acotado modela eso;
# un Union no, porque Dict y Set son invariantes y rechazarían ambos usos.
ID = TypeVar("ID", int, str)


def resolve_prereq_chain(curso_id: ID, prereq_map: Mapping[ID, Sequence[ID]]) -> List[ID]:
    """
    Obtiene la lista COMPLETA de todos los prerrequisitos transitivos
    (directos e indirectos) para un curso usando BFS.

    Ej: Si A requiere B, y B requiere C, resolve_prereq_chain("A") retorna ["B", "C"].

    Args:
        curso_id: ID del curso a evaluar.
        prereq_map: Dict donde key=curso_id, value=list de prereq_ids.

    Returns:
        Lista plana con todos los IDs de prerrequisitos en orden BFS.
    """
    visited: set[ID] = set()
    queue: List[ID] = [curso_id]
    all_prereqs: List[ID] = []

    while queue:
        curr_id = queue.pop(0)
        for prereq_id in prereq_map.get(curr_id, []):
            if prereq_id not in visited:
                visited.add(prereq_id)
                all_prereqs.append(prereq_id)
                queue.append(prereq_id)

    return all_prereqs


def check_course_status(
    curso_id: ID,
    db_status: Optional[str],
    completed_courses: Container[ID],
    prereq_map: Mapping[ID, Sequence[ID]],
    cursos_dict: Mapping[ID, dict],
) -> Tuple[str, List[dict], bool]:
    """
    Determina el estado final de un curso evaluando la cadena transitiva
    completa de prerrequisitos.

    Args:
        curso_id: ID del curso a evaluar.
        db_status: Estado actual en progreso_cursos (None, "completed", "in_progress").
        completed_courses: Set de IDs de cursos completados por el usuario.
        prereq_map: Mapa de prerrequisitos (curso_id -> [prereq_ids]).
        cursos_dict: Dict con info de cursos (id -> {code, name, ...}).

    Returns:
        Tupla (status_final, prereq_info_list, prerequisitos_cumplidos):
            - status_final: "completed" | "in_progress" | "available" | "locked"
            - prereq_info_list: [{id, code, name, completado}, ...]
            - prerequisitos_cumplidos: True si toda la cadena está completa
    """
    # 1. Resolver cadena transitiva completa
    all_prereqs = resolve_prereq_chain(curso_id, prereq_map)

    # 2. Construir info de prerrequisitos
    prereq_info = []
    prereqs_failed: List[ID] = []

    for pid in all_prereqs:
        is_done = pid in completed_courses
        if not is_done:
            prereqs_failed.append(pid)
        prereq_info.append({
            "id": pid,
            "code": cursos_dict.get(pid, {}).get("code", ""),
            "name": cursos_dict.get(pid, {}).get("name", ""),
            "completado": is_done,
        })

    all_completed = len(prereqs_failed) == 0

    # 3. Determinar estado final
    if db_status == "completed":
        # Completado se respeta siempre
        return "completed", prereq_info, True

    if db_status == "in_progress":
        # El estado en BD tiene prioridad absoluta (dashboard, onboarding)
        return "in_progress", prereq_info, all_completed

    # 4. Sin estado previo → calcular desde cero
    if all_completed:
        return "available", prereq_info, True
    return "locked", prereq_info, False
