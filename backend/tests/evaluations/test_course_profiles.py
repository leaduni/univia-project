import pytest

from app.evaluations.course_profiles import classify_course_profile
from app.evaluations.prompt_builder import difficulty_guidance
from app.routers.evaluaciones import ConfiguracionEvaluacion, generar_prompt_teorico


@pytest.mark.parametrize(("module", "topics", "expected"), [
    ("Geometría analítica", ["Rectas"], "geometry"),
    ("Cálculo integral", ["Integrales"], "mathematics"),
    ("Química orgánica", ["Estereoquímica"], "science"),
    ("Programación", ["Algoritmos"], "programming"),
    ("Ética profesional", ["Responsabilidad"], "conceptual"),
])
def test_course_profile_classification(module, topics, expected) -> None:
    assert classify_course_profile(module, topics) == expected


def test_programming_guidance_requires_testable_code_task() -> None:
    guidance = difficulty_guidance("Programación", ["Listas enlazadas"])

    assert "casos de prueba" in guidance


def test_conceptual_guidance_does_not_force_numeric_answer() -> None:
    guidance = difficulty_guidance("Ética profesional", ["Responsabilidad"])

    assert "argumentación" in guidance
    assert "numérico" not in guidance


def test_conceptual_exam_assigns_conceptual_focuses() -> None:
    config = ConfiguracionEvaluacion(
        curso_id=80, modulo="Ética profesional", temas=["Responsabilidad"],
        num_preguntas=3,
    )

    prompt = generar_prompt_teorico(config, [])

    assert "análisis de un caso" in prompt
    assert "aplicación numérica directa" not in prompt
    assert "problema de optimización" not in prompt
    assert "valores numéricos" not in prompt
