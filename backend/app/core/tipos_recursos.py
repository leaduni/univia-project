"""Normalización canónica del campo `tipo` en la tabla `recursos`.

Compartido entre el endpoint de recursos y los scripts de ingesta/normalización
para que ambos apliquen exactamente la misma convención de casing.
"""

TIPOS_VALIDOS = ["Examen", "Practica", "Silabo", "PDF", "Compendio", "Libro", "Apunte", "Video"]

_ALIAS_A_CANONICO = {
    "examen": "Examen",
    "parcial": "Examen",
    "final": "Examen",
    # Como se le dice coloquialmente en Perú a un examen pasado.
    "plancha": "Examen",
    "planchas": "Examen",
    "practica": "Practica",
    "práctica": "Practica",
    "silabo": "Silabo",
    "sílabo": "Silabo",
    "silabos": "Silabo",
    "pdf": "PDF",
    "compendio": "Compendio",
    "libro": "Libro",
    "apunte": "Apunte",
    "apuntes": "Apunte",
    "video": "Video",
}


def normalizar_tipo(valor: str) -> str:
    """Devuelve la forma canónica de `tipo`, o el valor original si no hay alias."""
    if not valor:
        return valor
    return _ALIAS_A_CANONICO.get(valor.strip().lower(), valor)
