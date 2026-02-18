import csv
import os

output_dir = "scrapeo/csv_outputs"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Data structure: list of steps
# Step: {title, description, duration, topics, icon}

courses = [
    {
        "filename": "BF101-Fisica.pdf",
        "course_id": 1301, # FI201
        "steps": [
            {"title": "Unidad 1: Introducción y Vectores", "description": "Mediciones, cifras significativas, vectores y operaciones.", "duration": "5h", "topics": "{Magnitudes físicas, Sistema de unidades, Vectores, Producto escalar y vectorial}", "icon": "ruler"},
            {"title": "Unidad 2: Cinemática", "description": "Movimiento rectilíneo, curvilíneo y relativo.", "duration": "6h", "topics": "{MRU, MRUV, Caída libre, Movimiento parabólico, Movimiento circular}", "icon": "activity"},
            {"title": "Unidad 3: Estática", "description": "Leyes de Newton, equilibrio de partículas y cuerpo rígido.", "duration": "7h", "topics": "{Leyes de Newton, Diagrama de cuerpo libre, Equilibrio, Momento de una fuerza}", "icon": "anchor"},
            {"title": "Unidad 4: Dinámica", "description": "Aplicaciones de leyes de Newton y fuerzas.", "duration": "7h", "topics": "{Fuerza y masa, Dinámica lineal, Dinámica curvilínea}", "icon": "zap"},
            {"title": "Unidad 5: Trabajo y Energía", "description": "Teoremas de conservación, energía cinética y potencial.", "duration": "9h", "topics": "{Trabajo, Energía Cinética, Energía Potencial, Conservación de energía}", "icon": "battery-charging"},
            {"title": "Unidad 6: Sistema de Partículas", "description": "Centro de masa, momento lineal y choques.", "duration": "5h", "topics": "{Centro de masa, Momento lineal, Impulso, Choques}", "icon": "users"},
            {"title": "Unidad 7: Fluidos", "description": "Densidad, presión y Principio de Arquímedes.", "duration": "5h", "topics": "{Densidad, Presión, Principio de Pascal, Principio de Arquímedes}", "icon": "droplet"},
            {"title": "Unidad 8: Vibraciones y Ondas", "description": "Movimiento armónico simple y ondas sonoras.", "duration": "5h", "topics": "{Movimiento armónico simple, Péndulo, Ondas, Sonido}", "icon": "radio"},
            {"title": "Unidad 9: Termodinámica", "description": "Temperatura, calor y leyes de la termodinámica.", "duration": "7h", "topics": "{Temperatura, Calor, Dilatación, Leyes de la termodinámica}", "icon": "thermometer"}
        ]
    },
    {
        "filename": "BMA02-Integral.pdf",
        "course_id": 1201, # MA125
        "steps": [
            {"title": "Semana 1: Integral Indefinida", "description": "Propiedades, integración por sustitución algebraica.", "duration": "4h", "topics": "{Integral indefinida, Sustitución algebraica, Integración por partes}", "icon": "plus-square"},
            {"title": "Semana 2: Integración Trigonométrica", "description": "Integrales de funciones trigonométricas e inversas.", "duration": "4h", "topics": "{Funciones trigonométricas, Sustitución trigonométrica}", "icon": "triangle"},
            {"title": "Semana 3: La Integral Definida", "description": "Sumas de Riemann y propiedades.", "duration": "4h", "topics": "{Sumatoria, Suma de Riemann, Área bajo la curva}", "icon": "bar-chart"},
            {"title": "Semana 4: Teoremas Fundamentales", "description": "Teorema fundamental del cálculo y valor medio.", "duration": "4h", "topics": "{Teorema Fundamental del Cálculo, Teorema del Valor Medio}", "icon": "book"},
            {"title": "Semana 5: Funciones Trascendentes", "description": "Logaritmo y exponencial.", "duration": "4h", "topics": "{Función Logaritmo, Función Exponencial, Derivadas e Integrales}", "icon": "log-in"},
            {"title": "Semana 6: Funciones Hiperbólicas", "description": "Definición y propiedades.", "duration": "4h", "topics": "{Funciones Hiperbólicas, Inversas}", "icon": "activity"},
            {"title": "Semana 7: Otras Bases", "description": "Exponenciales en otras bases y derivación logarítmica.", "duration": "4h", "topics": "{Bases generales, Derivación logarítmica}", "icon": "code"},
            {"title": "Semana 8: Examen Parcial", "description": "Evaluación parcial.", "duration": "2h", "topics": "{Examen Parcial}", "icon": "edit-3"},
            {"title": "Semana 9: Técnicas de Integración I", "description": "Potencias trigonométricas y fracciones parciales.", "duration": "4h", "topics": "{Potencias trigonométricas, Fracciones parciales}", "icon": "divide"},
            {"title": "Semana 10: Técnicas de Integración II", "description": "Funciones racionales de senos y cosenos.", "duration": "4h", "topics": "{Funciones racionales, Sustitución de Weierstrass}", "icon": "refresh-cw"},
            {"title": "Semana 11: Integrales Impropias", "description": "Sustituciones de Euler e integrales impropias.", "duration": "4h", "topics": "{Sustituciones de Euler, Integrales impropias}", "icon": "alert-circle"},
            {"title": "Semana 12: Funciones Gamma y Beta", "description": "Aplicaciones y funciones especiales.", "duration": "4h", "topics": "{Función Gamma, Función Beta, Áreas}", "icon": "star"},
            {"title": "Semana 13: Coordenadas Polares", "description": "Áreas y gráficas en polares.", "duration": "4h", "topics": "{Coordenadas polares, Áreas en polares, Volumen disco}", "icon": "compass"},
            {"title": "Semana 14: Volúmenes", "description": "Métodos del anillo y corteza cilíndrica.", "duration": "4h", "topics": "{Volúmenes de revolución, Corteza cilíndrica}", "icon": "layers"},
            {"title": "Semana 15: Longitud de Arco y Series", "description": "Aplicaciones físicas y Series de Taylor.", "duration": "4h", "topics": "{Longitud de arco, Trabajo, Presión, Series de Taylor}", "icon": "trending-up"},
            {"title": "Semana 16: Examen Final", "description": "Evaluación final.", "duration": "2h", "topics": "{Examen Final}", "icon": "file-text"}
        ]
    },
    {
        "filename": "BMA03-Lineal.pdf",
        "course_id": 1202, # MA126
        "steps": [
            {"title": "Unidad 1: Álgebra Matricial", "description": "Definiciones y operaciones con matrices.", "duration": "3h", "topics": "{Matrices, Tipos de matrices, Operaciones, Transpuesta}", "icon": "grid"},
            {"title": "Unidad 2: Determinantes", "description": "Cálculo y propiedades de determinantes.", "duration": "3h", "topics": "{Determinantes, Cofactores, Propiedades}", "icon": "maximize"},
            {"title": "Unidad 3: Rango e Inversa", "description": "Operaciones elementales y cálculo de inversa.", "duration": "3h", "topics": "{Rango, Matriz Inversa, Operaciones elementales}", "icon": "minimize-2"},
            {"title": "Unidad 4: Sistemas de Ecuaciones", "description": "Solución de sistemas lineales.", "duration": "3h", "topics": "{Sistemas lineales, Regla de Cramer, Métodos matriciales}", "icon": "list"},
            {"title": "Unidad 5: Geometría en el Espacio", "description": "Vectores en R3.", "duration": "3h", "topics": "{Vectores en R3, Producto escalar, Norma}", "icon": "box"},
            {"title": "Unidad 6: Producto Vectorial", "description": "Proyección y producto vectorial.", "duration": "3h", "topics": "{Proyección ortogonal, Producto vectorial, Triple producto}", "icon": "crosshair"},
            {"title": "Unidad 7: Independencia Lineal", "description": "Conceptos de dependencia e independencia.", "duration": "3h", "topics": "{Independencia lineal, Dependencia lineal}", "icon": "git-branch"},
            {"title": "Unidad 8: Rectas y Planos", "description": "Ecuaciones de rectas y planos en el espacio.", "duration": "3h", "topics": "{Rectas en R3, Planos, Intersecciones}", "icon": "map"},
            {"title": "Unidad 9: Espacios Vectoriales", "description": "Definición y propiedades generales.", "duration": "3h", "topics": "{Espacios vectoriales, Subespacios, Base, Dimensión}", "icon": "layout"},
            {"title": "Unidad 10: Transformaciones Lineales", "description": "Definición, núcleo e imagen.", "duration": "3h", "topics": "{Transformaciones lineales, Núcleo, Imagen}", "icon": "repeat"},
            {"title": "Unidad 11: Rep. Matricial", "description": "Matriz asociada a una transformación.", "duration": "3h", "topics": "{Representación matricial, Operadores lineales}", "icon": "monitor"},
            {"title": "Unidad 12: Valores Propios", "description": "Autovalores y autovectores.", "duration": "3h", "topics": "{Valores propios, Vectores propios, Diagonalización}", "icon": "target"},
            {"title": "Unidad 13: Diag. Transformaciones", "description": "Diagonalización de operadores.", "duration": "3h", "topics": "{Diagonalización de transformaciones, Ortogonalización}", "icon": "sliders"},
            {"title": "Unidad 14: Formas Cuadráticas", "description": "Aplicación a cónicas y superficies.", "duration": "3h", "topics": "{Formas cuadráticas, Cónicas, Superficies}", "icon": "circle"}
        ]
    },
    {
        "filename": "BQU01-Química 1.pdf",
        "course_id": 1103, # QU111
        "steps": [
            {"title": "Capítulo 1: Estequiometría", "description": "Teoría atómica y cálculos estequiométricos.", "duration": "4h", "topics": "{Átomo, Mol, Ecuación química, Balance de materia}", "icon": "flask"},
            {"title": "Capítulo 2: Termoquímica", "description": "Cambios de energía en reacciones.", "duration": "4h", "topics": "{Entalpía, Ley de Hess, Calor de reacción}", "icon": "flame"},
            {"title": "Capítulo 3: Estructura Atómica", "description": "Teoría cuántica y tabla periódica.", "duration": "8h", "topics": "{Teoría cuántica, Configuración electrónica, Tabla periódica}", "icon": "atom"},
            {"title": "Capítulo 4: Enlace Químico", "description": "Tipos de enlace y propiedades moleculares.", "duration": "8h", "topics": "{Enlace iónico, Enlace covalente, Geometría molecular, Fuerzas intermoleculares}", "icon": "share-2"},
            {"title": "Capítulo 5: Estados de la Materia", "description": "Gases, líquidos y sólidos.", "duration": "8h", "topics": "{Gases ideales, Presión de vapor, Estado sólido, Cristales}", "icon": "package"},
            {"title": "Capítulo 6: Soluciones", "description": "Propiedades de las disoluciones.", "duration": "4h", "topics": "{Solubilidad, Concentración, Propiedades coligativas}", "icon": "droplet"},
            {"title": "Capítulo 7: Cinética Química", "description": "Velocidad de reacción.", "duration": "4h", "topics": "{Rapidez de reacción, Energía de activación, Catalizadores}", "icon": "clock"},
            {"title": "Capítulo 8: Equilibrio Químico", "description": "Principio de Le Chatelier y espontaneidad.", "duration": "4h", "topics": "{Equilibrio químico, Le Chatelier, Energía libre}", "icon": "scales"},
            {"title": "Capítulo 9: Equilibrio Iónico", "description": "Ácidos, bases y pH.", "duration": "4h", "topics": "{pH, Ácidos y Bases, Buffer, Hidrólisis}", "icon": "test-tube"},
            {"title": "Capítulo 10: Electroquímica", "description": "Redox y celdas galvánicas.", "duration": "4h", "topics": "{Redox, Celdas galvánicas, Electrólisis, Corrosión}", "icon": "battery"},
            {"title": "Capítulo 11: Materiales", "description": "Metales, aleaciones y polímeros.", "duration": "4h", "topics": "{Metales, Aleaciones, Polímeros, Aceros}", "icon": "tool"}
        ]
    },
    {
        "filename": "FB101-Analítica.pdf",
        "course_id": 1104, # MA116
        "steps": [
            {"title": "Unidad 1: Vectores 2D", "description": "Sistema de coordenadas y vectores en el plano.", "duration": "4h", "topics": "{Coordenadas, Vectores R2, Operaciones}", "icon": "move"},
            {"title": "Unidad 2: Producto Escalar", "description": "Ortogonalidad y proyección.", "duration": "4h", "topics": "{Producto escalar, Norma, Ortogonalidad}", "icon": "minimize"},
            {"title": "Unidad 3: Proyección y Área", "description": "Componentes y áreas de polígonos.", "duration": "4h", "topics": "{Proyección ortogonal, Área de triángulos}", "icon": "triangle"},
            {"title": "Unidad 4: Independencia Lineal", "description": "Dependencia lineal y división de segmentos.", "duration": "4h", "topics": "{Independencia lineal, Punto medio}", "icon": "git-commit"},
            {"title": "Unidad 5: La Recta", "description": "Ecuaciones y propiedades de la recta.", "duration": "4h", "topics": "{Ecuación de la recta, Pendiente, Distancia punto-recta}", "icon": "minus"},
            {"title": "Unidad 6: Transformación Coordenadas", "description": "Traslación y rotación de ejes.", "duration": "4h", "topics": "{Traslación, Rotación}", "icon": "refresh-ccw"},
            {"title": "Unidad 7: La Circunferencia", "description": "Ecuación y recta tangente.", "duration": "4h", "topics": "{Circunferencia, Recta tangente}", "icon": "circle"},
            {"title": "Unidad 8: La Parábola", "description": "Definición, elementos y ecuaciones.", "duration": "4h", "topics": "{Parábola, Foco, Directriz}", "icon": "wifi"},
            {"title": "Unidad 9: La Elipse", "description": "Propiedades y ecuaciones.", "duration": "4h", "topics": "{Elipse, Ejes, Excentricidad}", "icon": "loader"},
            {"title": "Unidad 10: La Hipérbola", "description": "Asíntotas y ecuaciones.", "duration": "4h", "topics": "{Hipérbola, Asíntotas}", "icon": "code"},
            {"title": "Unidad 11: Ecuación General 2do Grado", "description": "Clasificación de cónicas.", "duration": "4h", "topics": "{Ecuación general, Cónicas}", "icon": "grid"},
            {"title": "Unidad 12: Invariantes", "description": "Identificación de cónicas por invariantes.", "duration": "4h", "topics": "{Invariantes, Rotación de cónicas}", "icon": "shield"}
        ]
    },
    {
        "filename": "FB301-Discreta.pdf",
        "course_id": 1302, # SY201
        "steps": [
            {"title": "Unidad 1: Sistemas Numéricos", "description": "Representación de datos y aritmética binaria.", "duration": "8h", "topics": "{Binario, IEEE 754, Punto flotante}", "icon": "cpu"},
            {"title": "Unidad 2: Lógica Proposicional", "description": "Métodos de demostración e inducción.", "duration": "4h", "topics": "{Lógica, Cuantificadores, Inducción}", "icon": "check-square"},
            {"title": "Unidad 3: Relaciones Binarias", "description": "Relaciones de equivalencia y orden.", "duration": "8h", "topics": "{Relaciones, Digrafos, Orden parcial, Hasse}", "icon": "git-merge"},
            {"title": "Unidad 4: Grafos", "description": "Teoría de grafos y trayectorias.", "duration": "4h", "topics": "{Grafos, Euler, Matriz adyacencia}", "icon": "share"},
            {"title": "Unidad 5: Árboles", "description": "Árboles binarios y algoritmos de optimización.", "duration": "8h", "topics": "{Árboles, Huffman, Prim, Kruskal}", "icon": "git-pull-request"},
            {"title": "Unidad 6: Álgebra de Boole", "description": "Circuitos lógicos y mapas de Karnaugh.", "duration": "8h", "topics": "{Álgebra Booleana, Compuertas lógicas, Karnaugh}", "icon": "toggle-left"},
            {"title": "Unidad 7: Estructuras Algebraicas", "description": "Grupos, semigrupos y codificación.", "duration": "8h", "topics": "{Grupos, Semigrupos, Hammin, Paridad}", "icon": "box"},
            {"title": "Unidad 8: Teoría de Lenguajes", "description": "Autómatas y máquinas de estado finito.", "duration": "4h", "topics": "{Lenguajes, Autómatas, Máquinas de estado}", "icon": "terminal"}
        ]
    },
    {
        "filename": "FB303-Multivariable.pdf",
        "course_id": 1303, # MA215
        "steps": [
            {"title": "Unidad 1: Cálculo Diferencial Vectorial", "description": "Derivadas parciales, gradientes y optimización.", "duration": "16h", "topics": "{Derivadas parciales, Gradiente, Multiplicadores de Lagrange, Máximos y Mínimos}", "icon": "layers"},
            {"title": "Unidad 2: Integrales Múltiples", "description": "Integrales dobles y triples, cambio de variable.", "duration": "14h", "topics": "{Integrales dobles, Integrales triples, Coordenadas cilíndricas, Coordenadas esféricas}", "icon": "box"},
            {"title": "Unidad 3: Cálculo Vectorial Integral", "description": "Integrales de línea y superficie, teoremas integrales.", "duration": "14h", "topics": "{Integral de línea, Teorema de Green, Teorema de Stokes, Teorema de Gauss}", "icon": "globe"}
        ]
    },
    {
        "filename": "SI205-Algorítmia-I2.pdf",
        "course_id": 1203, # SY102
        "steps": [
            {"title": "Semana 1: Estructuras de Control", "description": "Secuenciales y selectivas.", "duration": "2h", "topics": "{Control secuencial, If-Else, Anidamiento}", "icon": "code"},
            {"title": "Semana 2: Estructuras Repetitivas", "description": "Bucles y repeticiones.", "duration": "2h", "topics": "{For, While, Do-While}", "icon": "repeat"},
            {"title": "Semana 3: Arreglos", "description": "Arreglos unidimensionales.", "duration": "2h", "topics": "{Arrays, Vectores}", "icon": "list"},
            {"title": "Semana 4: Ordenamiento", "description": "Algoritmos de ordenamiento.", "duration": "2h", "topics": "{Bubble sort, Selection sort}", "icon": "bar-chart-2"},
            {"title": "Semana 5: Búsqueda", "description": "Algoritmos de búsqueda.", "duration": "2h", "topics": "{Búsqueda lineal, Búsqueda binaria}", "icon": "search"},
            {"title": "Semana 6: Matrices", "description": "Arreglos multidimensionales.", "duration": "2h", "topics": "{Matrices 2D, Operaciones matrices}", "icon": "grid"},
            {"title": "Semana 7: Registros", "description": "Structs y arreglos de registros.", "duration": "2h", "topics": "{Structs, Registros}", "icon": "database"},
            {"title": "Semana 8: Examen Parcial", "description": "Evaluación parcial.", "duration": "2h", "topics": "{Examen Parcial}", "icon": "edit"},
            {"title": "Semana 9: Cadenas", "description": "Manejo de strings.", "duration": "2h", "topics": "{Strings, Operaciones con texto}", "icon": "type"},
            {"title": "Semana 10: Subprogramas", "description": "Funciones y procedimientos.", "duration": "2h", "topics": "{Funciones, Parámetros}", "icon": "box"},
            {"title": "Semana 11: Recursividad", "description": "Conceptos de recursión.", "duration": "2h", "topics": "{Recursividad}", "icon": "refresh-cw"},
            {"title": "Semana 12: Archivos", "description": "Manejo de archivos secuenciales y aleatorios.", "duration": "2h", "topics": "{Archivos, Lectura/Escritura}", "icon": "save"},
            {"title": "Semana 13: Punteros y Listas", "description": "Listas enlazadas.", "duration": "2h", "topics": "{Punteros, Listas enlazadas}", "icon": "link"},
            {"title": "Semana 14: Pilas y Colas", "description": "Estructuras LIFO y FIFO.", "duration": "2h", "topics": "{Stacks, Queues}", "icon": "layers"},
            {"title": "Semana 15: Árboles", "description": "Árboles binarios.", "duration": "2h", "topics": "{Árboles binarios, Recorridos}", "icon": "git-merge"},
            {"title": "Semana 16: Examen Final", "description": "Evaluación final.", "duration": "2h", "topics": "{Examen Final}", "icon": "file-text"}
        ]
    },
    {
        "filename": "ilide.info-silabo-de-calculo-diferencial.pdf",
        "course_id": 1102, # MA115
        "steps": [
            {"title": "Semana 1: Lógica y Conjuntos", "description": "Introducción a la lógica proposicional y teoría de conjuntos.", "duration": "4h", "topics": "{Lógica Proposicional, Conectivos, Conjuntos}", "icon": "brain"},
            {"title": "Semana 2: Números Reales", "description": "Sistema de números reales y desigualdades.", "duration": "4h", "topics": "{Números reales, Desigualdades}", "icon": "hash"},
            {"title": "Semana 3: Valor Absoluto", "description": "Valor absoluto y máximo entero.", "duration": "4h", "topics": "{Valor absoluto, Máximo entero}", "icon": "maximize"},
            {"title": "Semana 4: Funciones", "description": "Dominio, rango y funciones especiales.", "duration": "4h", "topics": "{Funciones, Dominio, Rango}", "icon": "activity"},
            {"title": "Semana 5: Operaciones Funciones", "description": "Álgebra y composición de funciones.", "duration": "4h", "topics": "{Álgebra de funciones, Composición}", "icon": "plus-circle"},
            {"title": "Semana 6: Funciones Inversas", "description": "Función inversa y propiedades.", "duration": "4h", "topics": "{Función inversa, Univalente}", "icon": "rotate-ccw"},
            {"title": "Semana 7: Límites", "description": "Cálculo de límites.", "duration": "4h", "topics": "{Límites algebraicos, Límites trigonométricos}", "icon": "arrow-right"},
            {"title": "Semana 8: Examen Parcial", "description": "Evaluación parcial.", "duration": "2h", "topics": "{Examen Parcial}", "icon": "edit-2"},
            {"title": "Semana 9: Continuidad", "description": "Continuidad y asíntotas.", "duration": "4h", "topics": "{Continuidad, Asíntotas}", "icon": "git-commit"},
            {"title": "Semana 10: Teoremas Continuidad", "description": "Bolzano y Valor Intermedio.", "duration": "4h", "topics": "{Teorema Valor Intermedio, Bolzano}", "icon": "bookmark"},
            {"title": "Semana 11: La Derivada", "description": "Definición y reglas de derivación.", "duration": "4h", "topics": "{Derivada, Regla de la cadena}", "icon": "zap"},
            {"title": "Semana 12: Diferenciabilidad", "description": "Derivación implícita.", "duration": "4h", "topics": "{Diferenciabilidad, Derivada implícita}", "icon": "git-pull-request"},
            {"title": "Semana 13: Aplicaciones Derivada", "description": "Teorema del Valor Medio y Rolle.", "duration": "4h", "topics": "{Valor Medio, Rolle, Lagrange}", "icon": "trending-up"},
            {"title": "Semana 14: Extremos", "description": "Máximos y mínimos.", "duration": "4h", "topics": "{Máximos, Mínimos, Optimización}", "icon": "bar-chart"},
            {"title": "Semana 15: Concavidad", "description": "L'Hopital y gráficas.", "duration": "4h", "topics": "{Concavidad, L'Hopital}", "icon": "curve"},
            {"title": "Semana 16: Examen Final", "description": "Evaluación final.", "duration": "2h", "topics": "{Examen Final}", "icon": "award"}
        ]
    },
    {
        "filename": "syllabus_extracted.txt",
        "csv_name": "BIC01-Intro_Computacion_learning_path.csv",
        "course_id": 1101, # SY101 / BIC01
        "steps": [
            {"title": "Semana 1: Introducción", "description": "Definiciones básicas, lenguajes y algoritmos.", "duration": "3h", "topics": "{Algoritmos, Lenguajes, C++}", "icon": "terminal"},
            {"title": "Semana 2: Operadores", "description": "Operadores aritméticos, relacionales y lógicos.", "duration": "3h", "topics": "{Operadores, Variables}", "icon": "code"},
            {"title": "Semana 3: Proc. Secuenciales", "description": "Tipos de datos y estructuras secuenciales.", "duration": "3h", "topics": "{Tipos de datos, Secuencia}", "icon": "arrow-right"},
            {"title": "Semana 4: Est. Selectivas", "description": "Sentencias if-else y switch.", "duration": "3h", "topics": "{If-Else, Switch}", "icon": "git-branch"},
            {"title": "Semana 5: Estructura For", "description": "Bucles con número de repeticiones definido.", "duration": "3h", "topics": "{Bucle For}", "icon": "repeat"},
            {"title": "Semana 6: Estructura While", "description": "Bucles con entrada controlada.", "duration": "3h", "topics": "{Bucle While}", "icon": "rotate-cw"},
            {"title": "Semana 7: Estructura Do While", "description": "Bucles con salida controlada.", "duration": "3h", "topics": "{Do While}", "icon": "refresh-ccw"},
            {"title": "Semana 8: Examen Parcial", "description": "Evaluación parcial.", "duration": "2h", "topics": "{Examen Parcial}", "icon": "edit-3"},
            {"title": "Semana 9: Vectores", "description": "Arreglos unidimensionales.", "duration": "3h", "topics": "{Vectores, Arreglos}", "icon": "list"},
            {"title": "Semana 10: Matrices", "description": "Arreglos bidimensionales.", "duration": "3h", "topics": "{Matrices, Arreglos 2D}", "icon": "grid"},
            {"title": "Semana 11: Cadenas", "description": "Manipulación de textos y strings.", "duration": "3h", "topics": "{Strings, Cadenas}", "icon": "type"},
            {"title": "Semana 12: Funciones", "description": "Funciones definidas por el usuario.", "duration": "3h", "topics": "{Funciones, Ámbito}", "icon": "box"},
            {"title": "Semana 13: Punteros", "description": "Introducción a punteros.", "duration": "3h", "topics": "{Punteros, Memoria}", "icon": "cpu"},
            {"title": "Semana 14: Parámetros", "description": "Paso por valor y por referencia.", "duration": "3h", "topics": "{Paso por valor, Paso por referencia}", "icon": "sliders"},
            {"title": "Semana 15: Recursividad", "description": "Funciones recursivas.", "duration": "3h", "topics": "{Recursividad, Backtracking}", "icon": "corner-down-left"},
            {"title": "Semana 16: Examen Final", "description": "Evaluación final.", "duration": "2h", "topics": "{Examen Final}", "icon": "file-text"}
        ]
    }
]

for course in courses:
    filename = course["filename"]
    if "csv_name" in course:
        csv_name = course["csv_name"]
    else:
        csv_name = os.path.splitext(filename)[0].replace(" ", "_") + "_learning_path.csv"
        
    csv_path = os.path.join(output_dir, csv_name)
    
    with open(csv_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["curso_id", "title", "description", "duration", "order_index", "topics", "icon"])
        
        for idx, step in enumerate(course["steps"], start=1):
            writer.writerow([
                course["course_id"],
                step["title"],
                step["description"],
                step["duration"],
                idx,
                step["topics"],
                step["icon"]
            ])
    
    print(f"Generated {csv_path}")

print("Done generating CSVs.")
