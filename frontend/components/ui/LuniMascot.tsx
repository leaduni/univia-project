// Mascota oficial del asistente (Luni): único punto de verdad del mapeo
// variante -> asset de /public, tamaño y animación base.
//
// Puramente presentacional: no conoce el chat ni el onboarding. Quien la usa
// decide la variante según su estado (escribiendo, pensando, éxito...).
// Sin "use client": no usa hooks ni handlers, así que también puede
// renderizarse desde Server Components.
import Image from "next/image"
import { cn } from "@/lib/utils"

/** Estados narrativos de Luni. Cada uno apunta a un PNG de `public/`. */
export type LuniVariant =
  | "float" // flotando   -> Hero / FAB del chat
  | "idle" // reposo      -> avatares, cabecera del panel
  | "wave" // saludando   -> onboarding, bienvenida
  | "thinking" // pensando   -> mientras la IA responde
  | "success" // inspirado  -> feedback positivo
  | "explaining" // explicando -> estado vacío, tips
  | "listening" // escuchando -> el estudiante escribe

/** Tamaños con nombre; un número se interpreta como altura en px. */
export type LuniSize = "sm" | "md" | "lg" | number

type LuniAnimacion = "luni-float" | "luni-breathe"

interface LuniAsset {
  src: string
  /** Dimensiones intrínsecas del PNG: `next/image` las exige y evitan el
   *  salto de layout al cargar. El alto VISIBLE lo fija `size`. */
  width: number
  height: number
  alt: string
  /** Movimiento en reposo de la variante. */
  animation: LuniAnimacion
}

/**
 * El alto intrínseco es 941px en venus1/2/3 y ~520px en el resto, pero el
 * ANCHO cambia entre variantes. Por eso `size` manda el alto y el ancho va en
 * auto: así Luni nunca se deforma al cambiar de variante dentro del mismo
 * contenedor (ej. `idle` -> `thinking` en el avatar de un mensaje).
 */
const VARIANTES: Record<LuniVariant, LuniAsset> = {
  float: {
    src: "/venus1.png",
    width: 576,
    height: 941,
    alt: "Luni flotando",
    animation: "luni-float",
  },
  idle: {
    src: "/venus2.png",
    width: 466,
    height: 941,
    alt: "Luni",
    animation: "luni-breathe",
  },
  wave: {
    src: "/venus3.png",
    width: 510,
    height: 941,
    alt: "Luni saludando",
    animation: "luni-breathe",
  },
  thinking: {
    src: "/curioso.png",
    width: 350,
    height: 524,
    alt: "Luni pensando",
    animation: "luni-breathe",
  },
  success: {
    src: "/inspirado.png",
    width: 429,
    height: 532,
    alt: "Luni celebrando",
    animation: "luni-breathe",
  },
  explaining: {
    src: "/explicando.png",
    width: 553,
    height: 510,
    alt: "Luni explicando",
    animation: "luni-breathe",
  },
  listening: {
    src: "/escuchando.png",
    width: 416,
    height: 535,
    alt: "Luni escuchando",
    animation: "luni-breathe",
  },
}

// Las clases se declaran literales: Tailwind no genera utilidades armadas por
// template literal (mismo motivo documentado en chat-panel.tsx).
const CLASE_ANIMACION: Record<LuniAnimacion, string> = {
  "luni-float": "animate-luni-float",
  "luni-breathe": "animate-luni-breathe",
}

const TAMANOS: Record<Exclude<LuniSize, number>, number> = {
  sm: 48,
  md: 96,
  lg: 160,
}

export interface LuniMascotProps {
  variant: LuniVariant
  /** `sm`=48px · `md`=96px · `lg`=160px · número libre = altura en px. */
  size?: LuniSize
  /**
   * Flotación/respiración continua. Apagado por defecto a propósito: en
   * avatares de mensaje y listas el movimiento permanente distrae y consume
   * CPU. El FAB del chat y el onboarding lo encienden explícitamente.
   */
  animated?: boolean
  /** Sombra elíptica bajo Luni, sincronizada con la flotación. */
  shadow?: boolean
  /** Texto alternativo para lectores de pantalla. `null` = decorativa. */
  alt?: string | null
  /** Precarga la imagen (equivalente a `priority`, deprecado en Next 16). */
  preload?: boolean
  className?: string
}

export function LuniMascot({
  variant,
  size = "md",
  animated = false,
  shadow = false,
  alt,
  preload = false,
  className,
}: LuniMascotProps) {
  const asset = VARIANTES[variant]
  const altura = typeof size === "number" ? size : TAMANOS[size]
  // Dimensiones de la sombra calculadas en px y no en %: un `h-[5%]` dentro de
  // un padre de alto automático resolvería a `auto` y desaparecería.
  const sombraAncho = Math.round(altura * 0.55)
  const sombraAlto = Math.max(4, Math.round(altura * 0.05))

  return (
    <span
      data-slot="luni-mascot"
      data-variant={variant}
      data-size={altura}
      className={cn("relative inline-flex shrink-0 items-end justify-center", className)}
    >
      {shadow && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-0 rounded-[50%] bg-black/40 blur-[6px]",
            animated && "animate-luni-shadow motion-reduce:animate-none",
          )}
          style={{ width: sombraAncho, height: sombraAlto }}
        />
      )}

      <Image
        src={asset.src}
        alt={alt === null ? "" : (alt ?? asset.alt)}
        width={asset.width}
        height={asset.height}
        preload={preload}
        sizes={`${altura}px`}
        style={{ height: altura }}
        className={cn(
          "w-auto select-none",
          animated && CLASE_ANIMACION[asset.animation],
          "motion-reduce:animate-none",
        )}
      />
    </span>
  )
}
