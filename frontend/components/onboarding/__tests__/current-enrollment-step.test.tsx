// Regresión del onboarding de primer ciclo: los cursos que el estudiante viene
// a marcar como "los que llevo ahora" no pueden salir declarados como aprobados.
// El backend rechaza con 400 cualquier curso que llegue en las dos listas, y ese
// error aparecía recién en el último paso, sin forma de corregirlo desde la UI.
import { describe, expect, test, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CurrentEnrollmentStep } from "../current-enrollment-step"
import { apiService } from "@/lib/api-service"
import type { OnboardingData } from "@/types/onboarding"

vi.mock("@/lib/api-service", () => ({
  apiService: { getEnvironmentCursos: vi.fn() },
}))

const curso = (id: number, ciclo: number, status = "available") => ({
  id,
  code: `C${id}`,
  name: `Curso ${id}`,
  credits: 3,
  ciclo,
  carrera_id: 1,
  prerrequisito_ids: [],
  status,
})

const base: OnboardingData = { career: 1, semester: 1, cursosInscritos: [] }

const renderStep = (data: OnboardingData, onNext = vi.fn()) => {
  render(
    <CurrentEnrollmentStep
      data={data}
      onNext={onNext}
      onBack={vi.fn()}
      carrera_id={1}
      malla_id={1}
    />,
  )
  return onNext
}

/** El chip del curso en la lista de ofertados. El nombre también aparece en
 *  el panel que explica los bloqueos, así que no basta con buscar por texto. */
const chipDe = (nombre: string) =>
  screen
    .getAllByText(nombre)
    .map((n) => n.closest("button"))
    .find((b): b is HTMLButtonElement => b !== null && b.hasAttribute("aria-pressed"))!

beforeEach(() => vi.clearAllMocks())

describe("primer ciclo", () => {
  test("no declara aprobado ningún curso del ciclo actual, ni con status completed", async () => {
    // `completed` llega de `progreso_cursos` cuando el estudiante reintenta el
    // onboarding: el intento anterior ya persistió su matrícula. El curso 1 se
    // deja SIN elegir a propósito: si el historial se sembrara con el `status`,
    // saldría declarado como aprobado sin que el estudiante lo marcara nunca.
    vi.mocked(apiService.getEnvironmentCursos).mockResolvedValue({
      cursos: [curso(1, 1, "completed"), curso(2, 1), curso(3, 1)],
    })

    const onNext = renderStep(base)
    await waitFor(() => expect(screen.getByText("Curso 2")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Curso 2"))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ cursosInscritos: [2], cursosAprobados: [] }),
    )
  })

  test("el curso del ciclo actual sigue siendo elegible aunque llegue completed", async () => {
    // El reintento no debe esconderle al estudiante un curso que sí está
    // llevando: tiene que poder marcarlo como inscrito igual.
    vi.mocked(apiService.getEnvironmentCursos).mockResolvedValue({
      cursos: [curso(1, 1, "completed"), curso(2, 1)],
    })

    const onNext = renderStep(base)
    await waitFor(() => expect(screen.getByText("Curso 1")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Curso 1"))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ cursosInscritos: [1], cursosAprobados: [] }),
    )
  })

  test("no ofrece la tarjeta de historial cuando no hay ciclos anteriores", async () => {
    vi.mocked(apiService.getEnvironmentCursos).mockResolvedValue({
      cursos: [curso(1, 1), curso(2, 1)],
    })

    renderStep(base)

    await waitFor(() => expect(screen.getByText("Curso 1")).toBeInTheDocument())
    expect(screen.queryByText("Lo que ya aprobaste")).not.toBeInTheDocument()
    expect(screen.queryByText(/ciclos anteriores/i)).not.toBeInTheDocument()
  })
})

describe("ciclos posteriores", () => {
  test("preselecciona como aprobado solo lo de ciclos anteriores", async () => {
    vi.mocked(apiService.getEnvironmentCursos).mockResolvedValue({
      cursos: [curso(1, 1), curso(2, 1), curso(3, 3)],
    })

    const onNext = renderStep({ ...base, semester: 3 })
    await waitFor(() => expect(screen.getByText("Curso 3")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Curso 3"))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ cursosInscritos: [3], cursosAprobados: [1, 2] }),
    )
  })

  test("un arrastre que se vuelve a llevar deja de contar como aprobado", async () => {
    // El estudiante ya declaró el curso 1 como aprobado y luego lo elige para
    // llevarlo: las dos listas tienen que quedar disjuntas al continuar.
    vi.mocked(apiService.getEnvironmentCursos).mockResolvedValue({
      cursos: [curso(1, 1), curso(2, 2)],
    })

    const onNext = renderStep({ ...base, semester: 2, cursosAprobados: [1] })
    await waitFor(() => expect(screen.getByText("Curso 2")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Curso 2"))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    const enviado = onNext.mock.calls[0][0]
    expect(enviado.cursosInscritos).toEqual([2])
    expect(enviado.cursosAprobados).not.toContain(2)
  })
})

describe("prerrequisitos", () => {
  const conPrereq = (statusPrereq = "available") => ({
    cursos: [
      { ...curso(1, 1, statusPrereq) },
      { ...curso(2, 2), prerrequisito_ids: [1] },
    ],
  })

  test("un curso sin su prerrequisito aprobado no se puede elegir", async () => {
    vi.mocked(apiService.getEnvironmentCursos).mockResolvedValue(conPrereq())

    // Ciclo 2 con el prerrequisito (ciclo 1) desmarcado a mano: queda bloqueado.
    const onNext = renderStep({ ...base, semester: 2, cursosAprobados: [] })
    await waitFor(() => expect(chipDe("Curso 2")).toBeDefined())

    const chip = chipDe("Curso 2")
    expect(chip).toBeDisabled()
    fireEvent.click(chip)
    expect(onNext).not.toHaveBeenCalled()
  })

  test("aprobar el prerrequisito lo desbloquea", async () => {
    vi.mocked(apiService.getEnvironmentCursos).mockResolvedValue(conPrereq())

    const onNext = renderStep({ ...base, semester: 2, cursosAprobados: [1] })
    await waitFor(() => expect(chipDe("Curso 2")).toBeDefined())

    const chip = chipDe("Curso 2")
    expect(chip).not.toBeDisabled()
    fireEvent.click(chip)
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ cursosInscritos: [2] }),
    )
  })

  test("desmarcar el prerrequisito suelta el curso ya elegido", async () => {
    vi.mocked(apiService.getEnvironmentCursos).mockResolvedValue(conPrereq())

    renderStep({ ...base, semester: 2, cursosAprobados: [1] })
    await waitFor(() => expect(chipDe("Curso 2")).toBeDefined())

    // Se elige el curso 2 y luego se desmarca su prerrequisito en el historial.
    fireEvent.click(chipDe("Curso 2"))
    expect(screen.getByText("1 elegidos")).toBeInTheDocument()

    fireEvent.click(chipDe("Curso 1"))

    // Queda sin prerrequisito: se suelta solo en vez de viajar inválido.
    await waitFor(() => expect(screen.getByText("0 elegidos")).toBeInTheDocument())
    expect(chipDe("Curso 2")).toBeDisabled()
  })
})
