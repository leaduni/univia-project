// Catálogos del módulo de donaciones. Las siglas de facultad deben coincidir
// con el set FACULTADES de backend/app/routers/donaciones.py.

export type TipoDonante = "estudiante" | "egresado"

/** Tramos por tipo de donante: un egresado no aporta el mismo rango que un alumno. */
export const PRESETS: Record<TipoDonante, number[]> = {
  estudiante: [1, 2, 5, 10, 20, 50],
  egresado: [30, 50, 100, 200, 300, 500],
}

export const RANGO_TEXTO: Record<TipoDonante, string> = {
  estudiante: "S/1 – S/50",
  egresado: "S/30 – S/500",
}

export const FACULTADES = [
  { sigla: "FC", nombre: "Ciencias" },
  { sigla: "FAUA", nombre: "Arquitectura, Urbanismo y Artes" },
  { sigla: "FIA", nombre: "Ingeniería Ambiental" },
  { sigla: "FIC", nombre: "Ingeniería Civil" },
  { sigla: "FIEE", nombre: "Ingeniería Eléctrica y Electrónica" },
  { sigla: "FIEECS", nombre: "Ingeniería Económica, Estadística y CC.SS." },
  { sigla: "FIGMM", nombre: "Ingeniería Geológica, Minera y Metalúrgica" },
  { sigla: "FIIS", nombre: "Ingeniería Industrial y de Sistemas" },
  { sigla: "FIM", nombre: "Ingeniería Mecánica" },
  { sigla: "FIP", nombre: "Ingeniería de Petróleo" },
  { sigla: "FIQT", nombre: "Ingeniería Química y Textil" },
] as const

export const MONTO_MINIMO = 0.1

export function formatearSoles(valor: number): string {
  return `S/${valor.toFixed(2)}`
}

/** Sin decimales, para rótulos donde el céntimo solo mete ruido. */
export function formatearSolesCorto(valor: number): string {
  return `S/${Math.round(valor).toLocaleString("es-PE")}`
}
