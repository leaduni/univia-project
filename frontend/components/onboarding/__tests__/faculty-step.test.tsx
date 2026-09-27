import { describe, expect, test, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { FacultyStep } from "../faculty-step"
import type { Carrera, Facultad, OnboardingData } from "@/types/onboarding"

const base: OnboardingData = { career: 0, semester: 1, cursosInscritos: [] }

const fiis: Facultad = {
  id: 1,
  codigo: "FIIS",
  nombre: "Facultad de Ingeniería Industrial y de Sistemas",
  activa: true,
}

const fic: Facultad = {
  id: 7,
  codigo: "FIC",
  nombre: "Facultad de Ingeniería Civil",
  activa: false,
}

const carrera = (id: number, facultad: Facultad, name = `Carrera ${id}`): Carrera => ({
  id,
  codigo: `C${id}`,
  name,
  duracion_ciclos: 10,
  facultad,
})

const renderStep = (props: Partial<React.ComponentProps<typeof FacultyStep>> = {}) => {
  const onNext = vi.fn()
  render(
    <FacultyStep
      data={base}
      onNext={onNext}
      facultades={[fiis, fic]}
      careers={[carrera(6, fiis), carrera(30, fic)]}
      {...props}
    />,
  )
  return onNext
}

const tarjeta = (nombre: RegExp) => screen.getByRole("button", { name: nombre })
const continuar = () => screen.getByRole("button", { name: /continuar/i })

describe("restricción de facultades en el onboarding", () => {
  test("la facultad inactiva se lista bloqueada con 'Próximamente'", () => {
    renderStep()

    const civil = tarjeta(/Ingeniería Civil/i)
    expect(civil).toBeDisabled()
    expect(civil).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByText("Próximamente")).toBeInTheDocument()
    expect(screen.getByText(/aún no disponible en univia/i)).toBeInTheDocument()
  })

  test("hacer clic en una facultad inactiva no la selecciona ni avanza", () => {
    const onNext = renderStep()

    const civil = tarjeta(/Ingeniería Civil/i)
    fireEvent.click(civil)

    expect(civil).toHaveAttribute("aria-pressed", "false")
    expect(continuar()).toBeDisabled()

    fireEvent.click(continuar())
    expect(onNext).not.toHaveBeenCalled()
  })

  test("la facultad activa sigue siendo seleccionable", () => {
    const onNext = renderStep()

    fireEvent.click(tarjeta(/Ingeniería Industrial y de Sistemas/i))
    fireEvent.click(continuar())

    expect(onNext).toHaveBeenCalledWith({ facultad: 1 })
  })

  test("una facultad activa sin carreras sigue bloqueada, pero sin 'Próximamente'", () => {
    const vacia: Facultad = { id: 3, codigo: "FIM", nombre: "Facultad de Ingeniería Mecánica", activa: true }
    renderStep({ facultades: [fiis, vacia], careers: [carrera(6, fiis)] })

    const mecanica = tarjeta(/Ingeniería Mecánica/i)
    expect(mecanica).toBeDisabled()
    expect(screen.getByText(/todavía sin carreras disponibles/i)).toBeInTheDocument()
    expect(screen.queryByText("Próximamente")).not.toBeInTheDocument()
  })
})
