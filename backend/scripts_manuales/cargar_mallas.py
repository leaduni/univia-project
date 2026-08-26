"""Carga en Supabase la facultad, carreras y mallas de un plan de estudios.

No sabe nada de ninguna facultad en concreto: recibe el nombre de un módulo de
`scripts_manuales/mallas/` y proyecta sus datos sobre el modelo relacional:

    facultades -> carreras -> mallas -> malla_cursos -> malla_curso_prerrequisitos

`cursos` es global (code UNIQUE, sin carrera): un curso de estudios generales
ya cargado por otra facultad se reutiliza por código en vez de duplicarse.

Uso:
    python -m scripts_manuales.cargar_mallas fiis              # dry-run, no escribe
    python -m scripts_manuales.cargar_mallas fiis --ejecutar   # escribe en la base

RECONCILIA, no solo inserta: si una fila de `malla_cursos` está en la base con
un ciclo o unos créditos que ya no son los del plan, se corrige; si sobra
(quedó de una carga anterior equivocada), se borra junto con sus aristas de
prerrequisito. Así una malla mal cargada se arregla re-ejecutando el script en
vez de a mano. Para dar de alta otra facultad basta agregar su módulo de datos.

Contrato del módulo de datos
----------------------------
    FACULTAD  {codigo, nombre, descripcion}
    CARRERAS  codigo -> (nombre, descripcion, duracion_ciclos)
    MALLAS    codigo_plan -> (codigo_carrera, nombre_malla, es_vigente)
    NOMBRES   code -> nombre del curso
    PLANES    codigo_plan -> {ciclo: [(code, creditos, [prerrequisitos]), ...]}
    ELECTIVOS codigo_plan -> [code, ...]   (solo se dan de alta en `cursos`)

Formato antiguo (una sola malla por carrera, sin `MALLAS`): `CARRERAS` lleva
la 5-tupla (nombre, descripcion, ciclos, codigo_plan, nombre_malla) y `PLANES`
y `ELECTIVOS` se indexan por código de carrera. Se sigue aceptando.
"""

import argparse
import importlib
import pkgutil
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import get_admin_client  # noqa: E402


@dataclass
class Plan:
    """Una malla concreta: la versión de plan de estudios de una carrera."""

    codigo_plan: str
    codigo_carrera: str
    nombre: str
    es_vigente: bool
    ciclos: dict = field(default_factory=dict)  # ciclo -> [(code, creditos, [prereqs])]
    electivos: list = field(default_factory=list)

    def cursos(self):
        for ciclo, filas in sorted(self.ciclos.items()):
            for code, creditos, prereqs in filas:
                yield ciclo, code, creditos, prereqs


class DatosFacultad:
    """Los datos de una facultad, ya validados contra sí mismos."""

    def __init__(self, nombre_modulo: str):
        self.nombre = nombre_modulo
        try:
            mod = importlib.import_module(f"scripts_manuales.mallas.{nombre_modulo}")
        except ModuleNotFoundError:
            disponibles = ", ".join(facultades_disponibles()) or "(ninguna)"
            raise SystemExit(
                f"No existe el módulo de datos '{nombre_modulo}'. "
                f"Disponibles: {disponibles}"
            )
        faltantes = [
            campo
            for campo in ("FACULTAD", "CARRERAS", "NOMBRES", "PLANES", "ELECTIVOS")
            if not hasattr(mod, campo)
        ]
        if faltantes:
            raise SystemExit(
                f"El módulo '{nombre_modulo}' no cumple el contrato: "
                f"le faltan {', '.join(faltantes)}."
            )
        self.FACULTAD = mod.FACULTAD
        self.NOMBRES = mod.NOMBRES
        # (codigo_carrera, codigo_plan viejo) -> codigo_plan oficial.
        self.PLANES_RENOMBRADOS = getattr(mod, "PLANES_RENOMBRADOS", {})

        if hasattr(mod, "MALLAS"):
            self.CARRERAS = mod.CARRERAS
            self.planes = [
                Plan(
                    codigo_plan=codigo_plan,
                    codigo_carrera=codigo_carrera,
                    nombre=nombre_malla,
                    es_vigente=es_vigente,
                    ciclos=mod.PLANES[codigo_plan],
                    electivos=mod.ELECTIVOS.get(codigo_plan, []),
                )
                for codigo_plan, (codigo_carrera, nombre_malla, es_vigente) in mod.MALLAS.items()
            ]
        else:
            # Formato antiguo: la carrera y su única malla van en la misma tupla.
            self.CARRERAS = {
                codigo: (nombre, desc, ciclos)
                for codigo, (nombre, desc, ciclos, _, _) in mod.CARRERAS.items()
            }
            self.planes = [
                Plan(
                    codigo_plan=codigo_plan,
                    codigo_carrera=codigo,
                    nombre=nombre_malla,
                    es_vigente=True,
                    ciclos=mod.PLANES[codigo],
                    electivos=mod.ELECTIVOS.get(codigo, []),
                )
                for codigo, (_, _, _, codigo_plan, nombre_malla) in mod.CARRERAS.items()
            ]

    def codigos_usados(self) -> set:
        """Todo código de curso que esta facultad necesita en la tabla `cursos`."""
        codigos = set()
        for plan in self.planes:
            for _, code, _, _ in plan.cursos():
                codigos.add(code)
            codigos.update(plan.electivos)
        return codigos

    def validar(self) -> list:
        """Revisa los datos contra sí mismos antes de tocar la base."""
        errores = []

        for code in sorted(self.codigos_usados()):
            if code not in self.NOMBRES:
                errores.append(f"Falta el nombre del curso {code} en NOMBRES.")

        vistos = set()
        for plan in self.planes:
            etiqueta = f"{plan.codigo_carrera}/{plan.codigo_plan}"
            if plan.codigo_plan in vistos:
                errores.append(f"El plan {plan.codigo_plan} está declarado dos veces.")
            vistos.add(plan.codigo_plan)
            if plan.codigo_carrera not in self.CARRERAS:
                errores.append(f"El plan {etiqueta} no tiene entrada en CARRERAS.")

            # Un prerrequisito debe cursarse antes: tiene que estar en la misma
            # malla y en un ciclo estrictamente anterior.
            ciclo_de = {}
            for ciclo, code, _, _ in plan.cursos():
                if code in ciclo_de:
                    errores.append(
                        f"{etiqueta}: {code} aparece en los ciclos "
                        f"{ciclo_de[code]} y {ciclo}."
                    )
                ciclo_de[code] = ciclo
            for ciclo, code, _, prereqs in plan.cursos():
                for pre in prereqs:
                    if pre not in ciclo_de:
                        errores.append(
                            f"{etiqueta}: {code} exige {pre}, que no está en la malla."
                        )
                    elif ciclo_de[pre] >= ciclo:
                        errores.append(
                            f"{etiqueta}: {code} (ciclo {ciclo}) exige {pre}, "
                            f"que está en el ciclo {ciclo_de[pre]}."
                        )

            if len(plan.electivos) != len(set(plan.electivos)):
                errores.append(f"{etiqueta}: hay electivos repetidos.")

        return errores


def facultades_disponibles() -> list:
    paquete = importlib.import_module("scripts_manuales.mallas")
    return sorted(m.name for m in pkgutil.iter_modules(paquete.__path__))


def _todas_las_filas(sb, tabla: str, columnas: str, filtro=None) -> list:
    filas, off, paso = [], 0, 1000
    while True:
        q = sb.table(tabla).select(columnas).range(off, off + paso - 1)
        if filtro is not None:
            q = filtro(q)
        lote = q.execute().data
        filas.extend(lote)
        if len(lote) < paso:
            return filas
        off += paso


def sincronizar_cursos(sb, datos: DatosFacultad, ejecutar: bool) -> dict:
    """Crea los cursos que falten, corrige nombres y devuelve el mapa code -> id."""
    existentes = {f["code"]: f for f in _todas_las_filas(sb, "cursos", "id,code,name")}

    necesarios = datos.codigos_usados()
    faltantes = sorted(necesarios - existentes.keys())
    reusados = sorted(necesarios & existentes.keys())

    # El nombre del módulo de datos es la fuente de verdad: viene del documento
    # oficial. Si la base tiene otro, se corrige (y se dice cuál era).
    a_renombrar = [
        code
        for code in reusados
        if existentes[code]["name"].strip() != datos.NOMBRES[code].strip()
    ]
    print(f"  cursos ya en la base y reutilizados: {len(reusados)}")
    for code in a_renombrar:
        print(f"    ~ {code}: '{existentes[code]['name']}' -> '{datos.NOMBRES[code]}'")
    print(f"  cursos nuevos a crear: {len(faltantes)}")

    if not ejecutar:
        return {code: f["id"] for code, f in existentes.items()}

    for code in a_renombrar:
        sb.table("cursos").update({"name": datos.NOMBRES[code]}).eq("code", code).execute()

    if faltantes:
        nuevos = [{"code": code, "name": datos.NOMBRES[code]} for code in faltantes]
        for i in range(0, len(nuevos), 100):
            sb.table("cursos").insert(nuevos[i : i + 100]).execute()
        for i in range(0, len(faltantes), 100):
            lote = faltantes[i : i + 100]
            for f in sb.table("cursos").select("id,code").in_("code", lote).execute().data:
                existentes[f["code"]] = f

    return {code: f["id"] for code, f in existentes.items()}


def upsert_facultad_y_carreras(sb, datos: DatosFacultad, ejecutar: bool) -> dict:
    """Da de alta la facultad y sus carreras; devuelve el mapa codigo -> carrera_id."""
    codigo_fac = datos.FACULTAD["codigo"]
    fila = sb.table("facultades").select("id").eq("codigo", codigo_fac).execute().data
    if fila:
        facultad_id = fila[0]["id"]
        print(f"  facultad {codigo_fac} ya existe (id={facultad_id})")
    elif ejecutar:
        facultad_id = sb.table("facultades").insert(datos.FACULTAD).execute().data[0]["id"]
        print(f"  facultad {codigo_fac} creada (id={facultad_id})")
    else:
        facultad_id = None
        print(f"  facultad {codigo_fac} se crearía")

    carrera_ids = {}
    for codigo, (nombre, desc, ciclos) in datos.CARRERAS.items():
        fila = sb.table("carreras").select("id,name").eq("codigo", codigo).execute().data
        if fila:
            carrera_ids[codigo] = fila[0]["id"]
            print(f"  carrera {codigo} ya existe (id={fila[0]['id']})")
        elif ejecutar:
            nueva = {
                "facultad_id": facultad_id,
                "codigo": codigo,
                "name": nombre,
                "description": desc,
                "duracion_ciclos": ciclos,
            }
            carrera_ids[codigo] = sb.table("carreras").insert(nueva).execute().data[0]["id"]
            print(f"  carrera {codigo} creada (id={carrera_ids[codigo]}): {nombre}")
        else:
            print(f"  carrera {codigo} se crearía ({nombre})")
    return carrera_ids


def _renombrar_plan_previo(sb, datos: DatosFacultad, plan: Plan, carrera_id, ejecutar: bool):
    """Renombra el `codigo_plan` con el que la malla se cargó antes.

    Crear una malla nueva dejaría huérfano el `perfiles.malla_id` de quien ya
    la eligió, así que la misma malla se renombra al código oficial.
    """
    viejo = next(
        (
            v
            for (carrera, v), nuevo in datos.PLANES_RENOMBRADOS.items()
            if carrera == plan.codigo_carrera and nuevo == plan.codigo_plan
        ),
        None,
    )
    if viejo is None or carrera_id is None:
        return None
    fila = (
        sb.table("mallas")
        .select("id")
        .eq("carrera_id", carrera_id)
        .eq("codigo_plan", viejo)
        .execute()
        .data
    )
    if not fila:
        return None
    print(f"  malla id={fila[0]['id']}: codigo_plan '{viejo}' -> '{plan.codigo_plan}'")
    if ejecutar:
        sb.table("mallas").update({"codigo_plan": plan.codigo_plan}).eq(
            "id", fila[0]["id"]
        ).execute()
    return fila[0]["id"]


def _upsert_malla(sb, plan: Plan, carrera_id, ejecutar: bool, id_renombrado=None):
    """Devuelve el id de la malla del plan, creándola o actualizándola.

    `id_renombrado` es la malla que en la base todavía lleva el código viejo: en
    dry-run el renombrado no se aplica, y sin esta pista el script diría que la
    malla "se crearía" cuando en realidad se va a reconciliar.
    """
    fila = (
        sb.table("mallas")
        .select("id,nombre,es_vigente")
        .eq("carrera_id", carrera_id)
        .eq("codigo_plan", plan.codigo_plan)
        .execute()
        .data
        if carrera_id is not None
        else []
    )
    cambios = {"nombre": plan.nombre, "es_vigente": plan.es_vigente}
    if not fila and id_renombrado is not None:
        fila = sb.table("mallas").select("id,nombre,es_vigente").eq(
            "id", id_renombrado
        ).execute().data
    if fila:
        malla_id = fila[0]["id"]
        distintos = {k: v for k, v in cambios.items() if fila[0].get(k) != v}
        print(f"  malla {plan.codigo_plan} ya existe (id={malla_id})")
        if distintos:
            print(f"    ~ se actualiza {distintos}")
            if ejecutar:
                sb.table("mallas").update(distintos).eq("id", malla_id).execute()
        return malla_id
    if ejecutar:
        malla_id = (
            sb.table("mallas")
            .insert({"carrera_id": carrera_id, "codigo_plan": plan.codigo_plan, **cambios})
            .execute()
            .data[0]["id"]
        )
        print(f"  malla {plan.codigo_plan} creada (id={malla_id})")
        return malla_id
    print(f"  malla {plan.codigo_plan} se crearía ({plan.nombre})")
    return None


def cargar_plan(sb, datos: DatosFacultad, plan: Plan, carrera_id, curso_ids: dict, ejecutar: bool):
    """Reconcilia una malla: cursos, ciclos, créditos y prerrequisitos."""
    id_renombrado = _renombrar_plan_previo(sb, datos, plan, carrera_id, ejecutar)
    malla_id = _upsert_malla(sb, plan, carrera_id, ejecutar, id_renombrado)

    total = sum(len(c) for c in plan.ciclos.values())
    creditos = sum(cr for _, _, cr, _ in plan.cursos())
    aristas = sum(len(p) for _, _, _, p in plan.cursos())
    print(f"  {total} cursos en la malla, {creditos} créditos, {aristas} prerrequisitos")
    print(f"  {len(plan.electivos)} electivos (solo en `cursos`)")

    if malla_id is None:
        return

    # --- malla_cursos: insertar, corregir y borrar lo que sobre ---
    deseados = {
        code: {
            "ciclo": ciclo,
            "credits": creditos_curso,
            "tipo": "ELECTIVO" if code.startswith("ELEC-") else "OBLIGATORIO",
        }
        for ciclo, code, creditos_curso, _ in plan.cursos()
    }
    curso_a_code = {curso_ids[code]: code for code in deseados if code in curso_ids}

    actuales = _todas_las_filas(
        sb, "malla_cursos", "id,curso_id,ciclo,credits,tipo",
        lambda q: q.eq("malla_id", malla_id),
    )
    por_code = {curso_a_code[f["curso_id"]]: f for f in actuales if f["curso_id"] in curso_a_code}
    sobrantes = [f for f in actuales if f["curso_id"] not in curso_a_code]

    nuevos, correcciones = [], []
    for code, quiere in deseados.items():
        actual = por_code.get(code)
        if actual is None:
            # En dry-run los cursos nuevos todavía no tienen id: basta contarlos.
            if code in curso_ids:
                nuevos.append({"malla_id": malla_id, "curso_id": curso_ids[code], **quiere})
            else:
                nuevos.append(None)
            continue
        distintos = {k: v for k, v in quiere.items() if actual.get(k) != v}
        if distintos:
            correcciones.append((actual["id"], code, actual, distintos))

    print(f"    malla_cursos: {len(nuevos)} a insertar, {len(correcciones)} a corregir, "
          f"{len(sobrantes)} a borrar")
    for _, code, actual, distintos in correcciones:
        antes = {k: actual.get(k) for k in distintos}
        print(f"      ~ {code}: {antes} -> {distintos}")
    code_de_id = {cid: code for code, cid in curso_ids.items()}
    for f in sobrantes:
        code = code_de_id.get(f["curso_id"], f"curso_id={f['curso_id']}")
        print(f"      - {code} '{datos.NOMBRES.get(code, '?')}' (ciclo {f['ciclo']}) "
              f"ya no está en el plan")

    if not ejecutar:
        return

    nuevos = [n for n in nuevos if n is not None]

    for mc_id, _, _, distintos in correcciones:
        sb.table("malla_cursos").update(distintos).eq("id", mc_id).execute()

    if sobrantes:
        ids = [f["id"] for f in sobrantes]
        for i in range(0, len(ids), 100):
            lote = ids[i : i + 100]
            # Las aristas que apuntan a una fila que se va deben irse antes: la
            # FK de malla_curso_prerrequisitos las sostiene por los dos lados.
            sb.table("malla_curso_prerrequisitos").delete().in_("malla_curso_id", lote).execute()
            sb.table("malla_curso_prerrequisitos").delete().in_(
                "prerrequisito_malla_curso_id", lote
            ).execute()
            sb.table("malla_cursos").delete().in_("id", lote).execute()

    if nuevos:
        for i in range(0, len(nuevos), 100):
            sb.table("malla_cursos").insert(nuevos[i : i + 100]).execute()

    actuales = _todas_las_filas(
        sb, "malla_cursos", "id,curso_id", lambda q: q.eq("malla_id", malla_id)
    )
    mc_por_code = {
        curso_a_code[f["curso_id"]]: f["id"] for f in actuales if f["curso_id"] in curso_a_code
    }

    # --- prerrequisitos, ya resueltos a filas de malla_cursos ---
    deseadas = {
        (mc_por_code[code], mc_por_code[pre])
        for _, code, _, prereqs in plan.cursos()
        for pre in prereqs
    }
    existentes_filas = _todas_las_filas(
        sb,
        "malla_curso_prerrequisitos",
        "id,malla_curso_id,prerrequisito_malla_curso_id",
        lambda q: q.in_("malla_curso_id", list(mc_por_code.values())),
    )
    existentes = {
        (f["malla_curso_id"], f["prerrequisito_malla_curso_id"]): f["id"] for f in existentes_filas
    }

    a_insertar = [
        {"malla_curso_id": a, "prerrequisito_malla_curso_id": b}
        for a, b in deseadas
        if (a, b) not in existentes
    ]
    a_borrar = [fid for par, fid in existentes.items() if par not in deseadas]

    for i in range(0, len(a_insertar), 100):
        sb.table("malla_curso_prerrequisitos").insert(a_insertar[i : i + 100]).execute()
    for i in range(0, len(a_borrar), 100):
        sb.table("malla_curso_prerrequisitos").delete().in_("id", a_borrar[i : i + 100]).execute()
    print(f"    prerrequisitos: {len(a_insertar)} insertados, {len(a_borrar)} borrados")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "facultad",
        help="módulo de datos en scripts_manuales/mallas/ (ej. 'fiis')",
    )
    parser.add_argument(
        "--ejecutar",
        action="store_true",
        help="escribe en la base; sin esta bandera solo valida y reporta",
    )
    args = parser.parse_args()

    datos = DatosFacultad(args.facultad)

    print(f"=== Validación de datos ({datos.FACULTAD['codigo']}) ===")
    errores = datos.validar()
    if errores:
        for e in errores:
            print(f"  ERROR {e}")
        print(f"\n{len(errores)} error(es). No se toca la base.")
        sys.exit(1)
    print("  sin errores\n")

    sb = get_admin_client()
    modo = "EJECUTANDO" if args.ejecutar else "DRY-RUN (no escribe)"
    print(f"=== {modo} ===\n")

    print("--- Facultad y carreras ---")
    carrera_ids = upsert_facultad_y_carreras(sb, datos, args.ejecutar)

    print("\n--- Cursos ---")
    curso_ids = sincronizar_cursos(sb, datos, args.ejecutar)

    for plan in datos.planes:
        carrera = datos.CARRERAS[plan.codigo_carrera][0]
        print(f"\n--- {plan.codigo_carrera} ({carrera}) · plan {plan.codigo_plan} ---")
        cargar_plan(
            sb, datos, plan, carrera_ids.get(plan.codigo_carrera), curso_ids, args.ejecutar
        )

    if not args.ejecutar:
        print("\nDry-run terminado. Repite con --ejecutar para escribir.")


if __name__ == "__main__":
    main()
