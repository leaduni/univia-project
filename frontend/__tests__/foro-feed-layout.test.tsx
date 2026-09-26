// Maquetado del feed global del foro (Fase 5).
//
// Cubre la regresión visual del colapso/superposición de la barra de búsqueda y
// filtros ("Buscar en el foro...", "+ Nuevo hilo", Recientes/Comentados/
// Tendencia) sobre la primera publicación:
//
//   1. La barra (FeedHeader) y la lista de publicaciones son HERMANAS dentro de
//      la <section aria-label="Feed del foro">, la lista va DESPUÉS y nunca
//      contiene la barra (los posts se renderizan fuera y debajo).
//   2. La <section> es un flujo en columna (flex flex-col gap-6): barra y lista
//      son hermanas secuenciales y el único aire entre ellas es ese gap (en
//      flex los márgenes no colapsan, así que no se duplica ni desaparece).
//   3. El buscador no es sticky: se desplaza junto a las publicaciones.
//      Solo las columnas laterales conservan el anclaje bajo el header.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { ForoFeed } from "@/components/foro/feed/foro-feed"
import type { FeedRespuesta, Publicacion } from "@/types/foro"

// ── Mocks ──

// jsdom no implementa IntersectionObserver: ForoFeed lo usa para el infinite
// scroll (sentinel al final de la lista).
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

const mockGetFeed = vi.fn()
vi.mock("@/lib/foro-service", () => ({
  foroService: {
    getFeed: (...args: unknown[]) => mockGetFeed(...args),
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => <img src={String(src)} alt={alt ?? ""} />,
}))

// No aportan al maquetado auditado y arrastran AuthProvider / dmService.
vi.mock("@/components/foro/boton-dm", () => ({ BotonDM: () => null }))
vi.mock("@/components/foro/badge-moderador", () => ({ BadgeModerador: () => null }))

// ── Fixtures ──

const PUBLICACION: Publicacion = {
  id: 1,
  seccion_id: 7,
  autor_perfil_id: "perfil-1",
  autor_nombre: "Estudiante Nueva",
  titulo: "Prueba - Soy nueva",
  cuerpo: "Mi primer hilo en el foro.",
  tags: [],
  estado: "abierta",
  created_at: new Date().toISOString(),
  num_comentarios: 0,
  num_votos: 0,
  mi_voto: 0,
  num_vistas: 0,
  portada_url: null,
  tipo_contenido: "texto",
  guardado: false,
}

function feedCon(publicaciones: Publicacion[]): FeedRespuesta {
  return { publicaciones, siguiente_cursor: null, total: publicaciones.length }
}

/** Monta el feed y espera a que la primera página (o el estado vacío) pinte. */
async function renderFeed(publicaciones: Publicacion[] = [PUBLICACION]) {
  mockGetFeed.mockResolvedValue(feedCon(publicaciones))
  render(<ForoFeed />)

  // La barra se monta de inmediato; la lista depende del fetch.
  await screen.findByLabelText("Buscar en el foro")
  if (publicaciones.length > 0) await screen.findByRole("article")
  else await screen.findByText("Aún no hay hilos aquí")

  const section = screen.getByLabelText("Feed del foro")
  const barra = section.firstElementChild as HTMLElement
  return { section, barra, lista: barra.nextElementSibling as HTMLElement }
}

beforeEach(() => {
  mockGetFeed.mockReset()
})

describe("ForoFeed · jerarquía del maquetado", () => {
  it("renderiza el buscador antes de los posts sin una barra flotante que los tape", async () => {
    const { section, barra, lista } = await renderFeed()

    // El buscador ocupa su lugar en el flujo y se desplaza con la lista.
    expect(section.firstElementChild).toBe(barra)
    expect(barra.className).not.toMatch(/\b(sticky|fixed|absolute)\b/)

    // 2) Solo dos hijos: barra + contenedor de la lista (el modal cerrado
    //    devuelve null).
    expect(section.children).toHaveLength(2)

    // 3) La lista NO contiene la barra (nunca anidada dentro de ella).
    expect(lista).toBeTruthy()
    expect(lista.contains(barra)).toBe(false)

    // 4) Las publicaciones se renderizan FUERA de la barra...
    expect(barra.querySelector("article")).toBeNull()
    // ...y dentro de la lista, que va después de la barra.
    expect(lista.querySelectorAll("article")).toHaveLength(1)
  })

  it("muestra la primera publicación del feed", async () => {
    await renderFeed()
    expect(screen.getByText("Prueba - Soy nueva")).toBeInTheDocument()
  })

  it("mantiene la separación entre el buscador y la lista sin desplazar la barra", async () => {
    const { section, barra, lista } = await renderFeed()

    expect(barra.className).not.toMatch(/\b(top-|sticky|fixed)/)
    // El aire NO sale de un margen de la barra: sale del gap de la sección.
    expect(barra.className).not.toMatch(/(^|\s)m[btxy]?-/)
    // La reserva del ancla ya no vive en el feed (la hace el grid de /foro) y la
    // sección es un flujo en columna explícito: sin colapso de márgenes.
    expect(section.className).toContain("flex-col")
    expect(section.className).toContain("gap-6")
    expect(section.className).not.toMatch(/(^|\s)pt-/)
    // Lista: separación entre tarjetas con gap, no con space-y-* ni márgenes.
    expect(lista.className).toContain("flex-col")
    expect(lista.className).toContain("gap-4")
    expect(lista.className).not.toMatch(/(^|\s)space-y-/)
    expect(lista.className).not.toMatch(/(^|\s)mt-/)
  })
})

describe("ForoFeed · estados de la lista", () => {
  it("mantiene la barra como primer hijo cuando no hay publicaciones", async () => {
    const { section, barra } = await renderFeed([])
    expect(section.firstElementChild).toBe(barra)
    expect(screen.getByText("Aún no hay hilos aquí")).toBeInTheDocument()
    expect(screen.queryByRole("article")).not.toBeInTheDocument()
  })
})

// jsdom no mide layout: aquí se conserva el contrato de las columnas laterales.
describe("ForoFeed · anclaje de las columnas laterales", () => {
  const leer = (relativo: string) => readFileSync(new URL(relativo, import.meta.url), "utf8")

  const css = leer("../app/globals.css")
  const paginaForo = leer("../app/foro/page.tsx")
  const layout = leer("../components/dashboard-layout.tsx")

  it("las columnas laterales dejan 16px sobre el espacio reservado por el layout", () => {
    expect(paginaForo.match(/lg:top-4 lg:self-start/g)).toHaveLength(2)
    // Prohibido volver a los tokens frágiles de calc/var.
    expect(paginaForo).not.toMatch(/--foro-feed-anchor|--foro-feed-top-gap/)
    expect(css).not.toMatch(/--foro-feed-anchor\s*:|--foro-feed-top-gap\s*:/)
  })

  it("el layout reserva el encabezado y el grid mantiene un margen inicial de 16px", () => {
    expect(paginaForo).toContain("pt-4")
    // Sin py-* en el grid: el hueco lo define pt-4, no un valor a mano.
    expect(paginaForo).not.toMatch(/(^|\s|")py-\d/)
    // La premisa de la suma: el scroll container del dashboard reserva 5rem.
    expect(layout).toMatch(/overflow-y-auto[^"]*pt-20|pt-20[^"]*overflow-y-auto/)
  })

  it("el wrapper del grid no crea su propio scrollport", () => {
    // Los laterales comparten el scrollport del dashboard.
    expect(paginaForo).toContain('className="relative min-h-screen bg-[#090a12] text-white"')
  })
})
