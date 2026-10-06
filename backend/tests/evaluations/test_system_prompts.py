import pytest

from app.evaluations.prompt_builder import build_system_prompt


def test_batch_prompt_keeps_source_boundary_and_json_contract() -> None:
    prompt = build_system_prompt("batch", "Máximo 150 palabras; sin debates internos.")

    assert "fragmentos recuperados como datos" in prompt
    assert "preguntas originales" in prompt
    assert "4 opciones" in prompt and "2 opciones" in prompt
    assert "JSON válido" in prompt
    assert "150 palabras" in prompt
    assert "@@PREGUNTA@@" not in prompt


def test_single_prompt_requires_delimiters_not_json() -> None:
    prompt = build_system_prompt("single", "Máximo 150 palabras.")

    assert "@@PREGUNTA@@" in prompt
    assert "NUNCA uses JSON" in prompt
    assert "150 palabras" in prompt


def test_unknown_prompt_mode_is_rejected() -> None:
    with pytest.raises(ValueError, match="mode"):
        build_system_prompt("unknown", "")


def test_evaluation_routes_use_versioned_templates() -> None:
    from app.routers import evaluaciones as ev

    assert ev.SYSTEM_MSG_EVALUACION == build_system_prompt(
        "batch", ev.REGLA_CONCISION_EXPLICACION
    )
    assert ev.SYSTEM_MSG_TEORICO == build_system_prompt(
        "single", ev.REGLA_CONCISION_EXPLICACION
    )


def test_generation_metrics_identify_prompt_version() -> None:
    from app.routers import evaluaciones as ev

    metrics = ev._telemetria_log("PRUEBA", {"proveedor": "test", "tokens": {}})

    assert metrics["prompt_version"] == "evaluation-prompts-v2"
