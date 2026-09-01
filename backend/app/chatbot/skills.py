"""Skills académicas que instruyen al modelo sin acceder a datos del estudiante."""

from app.chatbot.handlers import Contexto


def _handler_quiz(mensaje: str, supabase, user, token: str) -> Contexto:
    return Contexto(
        system_extra=(
            "Genera un quiz de práctica a partir de la consulta del estudiante. Usa Markdown "
            "puro: un título breve, entre 3 y 5 preguntas numeradas y, después de cada una, "
            "la solución dentro de `<details><summary>Ver respuesta</summary>...</details>`. "
            "Si falta curso o tema, pide esa precisión y ofrece mientras tanto un quiz breve "
            "sobre el concepto que sí se identifique. No inventes que el quiz proviene de un "
            "examen real si no hay material recuperado."
        )
    )


def _handler_cronograma(mensaje: str, supabase, user, token: str) -> Contexto:
    return Contexto(
        system_extra=(
            "Crea un cronograma de estudio accionable basado en la consulta. Usa Markdown puro "
            "con un título, objetivos concretos y una lista por días o semanas. Si faltan curso, "
            "fecha de evaluación, tiempo disponible o temas, pide solo los datos necesarios y "
            "ofrece un plan inicial adaptable. No inventes fechas, evaluaciones ni carga académica."
        )
    )


def _handler_flashcards(mensaje: str, supabase, user, token: str) -> Contexto:
    return Contexto(
        system_extra=(
            "Crea tarjetas de estudio a partir de la consulta. Usa Markdown puro, con el formato "
            "`### Tarjeta N`, seguido de `**Frente:**` y `**Reverso:**` para cada tarjeta. Genera "
            "entre 5 y 10 tarjetas breves, enfocadas en conceptos, procedimientos o fórmulas. Si "
            "falta curso o tema, pide precisarlo y ofrece tarjetas generales del concepto "
            "identificable. No atribuyas contenido a un examen real sin material recuperado."
        )
    )
