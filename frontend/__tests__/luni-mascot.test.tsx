// La mascota Luni es un mapeo puro de variante -> asset: si un PNG cambia de
// nombre o un tamaño se desalinea, el chat y el onboarding muestran la cara
// equivocada del asistente sin que nada falle en tiempo de compilación. Estas
// pruebas fijan ese contrato.
import { describe, expect, test } from "vitest"
import { render } from "@testing-library/react"
import { LuniMascot, type LuniVariant } from "@/components/ui/LuniMascot"

/** <img> que renderiza next/image dentro del wrapper. */
function obtenerImagen(container: HTMLElement): HTMLImageElement {
  const img = container.querySelector("img")
  if (!img) throw new Error("LuniMascot no renderizó una imagen")
  return img
}

function obtenerRaiz(container: HTMLElement): HTMLElement {
  const raiz = container.querySelector<HTMLElement>('[data-slot="luni-mascot"]')
  if (!raiz) throw new Error("LuniMascot no renderizó su contenedor")
  return raiz
}

// next/image reescribe el src a /_next/image?url=%2Fvenus1.png&w=...: por eso
// se comprueba que el nombre del archivo esté presente y no una igualdad.
const ASSET_POR_VARIANTE: Record<LuniVariant, string> = {
  float: "venus1.png",
  idle: "venus2.png",
  wave: "venus3.png",
  thinking: "curioso.png",
  success: "inspirado.png",
  explaining: "explicando.png",
  listening: "escuchando.png",
}

describe("mapeo de variantes", () => {
  test.each(Object.entries(ASSET_POR_VARIANTE))(
    "la variante %s usa %s",
    (variante, archivo) => {
      const { container } = render(<LuniMascot variant={variante as LuniVariant} />)

      expect(obtenerImagen(container).src).toContain(archivo)
      expect(obtenerRaiz(container).dataset.variant).toBe(variante)
    },
  )
})

describe("tamaños", () => {
  test.each([
    ["sm", 48],
    ["md", 96],
    ["lg", 160],
  ] as const)("el tamaño %s mide %ipx de alto", (size, esperado) => {
    const { container } = render(<LuniMascot variant="idle" size={size} />)

    expect(obtenerRaiz(container).dataset.size).toBe(String(esperado))
    expect(obtenerImagen(container).style.height).toBe(`${esperado}px`)
  })

  test("un número se interpreta como altura en px (slot de avatar de mensaje)", () => {
    const { container } = render(<LuniMascot variant="idle" size={28} />)

    expect(obtenerRaiz(container).dataset.size).toBe("28")
    expect(obtenerImagen(container).style.height).toBe("28px")
  })

  test("md es el tamaño por defecto", () => {
    const { container } = render(<LuniMascot variant="idle" />)

    expect(obtenerRaiz(container).dataset.size).toBe("96")
  })

  test("el ancho queda en auto para no deformar el PNG", () => {
    // Los 7 assets tienen relación de aspecto distinta (0.50 a 1.08): fijar el
    // alto y dejar el ancho en auto es justo lo que evita el estirón.
    const { container } = render(<LuniMascot variant="wave" size="sm" />)

    expect(obtenerImagen(container).className).toContain("w-auto")
  })
})

describe("animaciones", () => {
  test("sin `animated` no se cuelga ninguna clase de animación", () => {
    const { container } = render(<LuniMascot variant="float" />)

    expect(obtenerImagen(container).className).not.toContain("animate-luni-")
  })

  test("'float' animada usa la flotación", () => {
    const { container } = render(<LuniMascot variant="float" animated />)

    expect(obtenerImagen(container).className).toContain("animate-luni-float")
  })

  test("el resto de variantes animadas respiran", () => {
    const { container } = render(<LuniMascot variant="thinking" animated />)

    expect(obtenerImagen(container).className).toContain("animate-luni-breathe")
  })

  test("siempre se puede apagar con prefers-reduced-motion", () => {
    const { container } = render(<LuniMascot variant="float" animated />)

    expect(obtenerImagen(container).className).toContain("motion-reduce:animate-none")
  })
})

describe("sombra", () => {
  test("no se pinta por defecto", () => {
    const { container } = render(<LuniMascot variant="idle" />)

    expect(container.querySelector("[aria-hidden='true']")).toBeNull()
  })

  test("con `shadow` aparece decorativa, animada y sin capturar el clic", () => {
    const { container } = render(<LuniMascot variant="float" size={160} animated shadow />)
    const sombra = container.querySelector<HTMLElement>("[aria-hidden='true']")

    expect(sombra).not.toBeNull()
    expect(sombra!.className).toContain("pointer-events-none")
    expect(sombra!.className).toContain("animate-luni-shadow")
    // Alto proporcional al de Luni: 160 * 0.05 = 8px.
    expect(sombra!.style.height).toBe("8px")
  })

  test("una sombra estática no anima", () => {
    const { container } = render(<LuniMascot variant="idle" shadow />)
    const sombra = container.querySelector<HTMLElement>("[aria-hidden='true']")

    expect(sombra!.className).not.toContain("animate-luni-shadow")
  })
})

describe("accesibilidad y composición", () => {
  test("por defecto describe la variante", () => {
    const { container } = render(<LuniMascot variant="listening" />)

    expect(obtenerImagen(container).getAttribute("alt")).toBe("Luni escuchando")
  })

  test("alt=null la marca decorativa", () => {
    const { container } = render(<LuniMascot variant="idle" alt={null} />)

    expect(obtenerImagen(container).getAttribute("alt")).toBe("")
  })

  test("un alt propio gana sobre el de la variante", () => {
    const { container } = render(<LuniMascot variant="idle" alt="Tu asistente" />)

    expect(obtenerImagen(container).getAttribute("alt")).toBe("Tu asistente")
  })

  test("className se fusiona con las clases base", () => {
    const { container } = render(<LuniMascot variant="idle" className="mb-2" />)
    const raiz = obtenerRaiz(container)

    expect(raiz.className).toContain("mb-2")
    expect(raiz.className).toContain("relative")
  })
})
