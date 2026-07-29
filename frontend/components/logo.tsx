// Logo de la app en el sidebar — wordmark con degradado de marca
import Image from "next/image"
import { cn } from "@/lib/utils"

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 px-2 py-1", compact && "justify-center px-0")}>
      <Image
        src="/Logo_LEAD_UNI.png"
        alt="LEAD UNI"
        width={28}
        height={28}
        priority
        className="w-7 h-7 shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(217,51,64,0.35)]"
      />
      {!compact && (
        <span className="font-heading text-xl font-bold gradient-brand-text tracking-tight">
          UniVia
        </span>
      )}
    </div>
  )
}
