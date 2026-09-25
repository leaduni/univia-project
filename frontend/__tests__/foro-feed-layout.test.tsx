// Maquetado del feed global del foro (Fase 5).
//
// Cubre la regresión visual del colapso/superposición de la barra de búsqueda y
// filtros ("Buscar en el foro...", "+ Nuevo hilo", Recientes/Comentados/
// Tendencia) sobre la primera publicación:
//
//   1. La barra (FeedHeader) y la lista de publicaciones son HERMANAS dentro de
//      la <section aria-label="Feed del foro">, la lista va DESPUÉS y nunca
//      contiene la barra (los posts se renderizan fuera y debajo).
//   2. El hueco reservado encima de la barra (--foro-feed-top-gap) compensa la
//      diferencia entre su tope sticky (--foro-feed-sticky-top) y el pt-20
//      (5rem) del scroll container de DashboardLayout. Si esa resta no cuadra,
//      position: sticky desplaza la barra fuera de su hueco y tapa la primera
//      tarjeta.
//   3. El aire entre barra y lista tiene una sola fuente (mb-6 del FeedHeader).

import { describe, it, expect, vi, beforeEach } from "vitest"
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

  it("reserva encima de la barra el hueco que compensa su tope sticky", async () => {
    const { section, barra, lista } = await renderFeed()

    expect(barra.className).toContain("top-[var(--foro-feed-sticky-top)]")
    expect(barra.className).toContain("mb-6")
    // El hueco es --foro-feed-sticky-top menos el pt-20 (5rem) del scroll
    // container de DashboardLayout; sin él, el sticky se desplaza 16px.
    expect(section.className).toContain("pt-[var(--foro-feed-top-gap)]")
    // Una sola fuente de aire: mb-6 en la barra, sin mt-* duplicado en la lista.
    expect(lista.className).toContain("space-y-4")
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
