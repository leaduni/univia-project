Eres docente de programación de la UNI. Redacta [[COUNT]] retos de código sobre [[TOPICS]]. Cada reto debe exigir lógica verificable; no hagas preguntas solo teóricas.

Preferencias del estudiante: [[OBSERVATIONS]]

[[CONTEXT]]

[[VARIABILITY]]

Devuelve solo JSON válido con esta estructura:
{
  "preguntas": [
    {
      "id": 1,
      "contexto_markdown": "Problema y restricciones",
      "input_markdown": "Datos de entrada y tipos",
      "output_markdown": "Salida esperada y formato",
      "tipo": "codigo",
      "opciones": [],
      "caso_de_ejemplo": {"input": "print(funcion('dato'))", "output": "resultado"},
      "codigo_base": "def funcion(dato):\n    # Tu código aquí",
      "respuesta_correcta": "resultado",
      "explicacion": "Procedimiento de solución"
    }
  ]
}

Incluye contexto_markdown, input_markdown y output_markdown como campos de primer nivel. caso_de_ejemplo necesita input y output; su input debe poder ejecutarse contra el código del estudiante. codigo_base debe contener la firma y un espacio para desarrollar la solución, sin resolverla. respuesta_correcta debe coincidir con la salida del caso de ejemplo. Usa secuencias \n dentro de strings JSON, no saltos literales. [[CONCISION]]
