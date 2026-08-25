"""
Carga la malla curricular de las 4 carreras de FIM (Facultad de Ingeniería
Mecánica) a partir de los PDFs oficiales en mallas_curriculares/FIM/.

Los datos de este archivo se transcribieron a mano de los 4 PDFs
(PLAN_M3/M4/M5/M6_2020-1 ACTUALIZADO.pdf) y se verificaron sumando los
créditos de cada ciclo contra el "Total de Créditos" que declara cada tabla:
las 40 sumas (10 ciclos x 4 carreras) cuadran exacto. No incluye cursos
electivos (no tienen un ciclo fijo en el plan, así que no encajan en el
modelo de malla_cursos.ciclo que usa el onboarding); se pueden agregar
después si hace falta.

Uso:
    python cargar_malla_fim.py --simular   # reporta qué se insertaría
    python cargar_malla_fim.py             # inserta de verdad

Idempotente: los cursos se upsertan por código, y antes de crear una malla
se comprueba que la carrera no tenga ya una malla con ese codigo_plan.
Reintentable sin duplicar filas.

`cursos.name` tiene restricción UNIQUE en la BD (no solo `code`): 8 cursos de
FIM son, de contenido, el mismo curso que uno ya cargado para FIIS bajo otro
código (p. ej. "Física II" ya existe como FB401; el plan de FIM la llama
MB224). Para esos, el script no crea una fila nueva — reutiliza el curso_id
existente, así que el mismo material sirve a ambas facultades. Ver ALIASES.
"""
import argparse
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client

# codigo -> nombre. Cursos compartidos por varias carreras de FIM (Estática,
# Circuitos Eléctricos, Métodos Numéricos...) aparecen una sola vez aquí y se
# referencian por código desde cada carrera.
CURSOS_MAESTRO = {
    # Generales ya existentes en la BD (mismo código que en FIIS): no se
    # reinsertan, solo se referencian. Ver verificación en la sesión.
    "BEF01": "Ética y Filosofía Política",
    "BFI01": "Física I",
    "BIC01": "Introducción a la Computación",
    "BMA01": "Cálculo Diferencial",
    "BMA02": "Cálculo Integral",
    "BMA03": "Álgebra Lineal",
    "BQU01": "Química I",
    "BRC01": "Redacción y Comunicación",
    "BEG01": "Economía General",
    "BRN01": "Realidad Nacional, Constitución y DDHH",
    # Generales de FIM sin equivalente en FIIS.
    "BIE01": "Idioma Extranjero o Lengua Nativa - Nivel Intermedio",
    "BAE01": "Actividades Extracurriculares",
    # Ciencias básicas específicas de FIM (numeración MB, distinta de la FB de FIIS).
    "MB148": "Cálculo Vectorial",
    "MB155": "Ecuaciones Diferenciales",
    "MB158": "Variable Compleja y Análisis de Fourier",
    "MB224": "Física II",
    "MB226": "Física III",
    "MB536": "Métodos Numéricos",
    "MB545": "Programación Orientada a Objetos",
    "MB613": "Estadística y Probabilidades",
    "MB720": "Introducción a la Ingeniería Mecánica",
    # Mecánica (MC).
    "MC112": "Ciencia de los Materiales",
    "MC114": "Ciencia de los Materiales I",
    "MC115": "Ciencia de los Materiales II",
    "MC213": "Procesos de Manufactura I",
    "MC214": "Procesos de Manufactura II",
    "MC216": "Procesos de Manufactura",
    "MC234": "Tecnología de la Soldadura I",
    "MC324": "Resistencia de Materiales I",
    "MC325": "Resistencia de Materiales II",
    "MC327": "Laboratorio de Resistencia de Materiales",
    "MC337": "Estática",
    "MC338": "Dinámica",
    "MC361": "Resistencia de Materiales",
    "MC401": "Elementos de Máquinas",
    "MC417": "Mecánica de Máquinas",
    "MC501": "Dibujo Técnico",
    "MC502": "Geometría Descriptiva",
    "MC505": "Dibujo Técnico - Geometría Descriptiva",
    "MC509": "Dibujo Mecánico",
    "MC510": "Dibujo Mecánico I",
    "MC512": "Dibujo Mecánico II",
    "MC516": "Cálculo por Elementos Finitos",
    "MC546": "Proyecto de Máquinas",
    "MC571": "Vibraciones Mecánicas",
    "MC585": "Cálculo de Elementos de Máquinas I",
    "MC586": "Cálculo de Elementos de Máquinas II",
    "MC589": "Cálculo de Elementos de Máquinas",
    "MC604": "Taller de Proyecto de Investigación",
    "MC605": "Taller de Investigación",
    "MC612": "Proyectos de Ingeniería",
    "MC654": "Ingeniería de Mantenimiento",
    "MC720": "Introducción a la Ingeniería Mecánica y Eléctrica",
    # Eléctrica / electrónica (ML).
    "ML114": "Análisis de Circuitos Eléctricos I",
    "ML115": "Análisis de Circuitos Eléctricos II",
    "ML121": "Laboratorio de Circuitos Eléctricos",
    "ML124": "Laboratorio de Circuitos Eléctricos I",
    "ML125": "Laboratorio de Circuitos Eléctricos II",
    "ML140": "Circuitos Eléctricos",
    "ML202": "Máquinas Eléctricas",
    "ML214": "Máquinas Eléctricas Estáticas",
    "ML223": "Laboratorio de Máquinas Eléctricas Estáticas",
    "ML244": "Máquinas Eléctricas Rotativas",
    "ML253": "Laboratorio de Máquinas Eléctricas Rotativas",
    "ML313": "Medidas Eléctricas",
    "ML432": "Instalaciones Eléctricas Interiores",
    "ML452": "Instalaciones Eléctricas Industriales",
    "ML511": "Sistemas de Potencia",
    "ML520": "Líneas de Transmisión",
    "ML611": "Controles Eléctricos y Automatización",
    "ML633": "Sistemas de Protección Eléctrica",
    "ML713": "Centrales Hidroeléctricas",
    "ML830": "Electrónica",
    "ML831": "Análisis y Diseño de Circuitos Electrónicos",
    "ML837": "Electrónica Industrial",
    "ML839": "Electrónica de Potencia",
    "ML951": "Auditoría de Sistemas Electromecánicos",
    # Térmica / fluidos (MN).
    "MN114": "Termodinámica I",
    "MN116": "Termodinámica II",
    "MN121": "Termodinámica",
    "MN136": "Motores de Combustión Interna",
    "MN153": "Fuerza Motriz Térmica",
    "MN163": "Centrales Termoeléctricas",
    "MN204": "Mecánica de Fluidos",
    "MN216": "Mecánica de Fluidos I",
    "MN217": "Mecánica de Fluidos II",
    "MN232": "Turbomáquinas I",
    "MN310": "Transferencia de Calor",
    "MN314": "Transferencia de Calor y Masa",
    "MN374": "Refrigeración y Aire Acondicionado",
    "MN412": "Laboratorio de Ingeniería Mecánica I",
    "MN463": "Laboratorio de Ingeniería Mecánica II",
    "MN464": "Laboratorio de Ingeniería Mecánica III",
    "MN465": "Laboratorio de Ingeniería Mecánica",
    # Gestión (MS).
    "MS112": "Desarrollo de Habilidades Sociales y Liderazgo",
    "MS213": "Ingeniería Económica y Finanzas",
    "MS525": "Gestión Integral de la Calidad",
    "MS614": "Medio Ambiente y Sostenibilidad",
    # Control / mecatrónica (MT).
    "MT120": "Introducción a la Ingeniería Mecatrónica",
    "MT127": "Análisis y Diseño de Circuitos Digitales",
    "MT136": "Sistemas Embebidos",
    "MT221": "Ingeniería de Control",
    "MT227": "Control Moderno y Óptimo",
    "MT228": "Control Digital",
    "MT233": "Control de Procesos",
    "MT235": "Control Clásico",
    "MT242": "Sistemas Electrohidráulicos y Electroneumáticos",
    "MT247": "Sensores y Acondicionamiento de Señales",
    "MT325": "Diseño de Sistemas en Tiempo Real",
    "MT335": "Comunicación de Datos y Redes Industriales",
    "MT417": "Procesamiento Digital de Señales",
    "MT418": "Procesadores Digitales de Señales",
    "MT516": "Dinámica de Sistemas Multicuerpo",
    "MT517": "Análisis y Control de Robots",
    "MT616": "Inteligencia Artificial",
    "MT723": "Diseño de Máquinas Automáticas",
    "MT736": "Sistemas de Manufactura Reconfigurables",
    "MT818": "Proyecto Mecatrónico",
    # Naval (MV).
    "MV114": "Delineación de Formas Navales",
    "MV120": "Introducción a la Ingeniería Naval",
    "MV211": "Teoría del Buque I",
    "MV214": "Teoría del Buque II",
    "MV232": "Sistema Eléctrico del Buque",
    "MV233": "Sistemas Electrónicos del Buque",
    "MV315": "Máquinas Marinas I",
    "MV316": "Máquinas Marinas II",
    "MV323": "Máquinas Auxiliares del Buque",
    "MV335": "Motores Diesel Marinos",
    "MV423": "Tecnología de la Construcción Naval I",
    "MV425": "Tecnología de la Construcción Naval II",
    "MV435": "Hidrodinámica Naval",
    "MV436": "Resistencia al Avance Naval y Propulsión",
    "MV437": "Laboratorio de Hidrodinámica Naval",
    "MV456": "Dinámica del Buque",
    "MV461": "Proyectos Navales I",
    "MV463": "Proyectos Navales II",
    "MV476": "Estructuras Navales I",
    "MV477": "Estructuras Navales II",
    "MV615": "Legislación Marítima",
    "MV643": "Organización y Administración de Industrias Navales",
}

# codigo_carrera -> (carrera_id en BD, codigo_plan, nombre_malla, {ciclo: [(codigo, creditos, [prereq_codigos]), ...]})
# Créditos y prerrequisitos transcritos de cada PDF; suma de créditos por
# ciclo verificada contra el "Total de Créditos" de la tabla.
CARRERAS_FIM = {
    "MEC": {
        "carrera_id": 9,
        "codigo_plan": "M3",
        "nombre_malla": "Plan de Estudios 2020-1",
        "ciclos": {
            1: [
                ("BEF01", 2, []), ("BFI01", 5, []), ("BIE01", 2, []),
                ("BMA01", 5, []), ("BQU01", 5, []), ("BRC01", 2, []),
                ("MB720", 3, []), ("MC501", 1, []), ("MC502", 3, []),
            ],
            2: [
                ("BAE01", 1, []), ("BEG01", 3, []), ("BIC01", 2, []),
                ("BMA02", 5, ["BMA01"]), ("BMA03", 4, []),
                ("MB224", 5, ["BFI01"]), ("MC401", 1, ["MB720"]),
                ("MC510", 3, ["MC501", "MC502"]),
            ],
            3: [
                ("MB148", 5, ["BMA02"]), ("MB226", 5, ["MB224"]),
                ("MB613", 3, ["BMA02"]), ("MC114", 4, ["BQU01"]),
                ("MC337", 4, ["BFI01", "BMA02"]),
                ("MC512", 3, ["MC401", "MC510"]),
            ],
            4: [
                ("MB155", 5, ["MB148"]), ("MB545", 4, ["BMA03", "BIC01"]),
                ("MC115", 4, ["MC114"]), ("MC213", 5, ["MC114", "MC512"]),
                ("MC338", 4, ["MC337"]), ("BRN01", 3, []),
            ],
            5: [
                ("MC214", 5, ["MC213"]), ("MC324", 5, ["MC337"]),
                ("ML140", 4, ["MB226"]), ("MN114", 5, ["MB224", "BQU01"]),
                ("MN216", 4, ["MB148", "MB224"]),
                ("MS112", 1, ["BRC01"]),
            ],
            6: [
                ("MB536", 3, ["MB155", "MB545"]), ("MC325", 5, ["MC324"]),
                ("MC327", 1, ["MC324"]), ("MC417", 4, ["MC338"]),
                ("ML121", 1, ["ML140"]), ("MN116", 3, ["MN114"]),
                ("MN217", 3, ["MN216"]), ("MN412", 1, ["MN114", "MN216"]),
            ],
            7: [
                ("MC516", 3, ["BMA03", "MC325"]),
                ("MC585", 4, ["MC325", "MC417"]), ("ML202", 4, ["ML140"]),
                ("ML830", 3, ["ML140"]), ("MN232", 4, ["MN116", "MN217"]),
                ("MN463", 1, ["MN116", "MN412"]), ("MS213", 2, ["BEG01"]),
            ],
            8: [
                ("MC586", 4, ["MC585"]), ("MN136", 5, ["MN116", "MN217"]),
                ("MN314", 4, ["MB536", "MN217"]), ("MN464", 1, ["MN463"]),
                ("MT221", 3, ["MB155"]),
            ],
            9: [
                ("MC234", 5, ["MC115", "MC214"]), ("MC604", 2, ["MB536"]),
                ("MC612", 3, ["ML202", "MS213"]),
                ("ML611", 3, ["ML121", "MT221"]),
                ("MN374", 3, ["MN314"]), ("MS525", 2, ["MS213"]),
            ],
            10: [
                ("MC546", 3, ["MC586", "MC612"]), ("MC654", 4, ["MS213"]),
                ("MN153", 4, ["MN314", "MN464"]), ("MC605", 2, ["MC604"]),
            ],
        },
    },
    "MECEL": {
        "carrera_id": 10,
        "codigo_plan": "M4",
        "nombre_malla": "Plan de Estudios 2020-1",
        "ciclos": {
            1: [
                ("BEF01", 2, []), ("BFI01", 5, []), ("BIE01", 2, []),
                ("BMA01", 5, []), ("BQU01", 5, []), ("BRC01", 2, []),
                ("MC501", 1, []), ("MC502", 3, []), ("MC720", 3, []),
            ],
            2: [
                ("BAE01", 1, []), ("BEG01", 3, []), ("BIC01", 2, []),
                ("BMA02", 5, ["BMA01"]), ("BMA03", 4, []),
                ("MB224", 5, ["BFI01"]), ("MC401", 1, ["MC720"]),
                ("MC510", 3, ["MC501", "MC502"]),
            ],
            3: [
                ("MB148", 5, ["BMA02"]), ("MB226", 5, ["MB224"]),
                ("MB613", 3, ["BMA02"]), ("MC112", 4, ["BQU01"]),
                ("MC337", 4, ["BMA02", "BFI01"]), ("MC512", 3, ["MC510"]),
            ],
            4: [
                ("MB155", 5, ["MB148"]), ("MB545", 4, ["BMA03", "BIC01"]),
                ("MC338", 4, ["MC337"]), ("MC361", 5, ["MC337"]),
                ("ML114", 5, ["MB226"]), ("MS112", 1, ["BRC01"]),
            ],
            5: [
                ("BRN01", 3, []), ("MC216", 4, ["MC112", "MC512"]),
                ("ML115", 5, ["ML114"]), ("ML124", 1, ["ML114"]),
                ("MN114", 5, ["MB224", "BQU01"]),
                ("MN216", 4, ["MB148", "MB224"]),
            ],
            6: [
                ("MB536", 3, ["MB155", "MB545"]), ("ML125", 1, ["ML115"]),
                ("ML214", 4, ["ML115"]), ("ML432", 3, ["MC512"]),
                ("ML837", 4, ["ML115"]), ("MN116", 3, ["MN114"]),
                ("MN217", 3, ["MN216"]), ("MN412", 1, ["MN114", "MN216"]),
            ],
            7: [
                ("MC516", 3, ["BMA03", "MC361"]),
                ("ML223", 1, ["ML214"]), ("ML244", 4, ["ML214"]),
                ("ML313", 2, ["MC512", "ML115"]), ("ML839", 3, ["ML837"]),
                ("MN232", 4, ["MN116", "MN217"]),
                ("MN310", 3, ["MB536", "MN217"]),
                ("MN463", 1, ["MN116", "MN412"]),
            ],
            8: [
                ("MC589", 5, ["MC361"]), ("ML253", 1, ["ML244"]),
                ("ML452", 3, ["ML115", "ML432"]),
                ("MN136", 5, ["MN116", "MN217"]), ("MS213", 2, ["BEG01"]),
                ("MT221", 3, ["MB155"]),
            ],
            9: [
                ("MC612", 3, ["ML244", "MS213"]), ("MC604", 2, ["MB536"]),
                ("ML511", 4, ["ML244"]), ("ML611", 3, ["MT221", "ML837"]),
                ("ML713", 4, ["ML244", "MN232"]),
                ("MN163", 4, ["ML244", "MN116"]),
            ],
            10: [
                ("ML520", 3, ["ML511"]), ("ML633", 3, ["ML511"]),
                ("ML951", 3, ["ML511", "ML713"]), ("MS525", 2, ["MS213"]),
                ("MC605", 2, ["MC604"]),
            ],
        },
    },
    "NAV": {
        "carrera_id": 11,
        "codigo_plan": "M5",
        "nombre_malla": "Plan de Estudios 2020-1",
        "ciclos": {
            1: [
                ("BEF01", 2, []), ("BFI01", 5, []), ("BIE01", 2, []),
                ("BMA01", 5, []), ("BQU01", 5, []), ("BRC01", 2, []),
                ("MC505", 3, []), ("MV120", 3, []),
            ],
            2: [
                ("BAE01", 1, []), ("BIC01", 2, []),
                ("BMA02", 5, ["BMA01"]), ("BMA03", 4, []),
                ("MB224", 5, ["BFI01"]), ("MC112", 4, ["BQU01"]),
                ("MC401", 1, ["MV120"]), ("MC509", 3, ["MC505"]),
            ],
            3: [
                ("BEG01", 3, []), ("MB148", 5, ["BMA02"]),
                ("MB226", 5, ["MB224"]), ("MB545", 4, ["BMA03", "BIC01"]),
                ("MC337", 4, ["BFI01", "BMA02"]),
                ("MV114", 3, ["MC509"]),
            ],
            4: [
                ("MB155", 5, ["MB148"]), ("MB613", 3, ["BMA02"]),
                ("MC338", 4, ["MC337"]), ("MC361", 5, ["MC337"]),
                ("ML140", 4, ["MB226"]), ("MV211", 4, ["MV114"]),
            ],
            5: [
                ("MB536", 3, ["MB155", "MB545"]),
                ("MC216", 4, ["MC509", "MC112"]), ("ML121", 1, ["ML140"]),
                ("ML202", 4, ["ML140"]), ("MN204", 4, ["MB155", "MB224"]),
                ("MV214", 3, ["MV211"]), ("MV476", 4, ["MC361"]),
            ],
            6: [
                ("BRN01", 3, []), ("MC516", 3, ["BMA03", "MC361"]),
                ("MN121", 5, ["MB224", "BQU01"]), ("MS112", 1, ["BRC01"]),
                ("MV323", 3, ["MC401", "MN204"]),
                ("MV435", 4, ["MN204"]), ("MV477", 4, ["MV476"]),
            ],
            7: [
                ("MC234", 5, ["MC112", "MC216"]),
                ("MC571", 3, ["MB536", "MV477"]),
                ("MN310", 3, ["MN121", "MN204"]), ("MS614", 2, []),
                ("MV232", 3, ["ML202"]), ("MV335", 3, ["MN121", "MV323"]),
                ("MV436", 4, ["MV435"]),
            ],
            8: [
                ("MN465", 1, ["MN121", "MN204"]), ("MT221", 3, ["MB155"]),
                ("MV233", 3, ["MV232"]), ("MV315", 4, ["MV335"]),
                ("MV423", 3, ["MC216", "MV476"]),
                ("MV437", 2, ["MV435"]), ("MV456", 4, ["MV435"]),
            ],
            9: [
                ("MC604", 2, ["MV214", "MV477"]), ("MS213", 2, ["BEG01"]),
                ("MV316", 4, ["MV315"]), ("MV425", 4, ["MV423"]),
                ("MV461", 2, ["MV423", "MV477"]), ("MV615", 2, ["BRN01"]),
            ],
            10: [
                ("MS525", 2, ["MS213"]), ("MV463", 3, ["MV461"]),
                ("MV643", 3, ["MV615"]), ("MC605", 2, ["MC604"]),
            ],
        },
    },
    "MTR": {
        "carrera_id": 12,
        "codigo_plan": "M6",
        "nombre_malla": "Plan de Estudios 2020-1",
        "ciclos": {
            1: [
                ("BEF01", 2, []), ("BFI01", 5, []), ("BIE01", 2, []),
                ("BMA01", 5, []), ("BQU01", 5, []), ("BRC01", 2, []),
                ("MC505", 3, []), ("MT120", 3, []),
            ],
            2: [
                ("BAE01", 1, []), ("BEG01", 3, []), ("BIC01", 2, []),
                ("BMA02", 5, ["BMA01"]), ("BMA03", 4, []),
                ("MB224", 5, ["BFI01"]), ("MC509", 3, ["MC505"]),
            ],
            3: [
                ("MB148", 5, ["BMA02"]), ("MB226", 5, ["MB224"]),
                ("MB545", 4, ["BMA03", "BIC01"]), ("MB613", 3, ["BMA02"]),
                ("MC112", 4, ["BQU01"]), ("MC337", 4, ["BMA02", "BFI01"]),
            ],
            4: [
                ("MB155", 5, ["MB148"]), ("MC338", 4, ["MC337"]),
                ("MC361", 5, ["MC337"]), ("MC401", 1, ["MT120"]),
                ("ML140", 4, ["MB226"]), ("MN121", 5, ["BQU01", "MB224"]),
            ],
            5: [
                ("MB158", 3, ["MB155"]), ("ML121", 1, ["ML140"]),
                ("ML202", 4, ["ML140"]), ("ML831", 5, ["ML140"]),
                ("MN204", 4, ["MB155", "MB224"]), ("MS112", 1, ["BRC01"]),
                ("MT127", 5, ["BMA03", "ML140"]),
            ],
            6: [
                ("BRN01", 3, []), ("MB536", 3, ["MB155", "MB545"]),
                ("MC216", 4, ["MC112", "MC509"]),
                ("MN310", 3, ["MN121", "MN204"]),
                ("MT235", 3, ["MB155"]),
                ("MT247", 3, ["ML831", "MT127"]),
                ("MT516", 3, ["MB155", "MC338"]),
            ],
            7: [
                ("MC571", 3, ["MB536", "MC361"]), ("ML839", 3, ["ML831"]),
                ("MN465", 1, ["MN121", "MN204"]),
                ("MT136", 3, ["MT127"]), ("MT227", 3, ["MT235"]),
                ("MT242", 4, ["ML121", "MN204"]),
                ("MT417", 3, ["MB158", "MB536"]),
            ],
            8: [
                ("MC516", 3, ["BMA03", "MC361"]),
                ("MT325", 3, ["MB536", "MT235"]),
                ("MT335", 3, ["MB545", "MT127"]),
                ("MT418", 3, ["MB158", "MT417"]),
                ("MT517", 3, ["MT516"]), ("MT736", 3, ["MC216"]),
            ],
            9: [
                ("MS213", 2, ["BEG01"]), ("MS614", 2, []),
                ("MC604", 2, ["MT136", "MT227"]),
                ("MT228", 3, ["MT227", "MT417"]),
                ("MT233", 3, ["MT127", "MT242"]),
                ("MT616", 4, ["MT227"]),
                ("MT723", 4, ["MC338", "MT517"]),
            ],
            10: [
                ("MC605", 2, ["MC604"]), ("MS525", 2, ["MS213"]),
                # PDF trae "MC601" en la fila pero "MC604" repetido debajo del
                # total (probable error de OCR/tabla del PDF original); se usa
                # MC604 porque es el único código de esa forma en todo el plan.
                ("MT818", 4, ["MC604"]),
            ],
        },
    },
}


# Código que el PDF de FIM usa -> código ya existente en la BD para el mismo
# curso (mismo `name`, verificado a mano contra la BD real). El nombre en
# CURSOS_MAESTRO usa la redacción del PDF de FIM; se mantiene el `code` y
# `name` ya guardados en la BD, no se sobreescriben.
ALIASES_A_EXISTENTE = {
    "MB224": "FB401",   # Física II
    "MB613": "FB305",   # Estadística y Probabilidades
    "MB155": "FB403",   # Ecuaciones Diferenciales
    "MT616": "SI077",   # Inteligencia Artificial
    "MC604": "GE003-2", # Taller de Proyecto de Investigación
    "MC605": "GE004",   # Taller de Investigación
    "MB545": "SI302",   # Programación Orientada a Objetos
    "MN121": "TE401",   # Termodinámica
}


def validar_totales():
    """Créditos declarados por el PDF en cada ciclo, para chequear la transcripción."""
    totales_pdf = {
        "MEC": {1: 28, 2: 24, 3: 24, 4: 25, 5: 24, 6: 21, 7: 21, 8: 17, 9: 18, 10: 13},
        "MECEL": {1: 28, 2: 24, 3: 24, 4: 24, 5: 22, 6: 22, 7: 21, 8: 19, 9: 20, 10: 13},
        "NAV": {1: 27, 2: 25, 3: 24, 4: 25, 5: 23, 6: 23, 7: 23, 8: 20, 9: 16, 10: 10},
        "MTR": {1: 27, 2: 23, 3: 25, 4: 24, 5: 23, 6: 22, 7: 20, 8: 18, 9: 20, 10: 8},
    }
    errores = []
    for carrera, info in CARRERAS_FIM.items():
        for ciclo, cursos in info["ciclos"].items():
            suma = sum(c[1] for c in cursos)
            esperado = totales_pdf[carrera][ciclo]
            if suma != esperado:
                errores.append(f"{carrera} ciclo {ciclo}: suma={suma} esperado={esperado}")
    return errores


def main():
    parser = argparse.ArgumentParser(description="Carga la malla de FIM en la base.")
    parser.add_argument("--simular", action="store_true", help="No escribe, solo reporta.")
    args = parser.parse_args()

    print("Validando sumas de créditos por ciclo contra los PDF...")
    errores = validar_totales()
    if errores:
        print("[ERROR] Discrepancias encontradas, se detiene sin escribir nada:")
        for e in errores:
            print(f"  {e}")
        raise SystemExit(1)
    print("  OK: las 40 sumas (10 ciclos x 4 carreras) cuadran con el PDF.\n")

    sb = get_admin_client()

    # --- 1. Cursos ---
    codigos_existentes_resp = sb.table("cursos").select("id, code").in_(
        "code", list(CURSOS_MAESTRO.keys())
    ).execute()
    curso_id_por_codigo = {c["code"]: c["id"] for c in (codigos_existentes_resp.data or [])}

    # Códigos de FIM cuyo curso ya existe en la BD con otro código (mismo
    # `name`, que tiene UNIQUE). Se resuelve su id vía el código existente y
    # no se insertan como fila nueva.
    aliases_pendientes = {
        fim_code: existente
        for fim_code, existente in ALIASES_A_EXISTENTE.items()
        if fim_code in CURSOS_MAESTRO and fim_code not in curso_id_por_codigo
    }
    if aliases_pendientes:
        alias_resp = (
            sb.table("cursos").select("id, code").in_("code", list(aliases_pendientes.values())).execute()
        )
        id_por_code_existente = {c["code"]: c["id"] for c in alias_resp.data}
        for fim_code, existente in aliases_pendientes.items():
            curso_id_por_codigo[fim_code] = id_por_code_existente[existente]

    nuevos = [
        {"code": code, "name": name}
        for code, name in CURSOS_MAESTRO.items()
        if code not in curso_id_por_codigo
    ]
    print(f"Cursos: {len(curso_id_por_codigo)} ya resueltos "
          f"({len(aliases_pendientes)} por alias de nombre), {len(nuevos)} nuevos por crear.")

    if not args.simular and nuevos:
        ins = sb.table("cursos").insert(nuevos).execute()
        for c in ins.data:
            curso_id_por_codigo[c["code"]] = c["id"]
        print(f"  {len(ins.data)} cursos insertados.")
    elif args.simular:
        for c in nuevos[:5]:
            print(f"    (simulado) {c['code']} - {c['name']}")
        if len(nuevos) > 5:
            print(f"    ... y {len(nuevos) - 5} más.")

    # --- 2. Mallas ---
    total_malla_cursos = 0
    total_prereqs = 0

    for carrera_codigo, info in CARRERAS_FIM.items():
        carrera_id = info["carrera_id"]
        codigo_plan = info["codigo_plan"]

        existente = (
            sb.table("mallas")
            .select("id")
            .eq("carrera_id", carrera_id)
            .eq("codigo_plan", codigo_plan)
            .execute()
        )
        if existente.data:
            malla_id = existente.data[0]["id"]
            print(f"\n[{carrera_codigo}] Malla {codigo_plan} ya existe (id={malla_id}), se reutiliza.")
        else:
            n_cursos_carrera = sum(len(v) for v in info["ciclos"].values())
            print(f"\n[{carrera_codigo}] Nueva malla '{info['nombre_malla']}' ({codigo_plan}): "
                  f"{n_cursos_carrera} cursos en 10 ciclos.")
            if args.simular:
                continue
            malla_ins = sb.table("mallas").insert({
                "carrera_id": carrera_id,
                "nombre": info["nombre_malla"],
                "codigo_plan": codigo_plan,
                "es_vigente": True,
            }).execute()
            malla_id = malla_ins.data[0]["id"]

        if args.simular:
            for ciclo, cursos in info["ciclos"].items():
                total_malla_cursos += len(cursos)
                total_prereqs += sum(len(c[2]) for c in cursos)
            continue

        # --- 3. malla_cursos ---
        malla_curso_id_por_codigo = {}
        filas_mc = []
        for ciclo, cursos in info["ciclos"].items():
            for codigo, creditos, _ in cursos:
                filas_mc.append({
                    "malla_id": malla_id,
                    "curso_id": curso_id_por_codigo[codigo],
                    "ciclo": ciclo,
                    "credits": creditos,
                    "tipo": "OBLIGATORIO",
                    "_codigo": codigo,  # se descarta antes de insertar
                })

        codigos_en_malla = [f["_codigo"] for f in filas_mc]
        ya_en_malla = (
            sb.table("malla_cursos")
            .select("id, curso_id")
            .eq("malla_id", malla_id)
            .execute()
        )
        curso_ids_ya_en_malla = {m["curso_id"] for m in (ya_en_malla.data or [])}

        a_insertar = [
            {k: v for k, v in f.items() if k != "_codigo"}
            for f in filas_mc
            if curso_id_por_codigo[f["_codigo"]] not in curso_ids_ya_en_malla
        ]
        if a_insertar:
            mc_ins = sb.table("malla_cursos").insert(a_insertar).execute()
            print(f"  {len(mc_ins.data)} filas de malla_cursos insertadas.")
        else:
            print("  malla_cursos ya estaba completo para esta malla.")

        # Recarga completa (incluye lo ya existente) para resolver malla_curso_id por código.
        mc_resp = (
            sb.table("malla_cursos")
            .select("id, curso_id")
            .eq("malla_id", malla_id)
            .execute()
        )
        curso_id_a_malla_curso_id = {m["curso_id"]: m["id"] for m in mc_resp.data}
        for codigo in codigos_en_malla:
            malla_curso_id_por_codigo[codigo] = curso_id_a_malla_curso_id[curso_id_por_codigo[codigo]]

        # --- 4. malla_curso_prerrequisitos ---
        filas_prereq = []
        for ciclo, cursos in info["ciclos"].items():
            for codigo, _, prereqs in cursos:
                mc_id = malla_curso_id_por_codigo[codigo]
                for p_codigo in prereqs:
                    filas_prereq.append({
                        "malla_curso_id": mc_id,
                        "prerrequisito_malla_curso_id": malla_curso_id_por_codigo[p_codigo],
                    })

        if filas_prereq:
            existentes_prereq = (
                sb.table("malla_curso_prerrequisitos")
                .select("malla_curso_id, prerrequisito_malla_curso_id")
                .in_("malla_curso_id", [f["malla_curso_id"] for f in filas_prereq])
                .execute()
            )
            ya = {(e["malla_curso_id"], e["prerrequisito_malla_curso_id"]) for e in existentes_prereq.data}
            nuevas_prereq = [
                f for f in filas_prereq
                if (f["malla_curso_id"], f["prerrequisito_malla_curso_id"]) not in ya
            ]
            if nuevas_prereq:
                sb.table("malla_curso_prerrequisitos").insert(nuevas_prereq).execute()
                print(f"  {len(nuevas_prereq)} prerrequisitos insertados.")
            total_prereqs += len(nuevas_prereq)
        total_malla_cursos += len(a_insertar)

    print("\n=== Resumen ===")
    if args.simular:
        print(f"[SIMULACIÓN] Se crearían ~{total_malla_cursos} filas de malla_cursos "
              f"y ~{total_prereqs} de prerrequisitos. No se escribió nada.")
    else:
        print(f"malla_cursos insertadas: {total_malla_cursos}")
        print(f"prerrequisitos insertados: {total_prereqs}")


if __name__ == "__main__":
    main()
