

<!-- === INICIO PAGINA 1 === -->

UNIVERSIDAD NACIONAL DE INGENIERÍA
Facultad de Ingeniería Industrial y de Sistemas
DEPARTAMENTO DE CIENCIAS BÁSICAS

PRÁCTICA CALIFICADA N° 1

GRUPO 1

### Ejercicio 1
1.- Dadas las proposiciones
$$M \equiv [ \neg (\neg p \to \neg q) \leftrightarrow \neg (p \lor q) ] \lor [ p \to (\neg p \land q \land r) ]$$
$$N \equiv [ (p \Delta \neg q) \to r ] \land [ (p \Delta \neg q) \to \neg r ]$$
$$P \equiv \neg \{ [\neg t \to (\neg t \lor r)] \to [\neg p \leftrightarrow \neg q] \}$$
Analice si la proposición
$$M \to (N \leftrightarrow P)$$
es una implicación

### Ejercicio 2
2.- Demostrar que
a) Si $P(A-B) \subset P(B-C)$ entonces $A \subset B$
b) Si $\{ [(A' \Delta (B' \Delta C)) \Delta (A \Delta B)] \Delta B \}' \subset A' \cup B$
entonces $A' \cup (B \cup C)=U$

### Ejercicio 3
3.- Usando elementos, demostrar que
$$\{ [A'-(B'-C)]' \cap [C'-B]' \} \subset A \cap (B \cup C)$$

### Ejercicio 4
4.- Analice si es verdadero o falso, justificando su respuesta
a) $\{ [(A \cup B') \cap (A \cap B)] \cup [A \cap B'] \} \cup (C-A) = A \cup C$
b) Sea $M = [(A \cap B) \cup (C' \cup D' \cup E')] \cap [(A \cap B) \cup (C \cap D \cap E)]$
$N = [(A'-B')-(B-A')] \cup [(A' \cap B') \cup (A-B')]$
Entonces $M \cap N = A \cap B$

GRUPO 2

### Ejercicio 5
1. Simplificar
$(p \leftrightarrow q) \land \{ [\neg r \to \neg (p \Delta q)] \land [r \to \neg (p \Delta q)] \}$

### Ejercicio 6
2. Indicar verdadero o falso, justifique:
a) $r \leftrightarrow (p \to r) \equiv p \lor r$
b) $(A \Delta B) \Delta C = A \Delta (B \Delta C)$

<!-- === FIN PAGINA 1 === -->



<!-- === INICIO PAGINA 2 === -->

### Ejercicio 2
c) $A \Delta B = A' \Delta B'$
d) $(p \to q) \wedge (q \to s) = p \to s$
e) $p \leftrightarrow q \equiv (\sim p \vee q) \wedge (\sim q \vee p)$

### Ejercicio 3
a) Usando elementos de conjunto demostrar
$$[A' - (B'-C')]' \cap (B' \cap C')' \subseteq A \cap (B \cup C)$$
b) Demostrar
$$A \subseteq (B \cup C) \wedge B \subseteq (A \cup C) \Leftrightarrow A \Delta B \subseteq C$$

### Ejercicio 4
Demostrar que:
Si $[D \cap (E \Delta F)] \Delta (D \cap F) = \phi$ entonces $D \subseteq E'$

GRUPO 3

### Ejercicio 1
Analice la veracidad de los siguientes enunciados
a) $A \Delta B \subseteq C \to A \subseteq (B \cup C)$ y $B \subseteq (A \cup C)$

### Ejercicio 2
Simplificar:
$$\{\neg (p \wedge q) \to [((p \to q) \to q) \wedge (\neg p \wedge (q \to p))]\} \wedge [((p \wedge q) \to \neg p) \# ((p \# q) \vee \neg q)]$$
donde $p \# q = \neg p \to \neg q$

### Ejercicio 3
Si la proposición $p$ es falsa, determine el valor de verdad de la siguiente proposición.
$A \leftrightarrow \neg(B \to C)$
donde
$A: [(p \Delta \neg q) \to r] \wedge [(p \Delta \neg q) \to \neg r]$
$B: [\neg (\neg p \to \neg q) \leftrightarrow \neg (p \vee q)] \vee [p \to (\neg p \wedge q \wedge r)]$
$C: \neg p \leftrightarrow \neg q$
Observación:
$m \Delta r \equiv \neg (m \leftrightarrow r)$

### Ejercicio 4
Demostrar usando elementos
$$P(A \cap B) = P(A) \cap P(C)$$

<!-- === FIN PAGINA 2 === -->



<!-- === INICIO PAGINA 3 === -->

GRUPO 4
### Ejercicio 1
a) Simplificar:
$$\{\neg(p \wedge q) \to [\{(p \to q) \wedge [\neg p \wedge (q \to p)]\} \wedge \{(q \to p) \vee \neg q\} \to [(p \wedge q) \to \neg p]]\}$$
b) Determinar si es una implicación $P \to Q$
donde
$$P \equiv (r \to \neg q) \to \neg [((p \to q) \wedge \neg (p \to \neg r))]$$
$$Q \equiv \neg (p \to r) \to [\neg (q \to r) \vee \neg (p \to \neg q)]$$

### Ejercicio 2
a) Para
$$M = [((A \cap B) \cup (C' \cup D' \cup E')) \cap ((A \cap B) \cup (C \cap D \cap E))]$$
$$N = [((A' - B)' - (B - A'))] \cup [(A' \cap B') \cup (A - B')]$$
Demostrar Que $(M \cap N) \subset B$
b) Determinar el valor de verdad, justificando
$$A \cap (B \Delta C) = (A \cap B) \Delta (A \cap C)$$

### Ejercicio 3
Usando elementos, demostrar que
a) Si $A \Delta B \subset C$ entonces $A \subset (B \cup C)$ y $B \subset (A \cup C)$
b) $P(A) \cup P(B) \subset P(A \cup B)$

### Ejercicio 4
Sean $A_1, A_2,...,A_n$ subconjuntos no vacíos de un conjunto universal $\Omega$ tal que se puede definir
$$M_1 = A_1$$
$$M_2 = A_2 - A_1$$
$$\vdots$$
$$M_n = A_n - (M_1 \cup M_2 \cup ... \cup M_{n-1})$$
Demostrar que $P(M_i) \subset P(A_i)$ $i=1,...,n$

GRUPO 5
### Ejercicio 1
Averiguar si es una contradicción
$$\{\neg(p \wedge q) \to [\{(p \to q) \wedge [\neg p \wedge (q \to p)]\} \wedge [(p \wedge q) \to \neg p]\#[(p\#q) \vee \neg q]]\}$$
donde $p\#q \equiv \neg p \to \neg q$

### Ejercicio 2
a) Sean los conjuntos A y B
Si $A \subset B \wedge B \cap C = \phi$ entonces simplifique

<!-- === FIN PAGINA 3 === -->



<!-- === INICIO PAGINA 4 === -->

$$\left\{\left[(A \cap B)^c - B\right] \cap C\right\} \cup \left\{(C-A) \cup (A-B)\right\} \cup \left\{\left[(A^c \cup B)^c \cap (A^c \cap B)\right] - (A \cup C^c)^c\right\}$$
### Ejercicio 1
b) Simplificar
$$\left\{A-[B-(C-A)]\right\} - \left\{A-\left[\left(B-C'\right) \cup (B-C)\right]\right\}$$

### Ejercicio 3
a) Demostrar si $A \cap (B \Delta A)' \subseteq B \Delta (A \Delta C)$ entonces $A \cap (B \Delta A)' \subseteq C$
b) Usando elementos demostrar que
$$\left\{A'-(B'-C)'\right\} \cap (C'-B)' \subseteq \left\{A \cap (B \cup C)\right\}$$

### Ejercicio 4
Dadas las proposiciones
$m = \left[(p \Delta q) \to r\right] \wedge \left[r \to \neg(p \Delta \neg q)\right]$
$n = \neg\left\{\left[\neg p \to (\neg p \vee r)\right] \to (\neg p \leftrightarrow \neg q)\right\}$
$t = \left[\neg(\neg p \to \neg q) \leftrightarrow \neg(p \vee q)\right] \vee \left[p \to (\neg p \wedge q \wedge r)\right]$
La proposición $(m \leftrightarrow n) \leftrightarrow t$ es una tautología?
NOTA: $a \Delta b = \neg(a \leftrightarrow b)$

GRUPO 6

### Ejercicio 1
Analice el valor de las afirmaciones, justificando su respuesta
a) $[A-(B-D)] \cap [A' \Delta (B-D)] = \phi$
b) Si $D=A'-(B \cap C)'$, $C=B'-(A \cup D)'$, $A=(B \cup C)-D$, $B=C'-(A \cup D)'$ entonces $B \cup C = A$, $A \cap D = \phi$, $A \cap B \cap C = \phi$, $B \cup D = \phi$
c) $(A \Delta B) \cap C = (A \cap B) \Delta (B \cap C)$
d) $$\left\{\left[A'-(B'-C)\right]' \cap (C'-B)'\right\} - \left\{A-\left[B-(C-A)\right]\right\} = A \cap B$$

### Ejercicio 2
Usando elementos de conjuntos, demostrar que
a) $A-(B \cap A') = A$
b) $(A \cup B) \cap B' = A \iff A \cap B = \phi$

### Ejercicio 3
Analice si son tautologías. Justificar
a) $$\left[\left[(\neg p \to q) \to \neg(q \to p)\right] \wedge (p \vee q)\right] \vee \neg p \leftrightarrow \left[(\neg p \vee q) \vee (\neg r \wedge \neg p)\right]$$
b) $X \to Y$ donde
$$X = \left[p \wedge (q \wedge r)\right] \vee \left[(p \wedge \neg q) \wedge r\right] \vee \left[\neg q \wedge (\neg p \wedge r)\right]$$
$$Y = \left[(p \vee q) \wedge (\neg p \vee \neg q)\right] \vee \left[(p \wedge q) \wedge (\neg p \wedge \neg q)\right]$$

<!-- === FIN PAGINA 4 === -->

