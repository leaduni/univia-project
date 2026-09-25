// Banco de exámenes y recursos complementarios
import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { RecursosAlianza, type CatalogItem } from "@/components/recursos/recursos-alianza"
import { fetchSacuCatalog, type SacuCatalog } from "@/lib/sacu-api"
// PAUSADO POR ALIANZA SACU: el banco propio (RecursosBiblioteca) queda
// inactivo, no eliminado. Si la alianza termina, restaurar el import y el
// render de abajo para volver al banco local.
// import { RecursosBiblioteca } from "@/components/recursos-biblioteca"

export default async function RecursosPage() {
  // El catálogo de SACU se descarga en el servidor (Server Component): así se
  // esquiva el bloqueo de CORS del navegador y se aprovecha la caché de Next
  // (revalidate). Si falla, la landing recibe null y muestra su estado de
  // error sin colapsar.
  let catalog: SacuCatalog | null = null
  try {
    catalog = await fetchSacuCatalog()
  } catch (err) {
    console.error("No se pudo cargar el catálogo de SACU desde el servidor:", err)
  }

  return (
    <DashboardLayout>
      {/* RecursosBiblioteca lee ?tipo= con useSearchParams, que en el App
          Router exige un límite de Suspense. Se conserva el Suspense para
          reactivarlo sin fricción. */}
      <Suspense
        fallback={
          <div className="p-6">
            <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />
          </div>
        }
      >
        <RecursosAlianza initialCatalog={(catalog?.courses ?? []) as unknown as CatalogItem[]} />
        {/* <RecursosBiblioteca /> — ver nota "PAUSADO POR ALIANZA SACU" arriba. */}
      </Suspense>
    </DashboardLayout>
  )
}
