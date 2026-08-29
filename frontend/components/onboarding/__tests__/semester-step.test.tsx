// El ciclo solo avanza. Retroceder dejaba la cuenta incoherente: `ciclo_actual`
// bajaba, pero los créditos y cursos aprobados viven en `progreso_cursos` y
// nadie los borra, así que el dashboard seguía mostrando el avance del ciclo
// alto contra un ciclo declarado bajo.
import { describe, expect, test, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { SemesterStep } from "../semester-step"
import type { OnboardingData } from "@/types/onboarding"

const base: OnboardingData = { career: 1, semester: 6, cursosInscritos: [] }

const renderStep = (props: Partial<React.ComponentProps<typeof SemesterStep>> = {}) =>
  render(
    <SemesterStep
      data={base}
      onNext={vi.fn()}
      onBack={vi.fn()}
      maxCiclos={10}
      cicloRegistrado={6}
      {...props}
    />,
  )

const ciclo = (n: number) => screen.getByRole("button", { name: `Ciclo ${n}` })

describe("el ciclo solo avanza", () => {
  test("los ciclos anteriores al registrado quedan deshabilitados", () => {
    renderStep()
    expect(ciclo(1)).toBeDisabled()
    expect(ciclo(5)).toBeDisabled()
  })

  test("el ciclo registrado y los siguientes siguen disponibles", () => {
    renderStep()
    expect(ciclo(6)).not.toBeDisabled()
    expect(ciclo(7)).not.toBeDisabled()
    expect(ciclo(10)).not.toBeDisabled()
  })

  test("hacer clic en un ciclo anterior no cambia la selección", () => {
    const onNext = vi.fn()
    renderStep({ onNext })

    fireEvent.click(ciclo(3))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    // Sigue enviando su ciclo real, no el que intentó elegir.
    expect(onNext).toHaveBeenCalledWith({ semester: 6 })
  })

  test("avanzar de ciclo sigue funcionando", () => {
    const onNext = vi.fn()
    renderStep({ onNext })

    fireEvent.click(ciclo(8))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    expect(onNext).toHaveBeenCalledWith({ semester: 8 })
  })

  test("explica que los arrastres no exigen retroceder", () => {
    renderStep()
    expect(screen.getByText(/los eliges en el paso siguiente/i)).toBeInTheDocument()
  })

  test("en el registro inicial no hay ciclo cerrado ni aviso", () => {
    const onNext = vi.fn()
    renderStep({ cicloRegistrado: undefined, onNext })

    expect(ciclo(1)).not.toBeDisabled()
    expect(screen.queryByText(/el ciclo solo avanza/i)).not.toBeInTheDocument()

    fireEvent.click(ciclo(1))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
    expect(onNext).toHaveBeenCalledWith({ semester: 1 })
  })

  test("un estudiante de Ciclo I no ve el aviso: no hay nada detrás", () => {
    renderStep({ cicloRegistrado: 1, data: { ...base, semester: 1 } })
    expect(screen.queryByText(/el ciclo solo avanza/i)).not.toBeInTheDocument()
    expect(ciclo(1)).not.toBeDisabled()
  })
})
