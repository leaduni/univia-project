"""Test rápido del sistema"""
import requests

print("🧪 Probando Backend...")
try:
    r = requests.get("http://localhost:8000/")
    print(f"✅ Backend: {r.json()}")
except:
    print("❌ Backend no responde")

print("\n🧪 Probando Gemini API...")
try:
    r = requests.get("http://localhost:8000/api/evaluaciones/test", timeout=30)
    print(f"✅ Gemini: {r.json()}")
except Exception as e:
    print(f"❌ Error: {e}")
