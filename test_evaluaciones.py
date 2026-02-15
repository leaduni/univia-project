"""
Script de prueba para verificar que el sistema de evaluaciones con IA funciona
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_gemini_connection():
    """Probar conexión con Gemini API"""
    print("🧪 Probando conexión con Gemini API...")
    try:
        response = requests.get(f"{BASE_URL}/evaluaciones/test")
        result = response.json()
        print(f"✅ Respuesta: {json.dumps(result, indent=2, ensure_ascii=False)}")
        return result.get("status") == "success"
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_generar_evaluacion():
    """Probar generación de evaluación"""
    print("\n🧪 Probando generación de evaluación...")
    
    config = {
        "curso_id": 102,
        "modulo": "Semana 7: Límites",
        "temas": [
            "Límites algebraicos",
            "Límites Trigonométricos",
            "Límites infinitos"
        ],
        "num_preguntas": 5,
        "observaciones": "Curso de Cálculo Diferencial de FIIS-UNI",
        "tipo_evaluacion": "mixta"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/evaluaciones/generar",
            json=config,
            timeout=30
        )
        
        if response.status_code == 200:
            evaluacion = response.json()
            print(f"✅ Evaluación generada con {len(evaluacion['preguntas'])} preguntas")
            print(f"⏱️ Tiempo estimado: {evaluacion['tiempo_estimado']} minutos")
            
            # Mostrar primera pregunta como ejemplo
            if evaluacion['preguntas']:
                p1 = evaluacion['preguntas'][0]
                print(f"\n📝 Ejemplo de pregunta:")
                print(f"   Pregunta: {p1['pregunta']}")
                print(f"   Tipo: {p1['tipo']}")
                print(f"   Opciones: {p1['opciones']}")
            
            return True
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  PRUEBA DEL SISTEMA DE EVALUACIONES UNIVIA")
    print("=" * 60)
    
    # Test 1: Conexión con Gemini
    test1 = test_gemini_connection()
    
    # Test 2: Generación de evaluación (solo si test1 pasó)
    test2 = False
    if test1:
        test2 = test_generar_evaluacion()
    
    print("\n" + "=" * 60)
    print("  RESULTADOS")
    print("=" * 60)
    print(f"✅ Gemini API: {'OK' if test1 else 'FALLO'}")
    print(f"✅ Generación de evaluaciones: {'OK' if test2 else 'FALLO'}")
    print("=" * 60)
