import { redirect } from "next/navigation"

// Ruta legacy: la landing vive ahora en la raíz (/). Se conserva como alias
// 308 para no romper enlaces/bookmarks que aún apuntan a /inicio.
export default function InicioPage() {
  redirect("/")
}
