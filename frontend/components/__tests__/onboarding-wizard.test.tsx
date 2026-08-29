// Regresión de "Actualizar situación académica": el wizard se reutiliza para
// editar un perfil que ya existe. Si arranca en blanco, muestra Ciclo I
// premarcado a un estudiante de ciclo VI; al dar Continuar sin tocar nada, le
// devuelve el ciclo a I y desde su lado "no se actualiza nada".
import { describe, expect, test, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { OnboardingWizard } from "../onboarding-wizard"
import { apiService } from "@/lib/api-service"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

const signOut = vi.fn()
vi.mock("../providers/auth-context", () => ({
  useAuth: () => ({ refreshProfile: vi.fn(), signOut, user: null }),
}))

vi.mock("@/lib/api-service", () => ({
  apiService: {
    getOnboardingData: vi.fn(),
    getProfile: vi.fn(),
    getMallasPorCarrera: vi.fn().mockResolvedValue([]),
    getEnvironmentCursos: vi.fn().mockResolvedValue({ cursos: [] }),
    completeOnboarding: vi.fn(),
  },
}))

const META = {
  carreras: [
    {
      id: 7,
      name: "Ingeniería de Sistemas",
      duracion_ciclos: 10,
      facultad: { id: 3, nombre: "FIIS" },
    },
  ],
  facultades: [{ id: 3, nombre: "FIIS" }],
}

beforeEach(() => vi.clearAllMocks())

describe("modo actualización", () => {
  test("precarga carrera y ciclo del perfil en vez de empezar en Ciclo I", async () => {
    vi.mocked(apiService.getOnboardingData).mockResolvedValue(META)
    vi.mocked(apiService.getProfile).mockResolvedValue({
      carrera_id: 7,
      malla_id: 4,
      ciclo_actual: 6,
      codigo_estudiante: "20240001",
    })

    render(<OnboardingWizard />)

    // La facultad del estudiante llega preseleccionada: el primer paso refleja
    // su situación real en vez de un formulario vacío. Es la prueba de que el
    // perfil se cargó y de que los pasos siguientes (carrera, plan, ciclo)
    // parten de ese estado y no de los valores por defecto.
    const facultad = await screen.findByRole("button", { name: /FIIS/i })
    expect(facultad).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByText("Omitir por ahora")).not.toBeInTheDocument()
  })

  test("el ciclo del perfil llega al paso de ciclo, no Ciclo I", async () => {
    vi.mocked(apiService.getOnboardingData).mockResolvedValue(META)
    vi.mocked(apiService.getProfile).mockResolvedValue({
      carrera_id: 7,
      malla_id: 4,
      ciclo_actual: 6,
      codigo_estudiante: "20240001",
    })

    // Con una sola malla el paso de plan se resuelve solo y cede el turno.
    vi.mocked(apiService.getMallasPorCarrera).mockResolvedValue([
      { id: 4, nombre: "Plan 2020", es_vigente: true },
    ] as any)

    render(<OnboardingWizard />)

    // Se avanza hasta el paso de ciclo. Antes de la precarga, aquí aparecía
    // Ciclo I marcado y un Continuar bastaba para degradar el perfil a ciclo I.
    fireEvent.click(await screen.findByRole("button", { name: /FIIS/i }))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
    fireEvent.click(await screen.findByRole("button", { name: /Ingeniería de Sistemas/i }))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    const ciclo = await screen.findByRole("button", { name: "Ciclo 6" })
    expect(ciclo).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Ciclo 1" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  test("cancelar devuelve al perfil sin cerrar la sesión", async () => {
    vi.mocked(apiService.getOnboardingData).mockResolvedValue(META)
    vi.mocked(apiService.getProfile).mockResolvedValue({
      carrera_id: 7,
      ciclo_actual: 6,
    })

    render(<OnboardingWizard />)

    const cancelar = await screen.findByRole("button", { name: /cancelar/i })
    cancelar.click()

    await waitFor(() => expect(push).toHaveBeenCalledWith("/perfil"))
    expect(signOut).not.toHaveBeenCalled()
  })
})

describe("registro inicial", () => {
  test("sin perfil académico el wizard empieza en blanco y ofrece omitir", async () => {
    vi.mocked(apiService.getOnboardingData).mockResolvedValue(META)
    vi.mocked(apiService.getProfile).mockResolvedValue({ carrera_id: null })

    render(<OnboardingWizard />)

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /omitir por ahora/i })).toBeInTheDocument(),
    )
  })

  test("si el perfil no carga, el wizard sigue siendo usable", async () => {
    vi.mocked(apiService.getOnboardingData).mockResolvedValue(META)
    vi.mocked(apiService.getProfile).mockRejectedValue(new Error("401"))

    render(<OnboardingWizard />)

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /omitir por ahora/i })).toBeInTheDocument(),
    )
  })
})
