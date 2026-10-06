"""Validación determinista de preguntas antes de entregarlas al estudiante."""

import re
import unicodedata


def question_key(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text).casefold()
    normalized = re.sub(r"\d+(?:[.,]\d+)?", "#", normalized)
    return re.sub(r"\s+", " ", normalized).strip().rstrip(".?!")


def validate_generated_question(question: dict) -> None:
    prompt = question.get("pregunta")
    explanation = question.get("explicacion")
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("pregunta vacía")
    if not isinstance(explanation, str) or not explanation.strip():
        raise ValueError("explicacion vacía")

    kind = question.get("tipo")
    options = question.get("opciones")
    if kind not in {"unica", "multiple", "verdadero_falso"}:
        raise ValueError("tipo de pregunta no soportado")
    expected = 2 if kind == "verdadero_falso" else 4
    if not isinstance(options, list) or len(options) != expected or any(
        not isinstance(option, str) or not option.strip() for option in options
    ):
        raise ValueError(f"opciones: se requieren {expected} textos no vacíos")
    if len({option.strip().casefold() for option in options}) != len(options):
        raise ValueError("opciones duplicadas")
    if kind == "verdadero_falso" and [option.strip() for option in options] != ["Verdadero", "Falso"]:
        raise ValueError("verdadero_falso requiere Verdadero y Falso")

    answer = question.get("respuesta_correcta")
    if kind == "multiple":
        if not isinstance(answer, list) or not answer or any(
            type(index) is not int or index < 0 or index >= expected for index in answer
        ) or len(answer) != len(set(answer)):
            raise ValueError("respuesta_correcta debe ser una lista de índices válidos")
    elif type(answer) is not int or answer < 0 or answer >= expected:
        raise ValueError("respuesta_correcta debe ser un índice válido")

    for value in (prompt, explanation, *options):
        dollars = re.findall(r"(?<!\\)\$", value)
        if len(dollars) % 2 or re.search(r"\\(?:begin|end|matrix|dfrac|textbf)\b", value):
            raise ValueError("LaTeX inválido o delimitadores desbalanceados")


def validate_evaluation_questions(questions: list[dict], *, expected_count: int) -> None:
    """Verifica estructura, cantidad y diversidad antes de devolver un lote."""
    if expected_count < 1 or len(questions) != expected_count:
        raise ValueError("La cantidad de preguntas no coincide con lo solicitado")

    seen: set[str] = set()
    for question in questions:
        if question.get("tipo") == "codigo":
            for field in (
                "contexto_markdown", "input_markdown", "output_markdown",
                "codigo_base", "explicacion",
            ):
                value = question.get(field)
                if not isinstance(value, str) or not value.strip():
                    raise ValueError(f"Pregunta de código sin {field}")
            if question.get("opciones") not in ([], None):
                raise ValueError("La pregunta de código debe tener opciones vacías")
            example = question.get("caso_de_ejemplo")
            if not isinstance(example, dict) or not all(
                isinstance(example.get(field), str) and example[field].strip()
                for field in ("input", "output")
            ):
                raise ValueError("caso_de_ejemplo incompleto")
            answer = question.get("respuesta_correcta")
            if answer is None or str(answer).strip() != example["output"].strip():
                raise ValueError("respuesta_correcta no coincide con el ejemplo")
            source_text = question["contexto_markdown"]
        else:
            validate_generated_question(question)
            source_text = question["pregunta"]

        key = question_key(source_text)
        if key in seen:
            raise ValueError("preguntas duplicadas o variantes numéricas triviales")
        seen.add(key)
