// LEAD UNI brand logo with gradient text
import Image from "next/image"

/**
 * Logo + wordmark "LEAD UNI" sobre el panel de marca. Usa la clase
 * .brand-wordmark que ya define Luis en el sistema de diseño (Poppins,
 * mayúsculas, tracking ancho) — login.tsx tenía su propia versión manual
 * con una línea divisoria extra que signup.tsx no usa. Se unificó a la
 * versión de signup, que es la que ya consume los tokens correctamente.
 */
export function BrandLogo() {
  return (
    <div className="flex items-center gap-3 mb-12">
      <Image
        src="/Logo_LEAD_UNI.png"
        alt="LEAD UNI"
        width={60}
        height={60}
        priority
        className="drop-shadow-lg"
      />
      <span className="brand-wordmark text-primary-foreground text-xl">LEAD UNI</span>
    </div>
  )
}