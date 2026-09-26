import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { BarraIA } from "@/components/agenda/barra-ia"
import { AddCourseSectionModal } from "@/components/agenda/AddCourseSectionModal"
import type { CalendarioEvento } from "@/components/agenda/calendar-grid"

const mocks = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }))
vi.mock("@/lib/api-service", () => ({ fetchWithAuth: mocks.fetchWithAuth }))

const file = new File(["%PDF horario"], "horario.pdf", { type: "application/pdf" })
const event = {
  id: 41, titulo: "BMA02 - Teoría", etiqueta_id: 3, fecha_iso: "2026-09-21",
  hora_inicio: 10, duracion: 2, todo_el_dia: false, recurrencia: "weekly",
}
function response(body: unknown, ok = true) { return { ok, json: async () => body } }

function ImportFlow({ onAddEvents }: { onAddEvents: (events: CalendarioEvento[]) => void }) {
  const [pdf, setPdf] = useState<File | null>(null)
  return <>
    <BarraIA onImportSchedule={setPdf} />
    {pdf && <AddCourseSectionModal initialFile={pdf} onClose={() => setPdf(null)} etiquetas={[]} semesterStart="2026-09-21" onAddEvents={onAddEvents} />}
  </>
}

function attachPdf(onAddEvents = vi.fn()) {
  render(<ImportFlow onAddEvents={onAddEvents} />)
  fireEvent.change(screen.getByLabelText("Adjuntar horario en PDF"), { target: { files: [file] } })
  return onAddEvents
}

beforeEach(() => {
  localStorage.clear()
  mocks.fetchWithAuth.mockReset()
  mocks.fetchWithAuth.mockImplementation(async () => response([]))
})

describe("PDF adjunto desde Pregúntale a UniVia", () => {
  it("envía el archivo al lector y añade los bloques una vez como eventos ya persistidos", async () => {
    mocks.fetchWithAuth.mockImplementation(async (url: string) => response(url.includes("parse-matricula")
      ? { eventos_creados: [event], cursos_detectados: [], message: "Se creó 1 bloque horario." }
      : []))
    const onAddEvents = attachPdf()
    expect(await screen.findByText("horario.pdf")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Analizar e Inscribir" }))
    await screen.findByText("Éxito: Se creó 1 bloque horario.")
    expect(screen.queryByText("Analizando cursos y horarios...")).not.toBeInTheDocument()
    expect(onAddEvents).toHaveBeenCalledTimes(1)
    expect(onAddEvents).toHaveBeenCalledWith([expect.objectContaining({ id: "41", fechaISO: "2026-09-21", horaInicio: 10, duracion: 2, recurrencia: "Cada semana", __persistido: true })])
    const uploads = mocks.fetchWithAuth.mock.calls.filter(([url]) => url.includes("parse-matricula"))
    expect(uploads).toHaveLength(1)
    expect(uploads[0][1].body.get("file")).toBe(file)
    fireEvent.click(screen.getByRole("button", { name: "Ver mi horario" }))
    expect(screen.queryByText("horario.pdf")).not.toBeInTheDocument()
  })

  it("no anuncia éxito ni agrega eventos cuando el lector no encuentra horarios", async () => {
    mocks.fetchWithAuth.mockImplementation(async (url: string) => response(url.includes("parse-matricula")
      ? { eventos_creados: [], cursos_detectados: [], message: "0 bloques" }
      : []))
    const onAddEvents = attachPdf()
    fireEvent.click(await screen.findByRole("button", { name: "Analizar e Inscribir" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("No se detectaron bloques de horario")
    expect(onAddEvents).not.toHaveBeenCalled()
    expect(screen.getByText("horario.pdf")).toBeInTheDocument()
  })

  it("muestra el error del servidor y permite volver a intentar con el mismo PDF", async () => {
    mocks.fetchWithAuth.mockImplementation(async (url: string) => url.includes("parse-matricula")
      ? response({ detail: "Error al leer el PDF." }, false)
      : response([]))
    attachPdf()
    fireEvent.click(await screen.findByRole("button", { name: "Analizar e Inscribir" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Error al leer el PDF.")
    await waitFor(() => expect(screen.getByRole("button", { name: "Analizar e Inscribir" })).toBeEnabled())
    fireEvent.click(screen.getByRole("button", { name: "Analizar e Inscribir" }))
    await waitFor(() => expect(mocks.fetchWithAuth.mock.calls.filter(([url]) => url.includes("parse-matricula"))).toHaveLength(2))
  })

  it("rechaza un adjunto que no sea PDF y no lo envía al chat", () => {
    const onImportSchedule = vi.fn()
    render(<BarraIA onImportSchedule={onImportSchedule} />)
    fireEvent.change(screen.getByLabelText("Adjuntar horario en PDF"), { target: { files: [new File(["imagen"], "horario.png", { type: "image/png" })] } })
    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona un PDF")
    expect(onImportSchedule).not.toHaveBeenCalled()
  })
})
