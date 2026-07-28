// LEAD UNI brand logo + wordmark
import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Logo y wordmark "LEAD UNI" del panel de marca.
 *
 * Login y signup tenían este bloque duplicado e idéntico, escribiendo el
 * wordmark a mano con `font-sans`. La guía de tokens de la Fase 1 pide usar
 * la clase `.brand-wordmark`, que aplica Poppins (font-heading), mayúsculas
 * y el tracking de marca. Aquí queda en un solo lugar.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 z-10 py-2", className)}>
      <Image
        src="/Logo_LEAD_UNI.png"
        alt="LEAD UNI"
        width={48}
        height={48}
        priority
        className="w-12 h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 object-contain drop-shadow-[0_4px_16px_rgba(217,51,64,0.4)]"
      />
      <span className="brand-wordmark text-foreground text-lg xl:text-xl 2xl:text-2xl select-none">
        LEAD UNI
      </span>
    </div>
  )
}
