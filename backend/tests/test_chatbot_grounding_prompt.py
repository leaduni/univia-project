from app.routers.chatbot import SYSTEM_PROMPT


def test_chatbot_does_not_add_unsupported_technical_claims_to_retrieved_answer() -> None:
    assert "responde primero y directamente con lo que dicen esos pasajes" in SYSTEM_PROMPT
    assert "No agregues riesgos, causas o consecuencias relacionadas si las fuentes no las mencionan" in SYSTEM_PROMPT
    assert "Revisa cada afirmación técnica antes de enviarla" in SYSTEM_PROMPT
    assert "En consultas abiertas, usa fragmentos de otras materias solo si aportan directamente a la pregunta" in SYSTEM_PROMPT
    assert "Si la fuente basta para responder, no añadas recomendaciones, riesgos ni consecuencias de conocimiento externo" in SYSTEM_PROMPT
    assert "contesta en una o dos frases, cita el fragmento pertinente y termina ahí" in SYSTEM_PROMPT
    assert "No ofrezcas recomendaciones, remedios, ejemplos ni preguntas de seguimiento salvo que te los pidan" in SYSTEM_PROMPT
