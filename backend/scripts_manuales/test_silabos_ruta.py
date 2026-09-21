"""Pruebas del router de sílabos / ruta aprendizaje (fase 11).

Dos modos:

1. MODO OFFLINE (por defecto): no requiere backend en pie ni red.
   - Verifica que los 3 endpoints están registrados en el router.
   - Ejercita los validadores pydantic (UnidadUsuario, CrearUnidadesRequest).
   - Verifica las reglas MIME/tamaño leyendo las constantes del módulo.

       python scripts_manuales/test_silabos_ruta.py

2. MODO HTTP (con backend corriendo y un token de alumno válido):

       UNIVIA_API_URL=http://localhost:8000/api \
       UNIVIA_TOKEN=<jwt-del-alumno> \
       UNIVIA_CURSO_ID_SIN_RUTA=<id de un curso sin sílabo procesado> \
       python scripts_manuales/test_silabos_ruta.py --http

   Cubre: 401 sin token, 400 por MIME inválido y por >10MB, 201 de
   unidades-usuario, 409 al repetir, y generar-ruta-provisional (201/409).
"""

import os
import sys
from pathlib import Path

# Permite importar app.* cuando se ejecuta desde backend/ o desde la raíz.
BASE = Path(__file__).resolve().parent.parent
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))


def pruebas_offline() -> int:
    """Validaciones estáticas y de schemas. Devuelve nº de fallos."""
    fallos = 0

    def ok(cond, mensaje):
        nonlocal fallos
        print(("  OK  " if cond else "FALLO ") + mensaje)
        if not cond:
            fallos += 1

    print("\n== Endpoints registrados en el router ==")
    try:
        from app.routers.silabos_ruta import router
    except Exception as e:
        print(f"FALLO importando el router: {e}")
        return 1

    rutas = [(r.path, tuple(sorted(getattr(r, "methods", set())))) for r in router.routes]
    ok(
        any("/{curso_id}/silabo-upload" in p and "POST" in m for p, m in rutas),
        "POST /{curso_id}/silabo-upload registrado",
    )
    ok(
        any("/{curso_id}/unidades-usuario" in p and "POST" in m for p, m in rutas),
        "POST /{curso_id}/unidades-usuario registrado",
    )
    ok(
        any("/{curso_id}/generar-ruta-provisional" in p and "POST" in m for p, m in rutas),
        "POST /{curso_id}/generar-ruta-provisional registrado",
    )

    print("\n== Esquemas pydantic ==")
    from pydantic import ValidationError
    from app.routers.silabos_ruta import (
        CrearUnidadesRequest,
        MIMES_ADMITIDOS,
        MAX_SILABO_BYTES,
        UnidadUsuario,
    )

    u = UnidadUsuario(titulo="  Límites y continuidad  ", topics=[" límite ", "", "  "])
    ok(u.titulo == "Límites y continuidad", "titulo se normaliza (espacios)")
    ok(u.topics == ["límite"], "topics se limpian (vacíos fuera)")

    try:
        UnidadUsuario(titulo="   ")
        ok(False, "titulo vacío debe rechazarse")
    except ValidationError:
        ok(True, "titulo vacío -> ValidationError")

    try:
        UnidadUsuario(titulo="x" * 121)
        ok(False, "titulo >120 debe rechazarse")
    except ValidationError:
        ok(True, "titulo >120 -> ValidationError")

    try:
        UnidadUsuario(titulo="U1", topics=[f"t{i}" for i in range(13)])
        ok(False, ">12 temas debe rechazarse")
    except ValidationError:
        ok(True, ">12 temas -> ValidationError")

    try:
        CrearUnidadesRequest(unidades=[])
        ok(False, "0 unidades debe rechazarse")
    except ValidationError:
        ok(True, "0 unidades -> ValidationError")

    try:
        CrearUnidadesRequest(unidades=[UnidadUsuario(titulo=f"U{i}") for i in range(13)])
        ok(False, ">12 unidades debe rechazarse")
    except ValidationError:
        ok(True, ">12 unidades -> ValidationError")

    print("\n== Reglas MIME/tamaño (espejo del endpoint) ==")
    ok(set(MIMES_ADMITIDOS) == {"application/pdf", "image/jpeg", "image/png", "image/webp"},
       "MIMEs admitidos: pdf, jpg, png, webp")
    ok(MAX_SILABO_BYTES == 10 * 1024 * 1024, "límite de 10 MB")

    return fallos


def pruebas_http() -> int:
    """Pruebas contra un backend en pie. Requiere env vars."""
    import httpx

    base = os.environ["UNIVIA_API_URL"].rstrip("/")
    token = os.environ["UNIVIA_TOKEN"]
    curso = int(os.environ["UNIVIA_CURSO_ID_SIN_RUTA"])
    headers = {"Authorization": f"Bearer {token}"}
    fallos = 0

    def ok(cond, mensaje):
        nonlocal fallos
        print(("  OK  " if cond else "FALLO ") + mensaje)
        if not cond:
            fallos += 1

    print(f"\n== HTTP contra {base}, curso {curso} ==")

    r = httpx.post(f"{base}/cursos/{curso}/unidades-usuario", json={"unidades": []})
    ok(r.status_code in (401, 403), f"sin token -> {r.status_code} (esperado 401/403)")

    # MIME no admitido
    r = httpx.post(
        f"{base}/cursos/{curso}/silabo-upload",
        headers=headers,
        files={"archivo": ("notas.txt", b"hola", "text/plain")},
        timeout=30,
    )
    ok(r.status_code == 400, f"MIME text/plain -> {r.status_code} (esperado 400)")

    # >10MB
    r = httpx.post(
        f"{base}/cursos/{curso}/silabo-upload",
        headers=headers,
        files={"archivo": ("silabo.pdf", b"%PDF" + b"0" * (10 * 1024 * 1024 + 1), "application/pdf")},
        timeout=60,
    )
    ok(r.status_code == 400, f"PDF de >10MB -> {r.status_code} (esperado 400)")

    # Subida válida mínima de PDF (cabeza falsa basta para la validación de MIME)
    r = httpx.post(
        f"{base}/cursos/{curso}/silabo-upload",
        headers=headers,
        files={"archivo": ("silabo.pdf", b"%PDF-1.4 prueba", "application/pdf")},
        timeout=60,
    )
    ok(r.status_code == 201, f"PDF válido -> {r.status_code} (esperado 201)")
    if r.status_code == 201:
        ok(r.json().get("estado") == "en_procesamiento", "estado 'en_procesamiento'")

    # Segunda solicitud abierta -> el índice único debe bloquearla
    r2 = httpx.post(
        f"{base}/cursos/{curso}/silabo-upload",
        headers=headers,
        files={"archivo": ("otro.pdf", b"%PDF-1.4 prueba", "application/pdf")},
        timeout=60,
    )
    ok(r2.status_code == 500, f"segunda solicitud abierta -> {r2.status_code} (esperado 500 por índice único)")

    # Unidades manuales válidas
    payload = {"unidades": [
        {"titulo": "Unidad 1: Fundamentos", "duracion": "4h", "topics": ["tema a", "tema b"]},
        {"titulo": "Unidad 2: Aplicaciones", "topics": ["tema c"]},
    ]}
    r = httpx.post(f"{base}/cursos/{curso}/unidades-usuario", headers=headers, json=payload, timeout=30)
    ok(r.status_code == 201, f"unidades-usuario -> {r.status_code} (esperado 201)")
    if r.status_code == 201:
        ok(r.json().get("creadas") == 2, "2 unidades creadas")

    # Repetir debe chocar con el 409
    r = httpx.post(f"{base}/cursos/{curso}/unidades-usuario", headers=headers, json=payload, timeout=30)
    ok(r.status_code == 409, f"unidades repetidas -> {r.status_code} (esperado 409)")

    # La ruta provisional ya no debe generarse encima de las personales
    r = httpx.post(f"{base}/cursos/{curso}/generar-ruta-provisional", headers=headers, timeout=120)
    ok(r.status_code == 409, f"provisional con unidades previas -> {r.status_code} (esperado 409)")

    return fallos


if __name__ == "__main__":
    if "--http" in sys.argv:
        faltan = [v for v in ("UNIVIA_API_URL", "UNIVIA_TOKEN", "UNIVIA_CURSO_ID_SIN_RUTA") if not os.getenv(v)]
        if faltan:
            print("Faltan variables de entorno:", ", ".join(faltan))
            sys.exit(2)
        sys.exit(0 if pruebas_http() == 0 else 1)
    sys.exit(0 if pruebas_offline() == 0 else 1)
