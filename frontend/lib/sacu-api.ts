// Alianza UniVia x SACU: acceso al catálogo público del repositorio externo.
// El catálogo de SACU es un JSON estático que ellos publican en su propio
// hosting (Netlify); no requiere auth y se regenera cuando escanean su Drive.

export const SACU_REPO_URL = "https://sacu.netlify.app/repositorio"
export const SACU_CATALOG_URL = "https://sacu.netlify.app/data/courses/index.json"

export interface SacuCurso {
  course_id: string
  course_name: string
  /** ID de la carpeta de Google Drive (no se usa para deep links). */
  id: string
  scanned_at: string
  total_files: number
}

export interface SacuCatalog {
  total_courses: number
  total_files: number
  scanned_at: string
  courses: SacuCurso[]
}

export interface SacuStats {
  totalCursos: number
  totalArchivos: number
  actualizadoEn: string | null
}

/** Deep link al curso dentro del repositorio de SACU (enruta por código). */
export function buildSacuCursoUrl(curso: SacuCurso): string {
  return `${SACU_REPO_URL}?curso=${encodeURIComponent(curso.course_id)}`
}

/**
 * Descarga el catálogo completo de SACU. No hay fallback con datos ficticios:
 * si la red falla, lanza el error y la vista decide qué mostrar.
 */
export async function fetchSacuCatalog(): Promise<SacuCatalog> {
  const response = await fetch(SACU_CATALOG_URL, {
    // El índice se regenera en cada escaneo de SACU; revalidar cada hora es
    // suficiente y evita pegarle a su hosting en cada render.
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`SACU respondió ${response.status} al pedir el catálogo`)
  }

  const data = (await response.json()) as SacuCatalog

  if (!Array.isArray(data.courses)) {
    throw new Error("El catálogo de SACU llegó con una forma inesperada")
  }

  return data
}

/**
 * Estadísticas globales. Se leen los totales que SACU publica en la raíz del
 * JSON y, por si algún día faltan, se respaldan en el cálculo desde courses[].
 */
export function getSacuStats(catalog: SacuCatalog): SacuStats {
  const totalCursos = catalog.total_courses ?? catalog.courses.length
  const totalArchivos =
    catalog.total_files ?? catalog.courses.reduce((acc, c) => acc + (c.total_files || 0), 0)

  return {
    totalCursos,
    totalArchivos,
    actualizadoEn: catalog.scanned_at ?? null,
  }
}

/** "Cálculo_diferencial" -> "Cálculo diferencial" (para mostrar y buscar). */
export function nombreVisible(curso: SacuCurso): string {
  return curso.course_name.replace(/_/g, " ").trim()
}

/** Normaliza acentos/minúsculas para que "calculo" encuentre "Cálculo". */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

/** Filtra el catálogo localmente por nombre o código de curso. */
export function buscarCursos(catalog: SacuCatalog, consulta: string, limite = 8): SacuCurso[] {
  const q = normalizar(consulta).trim()
  if (!q) return []

  const coinciden = (curso: SacuCurso) =>
    normalizar(nombreVisible(curso)).includes(q) || normalizar(curso.course_id).includes(q)

  const exactosPorCodigo: SacuCurso[] = []
  const empiezan: SacuCurso[] = []
  const contienen: SacuCurso[] = []

  for (const curso of catalog.courses) {
    if (!coinciden(curso)) continue
    const codigo = normalizar(curso.course_id)
    const nombre = normalizar(nombreVisible(curso))
    if (codigo === q || nombre === q) exactosPorCodigo.push(curso)
    else if (nombre.startsWith(q) || codigo.startsWith(q)) empiezan.push(curso)
    else contienen.push(curso)
  }

  // Los más relevantes primero; dentro de cada grupo, primero los que tienen
  // más material (mejor experiencia al llegar al repositorio).
  const porCantidad = (a: SacuCurso, b: SacuCurso) => b.total_files - a.total_files
  return [...exactosPorCodigo.sort(porCantidad), ...empiezan.sort(porCantidad), ...contienen.sort(porCantidad)].slice(
    0,
    limite,
  )
}
