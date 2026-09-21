// Prefetching proactivo por hover: al pasar el mouse sobre un enlace de
// navegación se calienta la caché SWR (leerOCache en api-service / servicios)
// de la ruta destino, de modo que el clic renderice con datos ya disponibles.
//
// Cada llamado es fire-and-forget y seguro: si ya hay dato en caché no se
// descarga nada (stale-while-revalidate), y un fallo se descarta en silencio.

import { apiService } from "./api-service"
import { dmService } from "./dm-service"
import { foroService } from "./foro-service"

const IGNORAR = () => {}

function correr(promesa: Promise<unknown>): void {
  promesa.catch(IGNORAR)
}

export function prefetchRuta(href: string): void {
  if (!href) return

  if (href.startsWith("/dashboard")) {
    correr(apiService.getDashboardSummary())
    correr(apiService.getCursosActivos())
    correr(apiService.getAvanceCarrera())
    return
  }

  if (href.startsWith("/malla")) {
    correr(apiService.getMalla())
    correr(apiService.getAvanceCarrera())
    return
  }

  if (href.startsWith("/recursos")) {
    correr(apiService.getRecursos({}))
    return
  }

  if (href.startsWith("/mensajes")) {
    correr(dmService.getConversaciones())
    return
  }

  if (href.startsWith("/foro")) {
    correr(foroService.getSecciones())
    return
  }

  if (href.startsWith("/perfil")) {
    correr(apiService.getProfile())
    return
  }
}