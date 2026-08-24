import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { LearningPath } from "@/components/learning-path";

// ── Mocks ──

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

const mockGetLearningPath = vi.fn();
const mockCompletarCurso = vi.fn();
vi.mock("@/lib/api-service", () => ({
  apiService: {
    getLearningPath: (...args: any[]) => mockGetLearningPath(...args),
    completarCurso: (...args: any[]) => mockCompletarCurso(...args),
  },
}));

// ── Shared entity regex ──

const ENTITY_PATTERN = /&(?:aacute|eacute|iacute|oacute|uacute|ntilde|iquest|iexcl);/;

function renderLearningPath(courseId = "1") {
  return render(<LearningPath courseId={courseId} />);
}

/** Helper: advance fake timers in small steps until a condition is met. */
async function advanceUntil(
  msPerStep: number,
  maxSteps: number,
  condition: () => boolean,
): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => {
      vi.advanceTimersByTime(msPerStep);
    });
    if (condition()) return;
  }
  throw new Error(`Condition not met after ${maxSteps * msPerStep}ms`);
}

// ═══════════════════════════════════════════════════════════════════════════
// T1.1 — No HTML entity strings in rendered output
// ═══════════════════════════════════════════════════════════════════════════

describe("HTML entity replacement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render HTML entities in the accessDenied view", async () => {
    mockGetLearningPath.mockRejectedValue({ status: 403 });

    renderLearningPath("1");

    await waitFor(() => {
      expect(screen.getByText("Curso Bloqueado")).toBeInTheDocument();
    });

    const html = document.body.innerHTML;
    expect(html).not.toMatch(ENTITY_PATTERN);
  });

  it("does not render HTML entities in the completeSuccess view", async () => {
    mockGetLearningPath.mockResolvedValue({
      curso: {
        name: "Matemática Básica",
        code: "MB-101",
        credits: 4,
        ciclo: 1,
        ciclo_roman: "I",
        professor: "Dr. Pérez",
        description: "Curso fundamental",
        progress: 50,
      },
      timeline: [
        { id: 1, title: "Semana 1", topics: ["Álgebra"], status: "completed", completado: true },
        { id: 2, title: "Semana 2", topics: ["Geometría"], status: "in_progress", completado: false },
      ],
      ai_insights: [{ description: "Sigue así" }],
    });

    mockCompletarCurso.mockResolvedValue({ status: "success" });

    renderLearningPath("1");

    await waitFor(() => {
      const elements = screen.getAllByText("Matemática Básica");
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText("Marcar como completado"));
    fireEvent.click(screen.getByText(/completar al 100%/));

    await waitFor(() => {
      expect(screen.getByText("Curso completado exitosamente")).toBeInTheDocument();
    });

    const html = document.body.innerHTML;
    expect(html).not.toMatch(ENTITY_PATTERN);
  }, 10000);
});

// ═══════════════════════════════════════════════════════════════════════════
// T1.2 — Redirect to dashboard after course completion
// ═══════════════════════════════════════════════════════════════════════════

describe("Course completion redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects to /malla after 2500ms when course is completed", async () => {
    mockGetLearningPath.mockResolvedValue({
      curso: {
        name: "Física I",
        code: "F-101",
        credits: 5,
        ciclo: 2,
        ciclo_roman: "II",
        professor: null,
        description: null,
        progress: 80,
      },
      timeline: [
        { id: 1, title: "Semana 1", topics: ["Mecánica"], status: "completed", completado: true },
      ],
      ai_insights: [],
    });

    mockCompletarCurso.mockResolvedValue({ status: "success" });

    renderLearningPath("1");

    // Advance in small steps until the content renders (replaces waitFor)
    await advanceUntil(50, 40, () => screen.queryAllByText("Física I").length > 0);

    // Click "Marcar como completado"
    fireEvent.click(screen.getByText("Marcar como completado"));
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Click "Sí, completar al 100%"
    fireEvent.click(screen.getByText(/completar al 100%/));

    // Advance until success banner appears
    await advanceUntil(50, 40, () =>
      screen.queryByText("Curso completado exitosamente") !== null,
    );

    // Now advance past the 2500ms redirect timer
    act(() => {
      vi.advanceTimersByTime(2600);
    });

    // Vuelve a la malla, que es de donde se entra al curso. Antes esperaba "/"
    // porque esa ruta era el dashboard; hoy "/" es la landing pública.
    expect(mockRouterPush).toHaveBeenCalledWith("/malla");
  }, 15000);
});
