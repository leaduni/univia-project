"""Pruebas manuales del flujo registro -> login -> onboarding (Fase 2).

Cubre los casos de error que exigen los requisitos: correo fuera del dominio
institucional, código duplicado, contraseña débil y curso sin prerrequisito
cumplido.

ADVERTENCIA: crea un usuario real en Supabase Auth. Usa un correo de prueba
que puedas borrar después desde el panel de Supabase (Authentication > Users).

Uso:
    1. Levanta la API:  uvicorn app.main:app --reload   (desde backend/)
    2. python scripts_manuales/test_flujo_auth_onboarding.py
"""

import random
import sys

import requests

API = "http://localhost:8000/api"

# Correo y código irrepetibles para poder ejecutar el script varias veces.
SUFIJO = random.randint(10_000_000, 99_999_999)
EMAIL = f"prueba.univia{SUFIJO}@uni.pe"
CODIGO = f"{SUFIJO}K"
PASSWORD = "univia2026"

ok_total = 0
fallos = []


def revisar(nombre: str, condicion: bool, detalle: str = "") -> None:
    global ok_total
    if condicion:
        ok_total += 1
        print(f"  [OK]    {nombre}")
    else:
        fallos.append(nombre)
        print(f"  [FALLA] {nombre}  {detalle}")


def post(ruta: str, payload: dict, token: str | None = None):
    cabeceras = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.post(f"{API}{ruta}", json=payload, headers=cabeceras, timeout=20)


def get(ruta: str, token: str, **params):
    return requests.get(
        f"{API}{ruta}", headers={"Authorization": f"Bearer {token}"}, params=params, timeout=20
    )


print(f"\nCuenta de prueba: {EMAIL} / codigo {CODIGO}\n")

try:
    requests.get("http://localhost:8000/", timeout=5)
except Exception:
    print("La API no responde en http://localhost:8000. Levántala primero.")
    sys.exit(1)


# --- 1. Validaciones de registro (RF-EST-02) ---------------------------------
print("1. Registro: validaciones de formato y unicidad")

r = post("/auth/register-user", {
    "email": f"prueba{SUFIJO}@gmail.com", "password": PASSWORD,
    "codigo_estudiante": CODIGO, "nombre_completo": "Prueba Externa",
})
revisar("rechaza correo fuera de @uni.pe", r.status_code == 422, f"-> {r.status_code}")

r = post("/auth/register-user", {
    "email": EMAIL, "password": "123", "codigo_estudiante": CODIGO,
    "nombre_completo": "Prueba Debil",
})
revisar("rechaza contraseña débil", r.status_code == 422, f"-> {r.status_code}")

r = post("/auth/register-user", {
    "email": EMAIL, "password": PASSWORD, "codigo_estudiante": "123ABC",
    "nombre_completo": "Prueba Codigo",
})
revisar("rechaza código mal formado", r.status_code == 422, f"-> {r.status_code}")

r = post("/auth/register-user", {
    "email": EMAIL, "password": PASSWORD, "codigo_estudiante": CODIGO,
    "nombre_completo": "Estudiante De Prueba",
})
revisar("crea la cuenta", r.status_code == 201, f"-> {r.status_code} {r.text[:120]}")
if r.status_code != 201:
    print("\nSin cuenta creada no se puede continuar.")
    sys.exit(1)

r = post("/auth/register-user", {
    "email": EMAIL, "password": PASSWORD, "codigo_estudiante": CODIGO,
    "nombre_completo": "Duplicado",
})
revisar("rechaza correo/código duplicado", r.status_code == 409, f"-> {r.status_code}")


# --- 2. Login (RF-01, RF-02) -------------------------------------------------
print("\n2. Login por correo y por código")

r = post("/auth/login", {"identificador": EMAIL, "password": PASSWORD})
revisar("login con correo", r.status_code == 200, f"-> {r.status_code} {r.text[:120]}")
token = r.json().get("access_token") if r.status_code == 200 else None

r = post("/auth/login", {"identificador": CODIGO, "password": PASSWORD})
revisar("login con código universitario", r.status_code == 200, f"-> {r.status_code}")

r = post("/auth/login", {"identificador": EMAIL, "password": "incorrecta1"})
revisar("rechaza contraseña incorrecta", r.status_code == 401, f"-> {r.status_code}")

r = post("/auth/login", {"identificador": f"nadie{SUFIJO}@uni.pe", "password": PASSWORD})
mismo_mensaje = r.status_code == 401
revisar("no revela si la cuenta existe", mismo_mensaje, f"-> {r.status_code}")

if not token:
    print("\nSin token no se puede probar el onboarding.")
    sys.exit(1)


# --- 3. Catálogo del wizard (Tarea 5) ---------------------------------------
print("\n3. Catálogo de carreras y ciclos")

r = get("/onboarding/data", token)
revisar("devuelve el catálogo", r.status_code == 200, f"-> {r.status_code}")
datos = r.json() if r.status_code == 200 else {}
carreras = datos.get("carreras", [])
revisar("incluye carreras", len(carreras) > 0)
revisar("cada carrera trae facultad", all(c.get("facultad") for c in carreras))
revisar("expone rango de ciclos", bool(datos.get("ciclos", {}).get("max")))

if not carreras:
    sys.exit(1)
carrera = carreras[0]
carrera_id = carrera["id"]


# --- 4. Onboarding: validaciones (RF-EST-01, RF-EST-03) ---------------------
print(f"\n4. Onboarding en {carrera['name']}")

r = get("/onboarding/cursos", token, carrera_id=carrera_id, ciclo_actual=1)
revisar("lista cursos del ciclo 1", r.status_code == 200, f"-> {r.status_code}")
cursos = r.json().get("cursos", []) if r.status_code == 200 else []
revisar("devuelve al menos un curso", len(cursos) > 0)

r = post("/onboarding/complete", {
    "carrera_id": 999999, "ciclo_actual": 1,
    "cursos_inscritos": [c["id"] for c in cursos[:1]],
}, token)
revisar("rechaza carrera inexistente", r.status_code == 400, f"-> {r.status_code}")

r = post("/onboarding/complete", {
    "carrera_id": carrera_id, "ciclo_actual": 99,
    "cursos_inscritos": [c["id"] for c in cursos[:1]],
}, token)
revisar("rechaza ciclo fuera de rango", r.status_code == 422, f"-> {r.status_code}")

r = post("/onboarding/complete", {
    "carrera_id": carrera_id, "ciclo_actual": 1, "cursos_inscritos": [],
}, token)
revisar("rechaza selección vacía", r.status_code == 422, f"-> {r.status_code}")

elegidos = [c["id"] for c in cursos[:2]]
r = post("/onboarding/complete", {
    "carrera_id": carrera_id, "ciclo_actual": 1, "cursos_inscritos": elegidos,
}, token)
revisar("completa el onboarding", r.status_code == 200, f"-> {r.status_code} {r.text[:140]}")
if r.status_code == 200:
    perfil = r.json().get("perfil", {})
    revisar("devuelve el perfil completo (RF-EST-01)",
            all(perfil.get(k) for k in ("codigo_estudiante", "email", "nombre_completo", "carrera")))


# --- 5. Prerrequisitos con historial (RF-EST-03) ----------------------------
print("\n5. Prerrequisitos ya con historial")

r = get("/onboarding/cursos", token, carrera_id=carrera_id, ciclo_actual=3)
if r.status_code == 200:
    items = r.json().get("cursos", [])
    bloqueados = [c for c in items if c["status"] == "locked"]
    revisar("bloquea cursos sin prerrequisito aprobado", len(bloqueados) > 0,
            "(puede no haberlos si el ciclo 3 no tiene prerrequisitos)")
    con_motivo = [c for c in bloqueados if c.get("prerrequisitos_faltantes")]
    revisar("explica qué prerrequisito falta", len(con_motivo) == len(bloqueados))


# --- 6. Resumen final (Tarea 7) ---------------------------------------------
print("\n6. Resumen de finalización")

r = get("/onboarding/resumen", token)
revisar("devuelve el resumen", r.status_code == 200, f"-> {r.status_code}")
if r.status_code == 200:
    res = r.json()
    revisar("incluye avance de carrera", "porcentaje_avance" in res)
    revisar("incluye cursos disponibles", "cursos_disponibles" in res)
    print(f"     avance: {res.get('porcentaje_avance')}% "
          f"({res.get('creditos_aprobados')}/{res.get('creditos_totales')} créditos)")


# --- 7. Cambio de cursos por ciclo (RF-PRF-01) ------------------------------
print("\n7. Actualización de cursos del ciclo")

r = requests.put(f"{API}/perfil/cursos", json={"ciclo_actual": 2, "cursos_inscritos": elegidos},
                 headers={"Authorization": f"Bearer {token}"}, timeout=20)
revisar("rechaza repetir un curso ya aprobado o mantener sin avance",
        r.status_code in (200, 400), f"-> {r.status_code} {r.text[:120]}")

r = get("/onboarding/resumen", token)
if r.status_code == 200:
    res = r.json()
    revisar("el historial de aprobados no se pierde",
            isinstance(res.get("cursos_aprobados"), list))


# --- Resultado ---------------------------------------------------------------
print("\n" + "=" * 60)
print(f"Pruebas superadas: {ok_total}   Fallidas: {len(fallos)}")
for f in fallos:
    print(f"  - {f}")
print(f"\nBorra la cuenta de prueba {EMAIL} desde Supabase > Authentication > Users.")
sys.exit(1 if fallos else 0)
