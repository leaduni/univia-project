// Tests del header del grafo: stats, resumen y filtrado por leyenda.
// La lógica de resaltado por hover se cubre de forma determinista en
// transformMalla.test.ts (resolveHighlight/resolveEdgePresentation); aquí no
// se renderiza React Flow completo porque su viewport no es medible en jsdom.
import { describe, expect, test, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MallaGraphHeader } from "../MallaGraphHeader"
import type { MallaStats } from "../transformMalla"

const stats: MallaStats = {
  aprobadosCR: 12,
  enCursoCR: 3,
  totalCR: 30,
  porcentaje: 40,
  totalCursos: 8,
  conteoPorEstado: { completed: 3, in_progress: 1, available: 2, locked: 2 },
}

test("header muestra porcentaje, stats y resumen de cursos/créditos", () => {
  render(<MallaGraphHeader stats={stats} avance={null} filter={null} onFilterChange={() => {}} />)

  expect(screen.getByText("40%")).toBeInTheDocument()
  expect(screen.getByText("12")).toBeInTheDocument()
  // "3" aparece como stat "en curso CR" y como conteo de completados.
  expect(screen.getAllByText("3")).toHaveLength(2)
  expect(screen.getByText("8")).toBeInTheDocument()
  expect(screen.getByText("Cursos")).toBeInTheDocument()
  expect(screen.getByText("Créditos")).toBeInTheDocument()
  // "30" aparece dos veces: stat total CR y resumen de créditos.
  expect(screen.getAllByText("30")).toHaveLength(2)
})

test("el avance oficial (RF-07) tiene prioridad sobre el calculado", () => {
  render(
    <MallaGraphHeader
      stats={stats}
      avance={{ porcentaje_avance: 55, creditos_totales: 30, creditos_aprobados: 0, creditos_en_curso: 0, creditos_restantes: 0, cursos_aprobados: 0, cursos_en_curso: 0, cursos_totales: 0 }}
      filter={null}
      onFilterChange={() => {}}
    />,
  )
  expect(screen.getByText("55%")).toBeInTheDocument()
  expect(screen.queryByText("40%")).not.toBeInTheDocument()
})

test("leyenda notifica el filtro seleccionado", () => {
  const onFilterChange = vi.fn()
  render(<MallaGraphHeader stats={stats} avance={null} filter={null} onFilterChange={onFilterChange} />)

  fireEvent.click(screen.getByText("Completado"))
  expect(onFilterChange).toHaveBeenCalledWith("completed")
})

test("clic en un filtro activo lo desactiva", () => {
  const onFilterChange = vi.fn()
  render(<MallaGraphHeader stats={stats} avance={null} filter="locked" onFilterChange={onFilterChange} />)

  const boton = screen.getByText("Bloqueado").closest("button")!
  expect(boton).toHaveAttribute("aria-pressed", "true")

  fireEvent.click(boton)
  expect(onFilterChange).toHaveBeenCalledWith(null)
})