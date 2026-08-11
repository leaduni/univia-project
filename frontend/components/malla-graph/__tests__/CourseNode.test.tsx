// Tests de renderizado del nodo de curso (T6–T7 de la spec) usando el
// presentacional CourseNodeInner, sin requerir el contexto de React Flow.
import { describe, expect, test } from "vitest"
import { render, screen } from "@testing-library/react"
import { CourseNodeInner } from "../CourseNode"
import type { CourseNodeData } from "../transformMalla"

function data(partial: Partial<CourseNodeData> = {}): CourseNodeData {
  return {
    id: "1",
    code: "MA-101",
    name: "Matemática I",
    credits: 4,
    status: "completed",
    progreso: 100,
    ciclo: 1,
    prerequisitos: [],
    prerequisitos_faltantes: [],
    prerequisitos_cumplidos: true,
    ...partial,
  }
}

test("curso completado muestra BadgeCheck y etiqueta", () => {
  render(<CourseNodeInner data={data()} />)
  expect(screen.getByTestId("badge-check")).toBeInTheDocument()
  expect(screen.getByText("Completado")).toBeInTheDocument()
})

test("curso bloqueado muestra Lock y etiqueta de bloqueado", () => {
  render(<CourseNodeInner data={data({ status: "locked" })} />)
  expect(screen.getByTestId("lock-icon")).toBeInTheDocument()
  expect(screen.getByText("Bloqueado")).toBeInTheDocument()
})

test("curso en curso muestra su icono y créditos", () => {
  render(<CourseNodeInner data={data({ status: "in_progress", credits: 5 })} />)
  expect(screen.getByTestId("play-circle")).toBeInTheDocument()
  expect(screen.getByText("5 créditos")).toBeInTheDocument()
})

test("nodo con resaltado self aplica estilo inline de selección", () => {
  const { container } = render(<CourseNodeInner data={data({ highlight: "self" })} />)
  expect(container.querySelector("[data-testid='course-node']")).toHaveStyle("border-color: #ffffff")
})