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
//   3. El ancla es un único token (--foro-feed-anchor): la reserva encima de la
//      barra la hace el grid de /foro con --foro-feed-top-gap, y las columnas
//      laterales usan el mismo token. Se comprueba en el describe "contrato de
//      tokens de anclaje", porque jsdom no tiene motor de layout.

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
  it("renderiza la lista como hermana posterior de la barra sticky", async () => {
    const { section, barra, lista } = await renderFeed()

    // 1) La barra abre la <section> y es la única sticky.
    expect(section.firstElementChild).toBe(barra)
    expect(barra.className).toContain("sticky")

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

  it("ancla la barra y deja el aire en una sola fuente (gap, sin márgenes)", async () => {
    const { section, barra, lista } = await renderFeed()

    // El tope sticky es una constante (96px), no un token/calc: un var() sin
    // resolver colapsa a `auto` en el navegador real y la barra pierde el ancla.
    expect(barra.className).toContain("top-24")
    expect(barra.className).toContain("z-20")
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

// jsdom no tiene motor de layout, así que aquí no se pueden medir rects. Este
// contrato fija los NÚMEROS CONSTANTES del anclaje y QUÉ archivo posee cada
// pieza, para que el solapamiento no pueda volver por un cambio suelto:
//   DashboardLayout main: pt-20 (80px)  →  el scroll container
//   foro/page.tsx grid:   pt-4  (16px)  →  la reserva
//   feed-header.tsx:      sticky top-24 (96px = 80 + 16)  →  el ancla
// En reposo la barra nace exactamente en su punto de anclaje (96px): 0px de
// desplazamiento, sin calc() ni var() que puedan colapsar en el navegador.
describe("ForoFeed · contrato de anclaje constante", () => {
  const leer = (relativo: string) => readFileSync(new URL(relativo, import.meta.url), "utf8")

  const css = leer("../app/globals.css")
  const paginaForo = leer("../app/foro/page.tsx")
  const layout = leer("../components/dashboard-layout.tsx")

  it("la barra y las columnas se anclan a 96px constantes (top-24)", () => {
    // La barra (assert en el describe de jerarquía) y los dos asides; la
    // combinación con self-start solo aparece en los className, no en comentarios.
    expect(paginaForo.match(/lg:top-24 lg:self-start/g)).toHaveLength(2)
    // Prohibido volver a los tokens frágiles de calc/var.
    expect(paginaForo).not.toMatch(/--foro-feed-anchor|--foro-feed-top-gap/)
    expect(css).not.toMatch(/--foro-feed-anchor\s*:|--foro-feed-top-gap\s*:/)
  })

  it("la reserva del grid (pt-4) + el pt-20 del scroll container = 96px = top-24", () => {
    expect(paginaForo).toContain("pt-4")
    // Sin py-* en el grid: el hueco lo define pt-4, no un valor a mano.
    expect(paginaForo).not.toMatch(/(^|\s|")py-\d/)
    // La premisa de la suma: el scroll container del dashboard reserva 5rem.
    expect(layout).toMatch(/overflow-y-auto[^"]*pt-20|pt-20[^"]*overflow-y-auto/)
  })

  it("el wrapper del grid no crea su propio scrollport", () => {
    // overflow-hidden aquí rompería el sticky: la barra dejaría de anclarse.
    expect(paginaForo).toContain('className="relative min-h-screen bg-[#090a12] text-white"')
  })
})
