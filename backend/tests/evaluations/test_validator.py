import json

import pytest

from app.evaluations.validator import (
    question_key,
    validate_evaluation_questions,
    validate_generated_question,
)


def _question(**overrides):
    row = {
        "pregunta": "Calcule $2+2$.",
        "tipo": "unica",
        "opciones": ["$3$", "$4$", "$5$", "$6$"],
        "respuesta_correcta": 1,
        "explicacion": "Sumamos $2+2=4$.",
    }
    row.update(overrides)
    return row


def test_validator_accepts_complete_single_choice() -> None:
    validate_generated_question(_question())


def test_validator_rejects_invalid_answer_index() -> None:
    with pytest.raises(ValueError, match="respuesta_correcta"):
        validate_generated_question(_question(respuesta_correcta=4))


def test_validator_rejects_repeated_options() -> None:
    with pytest.raises(ValueError, match="opciones duplicadas"):
        validate_generated_question(_question(opciones=["A", "B", "a", "D"]))


def test_validator_requires_exact_true_false_options() -> None:
    with pytest.raises(ValueError, match="Verdadero.*Falso"):
        validate_generated_question(_question(
            tipo="verdadero_falso", opciones=["Sí", "No"]
        ))


def test_validator_rejects_unbalanced_math_delimiters() -> None:
    with pytest.raises(ValueError, match="LaTeX"):
        validate_generated_question(_question(pregunta="Calcule $2+2."))


def test_question_key_detects_trivial_numeric_variant() -> None:
    assert question_key("Calcule 2 + 2") == question_key("Calcule 3 + 3")


@pytest.mark.asyncio
async def test_structured_generation_defers_invalid_slot_without_retrying_valid_batch(monkeypatch) -> None:
    from app.routers import evaluaciones as ev

    calls = []
    invalid = _question(opciones=["$4$", "$4$", "$5$", "$6$"])

    def fake_provider(**kwargs):
        calls.append(1)
        return {"text": json.dumps({"preguntas": [invalid]}), "finish_reason": "STOP"}

    monkeypatch.setattr(ev, "generar_gemini_con_schema", fake_provider)

    generated = await ev._generar_lote_estructurado([0], "prompt")
    accepted, failed = ev._clasificar_lote([0], generated, set())

    assert accepted == []
    assert failed == [0]
    assert len(calls) == 1


def test_slot_classification_keeps_valid_question_when_neighbor_is_invalid() -> None:
    from app.routers import evaluaciones as ev

    questions = [
        ev.Pregunta(id=1, **_question()),
        ev.Pregunta(id=2, **_question(opciones=["A", "A", "C", "D"])),
    ]
    accepted, failed = ev._clasificar_lote([0, 1], questions, set())

    assert [slot for slot, _ in accepted] == [0]
    assert failed == [1]


def test_slot_classification_rejects_options_that_duplicate_after_cleanup() -> None:
    from app.routers import evaluaciones as ev

    question = ev.Pregunta(id=1, **_question(
        opciones=["A) $3$", "B) $4$", "C) $4$", "D) $6$"],
    ))

    accepted, failed = ev._clasificar_lote([0], [question], set())

    assert accepted == []
    assert failed == [0]


@pytest.mark.parametrize("kind, options, answer", [
    ("unica", ["A", "", "B", "C", "D"], 2),
    ("multiple", ["A", "B", "C", "D", "E"], [1, 4]),
    ("verdadero_falso", ["Verdadero", "Falso", "Otra"], 1),
])
def test_option_cleanup_rejects_malformed_options_without_changing_answer(
    kind, options, answer,
) -> None:
    from app.routers import evaluaciones as ev

    question = ev.Pregunta(id=1, **_question(
        tipo=kind, opciones=options, respuesta_correcta=answer,
    ))

    accepted, failed = ev._clasificar_lote([0], [question], set())

    assert accepted == []
    assert failed == [0]
    assert question.respuesta_correcta == answer


def test_option_cleanup_preserves_valid_multiple_answer_indices() -> None:
    from app.routers import evaluaciones as ev

    question = ev.Pregunta(id=1, **_question(
        tipo="multiple", opciones=["A) A", "B) B", "C) C", "D) D"],
        respuesta_correcta=[0, 3],
    ))

    accepted, failed = ev._clasificar_lote([0], [question], set())

    assert failed == []
    assert accepted[0][1].opciones == ["A", "B", "C", "D"]
    assert accepted[0][1].respuesta_correcta == [0, 3]


def test_final_batch_rejects_missing_question() -> None:
    with pytest.raises(ValueError, match="cantidad"):
        validate_evaluation_questions([_question()], expected_count=2)


def test_final_batch_rejects_trivial_numeric_variants() -> None:
    with pytest.raises(ValueError, match="duplicad"):
        validate_evaluation_questions([
            _question(pregunta="Calcule $2+2$."),
            _question(pregunta="Calcule $3+3$."),
        ], expected_count=2)


def test_final_batch_rejects_programming_example_mismatch() -> None:
    code_question = {
        "tipo": "codigo", "contexto_markdown": "Implementa una función.",
        "input_markdown": "Recibe un entero.", "output_markdown": "Devuelve el doble.",
        "codigo_base": "def doble(x):\n    # Tu código aquí",
        "caso_de_ejemplo": {"input": "print(doble(2))", "output": "4"},
        "respuesta_correcta": "5", "explicacion": "Multiplica por dos.",
    }
    with pytest.raises(ValueError, match="respuesta_correcta"):
        validate_evaluation_questions([code_question], expected_count=1)


def test_final_batch_accepts_valid_programming_question() -> None:
    code_question = {
        "tipo": "codigo", "contexto_markdown": "Implementa una función.",
        "input_markdown": "Recibe un entero.", "output_markdown": "Devuelve el doble.",
        "codigo_base": "def doble(x):\n    # Tu código aquí",
        "caso_de_ejemplo": {"input": "print(doble(2))", "output": "4"},
        "respuesta_correcta": "4", "explicacion": "Multiplica por dos.",
    }
    validate_evaluation_questions([code_question], expected_count=1)


@pytest.mark.parametrize("count", [1, 3, 6])
@pytest.mark.parametrize("reverse", [False, True])
def test_generated_question_origin_does_not_claim_compendium_by_position(count, reverse) -> None:
    from app.routers import evaluaciones as ev

    questions = [
        ev.Pregunta(id=index + 1, **_question(), origen="compendio")
        for index in range(count)
    ]
    if reverse:
        questions.reverse()
    context = [{"curso_nombre": "Curso sintético", "contenido": "Material de referencia"}]

    assigned = ev._asignar_origen(questions, context)

    assert all(question.origen == "ia" for question in assigned)
    assert all(
        question.fuente_detalle == "Generada con material de referencia del curso"
        for question in assigned
    )


def test_generated_question_origin_discloses_missing_retrieved_material() -> None:
    from app.routers import evaluaciones as ev

    question = ev.Pregunta(id=1, **_question(), origen="compendio")

    assigned = ev._asignar_origen([question], [])

    assert assigned[0].origen == "ia"
    assert assigned[0].fuente_detalle == "Generada sin material recuperado"
