// En la UNI los ciclos se nombran en números romanos (I, II, ... X).
const ROMANOS = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
]

export const aRomano = (n: number): string => ROMANOS[n - 1] ?? String(n)

/** Tope de cursos por ciclo. Espejo de `MAX_CURSOS_INSCRITOS` del backend. */
export const MAX_CURSOS_INSCRITOS = 12
