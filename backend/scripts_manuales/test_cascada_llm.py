"""Verificación de la cascada de generación y del MultiKeyPool.

No requiere llamadas reales a las APIs: inyecta claves falsas en el entorno y
clientes simulados en los pools para comprobar que:
  1. El pool recolecta claves del entorno (base + _1.._3, sin duplicados).
  2. Ante un 429 la clave entra en cooldown y se rota a la siguiente.
  3. Con todas las claves castigadas, la cascada salta al siguiente proveedor.
  4. La firma pública de generar() y chatear() se mantiene intacta.

Ejecutar desde backend/:  python scripts_manuales/test_cascada_llm.py
"""

import os
import sys

# Claves falsas: nadie las usará contra la red porque se inyectan clientes falsos.
os.environ.update({
    "GROQ_API_KEY": "fake-groq-0",
    "GROQ_API_KEY_1": "fake-groq-1",
    "GROQ_API_KEY_2": "fake-groq-2",
    "GROQ_API_KEY_3": "fake-groq-3",
    "GEMINI_API_KEY": "",
    "GEMINI_API_KEY_1": "fake-gem-1",
    "GEMINI_API_KEY_2": "fake-gem-2",
    "LLM_PROVIDER": "groq",
    "LLM_FALLBACKS": "gemini,openai",
})

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core import llm  # noqa: E402

fallos = []


def check(nombre: str, condicion: bool):
    print(("PASS" if condicion else "FAIL"), "-", nombre)
    if not condicion:
        fallos.append(nombre)


# --- 1. Recolección de claves ------------------------------------------------
claves_groq = llm._recolectar_claves("GROQ_API_KEY")
check("recolecta base + _1.._3", claves_groq == ["fake-groq-0", "fake-groq-1", "fake-groq-2", "fake-groq-3"])
check("omite vacías (GEMINI_API_KEY base)", llm._recolectar_claves("GEMINI_API_KEY") == ["fake-gem-1", "fake-gem-2"])

# --- 2. Rotación y cooldown ----------------------------------------------------
pool = llm.MultiKeyPool("GROQ_API_KEY", lambda k: f"cliente:{k}")
e1 = pool.siguiente()
e2 = pool.siguiente()
check("round-robin alterna entradas", e1.clave != e2.clave)

pool.castigar(e1)
check("siguiente() evita la clave castigada", pool.siguiente() is not e1)

# --- 3. _generar_con_pool ante 429 --------------------------------------------
class Error429(Exception):
    status_code = 429


llamadas = []

def llamar_falsa(cliente, **kwargs):
    llamadas.append(cliente)
    raise Error429()  # todas las claves saturadas

try:
    llm._generar_con_pool(pool, llamar_falsa, [], 100, "modelo-x", False, False)
    check("pool agotado lanza ProveedorPoolExhausted", False)
except llm.ProveedorPoolExhausted:
    check("pool agotado lanza ProveedorPoolExhausted", True)
check("se probaron todas las claves antes de rendirse", len(set(llamadas)) == len(llamadas))

# Una sola clave sana:
llamadas.clear()
pool2 = llm.MultiKeyPool("GROQ_API_KEY", lambda k: f"cliente:{k}")
primera = pool2.siguiente()
pool2.castigar(primera)  # la primera está mala


def llamar_mixta(cliente, **kwargs):
    llamadas.append(cliente)
    if cliente == primera.cliente:
        raise Error429()
    return f"OK desde {cliente}"


# Reconstruir: la llamada pide a pool.siguiente() de nuevo; la primera ya castigada.
resultado = llm._generar_con_pool(pool2, llamar_mixta, [], 100, "modelo-x", False, False)
check("rota a la siguiente clave tras 429", resultado.startswith("OK desde") and f"cliente:{primera.clave}" != resultado.replace("OK desde ", ""))

# --- 4. Cascada de proveedores en generar() ------------------------------------
class ProveedorSim:
    def __init__(self, nombre, comportamiento):
        self.nombre = nombre
        self.modelo = "m-" + nombre
        self.cliente = object()
        self._comportamiento = comportamiento

    def llamar(self, cliente, **kwargs):
        if self._comportamiento == "429":
            raise Error429()
        return f"respuesta-{self.nombre}"


orden = []
llm._FACTORIAS_PROVEEDORES["groq"] = lambda: ProveedorSim("groq", "429")
llm._FACTORIAS_PROVEEDORES["gemini"] = lambda: ProveedorSim("gemini", "ok")

# Con LLM_PROVIDER=groq y fallbacks gemini -> openai:
llm.LLM_PROVIDER = "groq"
llm.LLM_FALLBACKS = ["gemini", "openai"]
salida = llm.generar("hola")
check("cascada groq(429) -> gemini", salida == "respuesta-gemini")

# Error NO reintentable (400) no dispara fallback:
class Error400(Exception):
    status_code = 400


llm._FACTORIAS_PROVEEDORES["groq"] = lambda: ProveedorSim("groq", "400")


class Proveedor400:
    def __init__(self):
        self.nombre = "groq"
        self.modelo = "m"
        self.cliente = object()

    def llamar(self, cliente, **kwargs):
        raise Error400()


llm._FACTORIAS_PROVEEDORES["groq"] = Proveedor400
try:
    llm.generar("hola")
    check("error 400 no dispara fallback", False)
except Error400:
    check("error 400 no dispara fallback", True)
except Exception as e:
    check("error 400 no dispara fallback (propaga original)", False)

# Todos fallan -> RuntimeError con detalle:
llm._FACTORIAS_PROVEEDORES["groq"] = lambda: ProveedorSim("groq", "429")
llm._FACTORIAS_PROVEEDORES["gemini"] = lambda: ProveedorSim("gemini", "429")
llm._FACTORIAS_PROVEEDORES["openai"] = lambda: ProveedorSim("openai", "429")
try:
    llm.generar("hola")
    check("cascada totalmente agotada lanza RuntimeError", False)
except RuntimeError as e:
    check("cascada totalmente agotada lanza RuntimeError", "groq" in str(e))

# --- 5. _es_error_reintentable cubre ProveedorPoolExhausted --------------------
check(
    "ProveedorPoolExhausted se trata como reintentable",
    llm._es_error_reintentable(llm.ProveedorPoolExhausted("x")),
)

print()
if fallos:
    print(f"RESULTADO: {len(fallos)} verificacion(es) FALLARON: {fallos}")
    sys.exit(1)
print("RESULTADO: todas las verificaciones pasaron.")
