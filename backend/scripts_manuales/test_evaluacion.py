import requests
import json

# Test del endpoint de evaluaciones
url = "http://127.0.0.1:8000/api/evaluaciones/test"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")

# Test de generación de evaluación
url_generar = "http://127.0.0.1:8000/api/evaluaciones/generar"
data = {
    "curso_id": 12,
    "modulo": "Introducción a la Programación",
    "temas": ["Variables", "Tipos de datos"],
    "num_preguntas": 3,
    "tipo_evaluacion": "mixta"
}

try:
    response = requests.post(url_generar, json=data)
    print(f"\nGeneración - Status Code: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")
    else:
        print(f"Error Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
