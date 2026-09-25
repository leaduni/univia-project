import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase (prevents real client init) ──
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

// ── Import after mocks ──
import { apiService } from "@/lib/api-service";
import { limpiarCache } from "@/lib/api-cache";

// ── Helpers ──

function mockFetch(status: number, body: object | "reject") {
  (globalThis.fetch as any) = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 400 ? "Bad Request" : "Internal Server Error",
    json:
      body === "reject"
        ? () => Promise.reject(new Error("Invalid JSON"))
        : () => Promise.resolve(body),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// T6 — Structured errors parse to readable messages
// ═══════════════════════════════════════════════════════════════════════════

describe("completeOnboarding error parsing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses structured {errors: [{field, message}]} into readable text", async () => {
    mockFetch(400, {
      errors: [
        {
          field: "cursos_inscritos",
          message: "El curso 123 no pertenece a la carrera seleccionada.",
        },
      ],
    });

    // CURRENT (RED): uses errorBody.detail which is undefined → fallback message
    // EXPECTED (GREEN): extraerMensajeError extracts the field message
    await expect(
      apiService.completeOnboarding({
        carrera_id: 1,
        ciclo_actual: 1,
        cursos_inscritos: [123],
      }),
    ).rejects.toThrow("El curso 123 no pertenece a la carrera seleccionada.");
  });

  it("parses multiple structured errors and surfaces at least the first", async () => {
    mockFetch(400, {
      errors: [
        { field: "a", message: "M1" },
        { field: "b", message: "M2" },
      ],
    });

    // extraerMensajeError returns body.errors[0].message → "M1"
    await expect(
      apiService.completeOnboarding({
        carrera_id: 1,
        ciclo_actual: 1,
        cursos_inscritos: [1],
      }),
    ).rejects.toThrow("M1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T7 — Missing errors key falls back to detail string
// ═══════════════════════════════════════════════════════════════════════════

describe("completeOnboarding error fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to detail when errors key is absent", async () => {
    mockFetch(400, { detail: "Forbidden" });

    // CURRENT: errorBody.detail → "Forbidden" (works)
    // EXPECTED: extraerMensajeError → body.detail → "Forbidden" (also works)
    await expect(
      apiService.completeOnboarding({
        carrera_id: 1,
        ciclo_actual: 1,
        cursos_inscritos: [1],
      }),
    ).rejects.toThrow("Forbidden");
  });

  it("falls back to status text when body is not parseable JSON", async () => {
    mockFetch(500, "reject");

    // CURRENT: errorBody.detail is undefined → falls to statusText "Internal Server Error"
    // EXPECTED: extraerMensajeError → null → falls to statusText
    await expect(
      apiService.completeOnboarding({
        carrera_id: 1,
        ciclo_actual: 1,
        cursos_inscritos: [1],
      }),
    ).rejects.toThrow("Internal Server Error");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T8 — cursos activos: degradación defensiva de una sección del dashboard
// ═══════════════════════════════════════════════════════════════════════════

describe("getCursosActivos fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // La caché SWR es de módulo y sobrevive entre tests: sin limpiarla, un
    // caso leería el dato cacheado por el anterior.
    limpiarCache();
  });

  it("resuelve con lista vacía en vez de rechazar cuando la API falla (500)", async () => {
    mockFetch(500, {
      status: "error",
      errors: [
        {
          field: "general",
          message: "No se pudieron cargar tus cursos activos.",
        },
      ],
    });

    // Antes lanzaba: un fallo de esta sección tumbaba el resto del dashboard
    // y pintaba el banner de "Sincronización parcial".
    await expect(apiService.getCursosActivos()).resolves.toEqual({ cursos: [] });
  });

  it("devuelve los cursos cuando la API responde 200", async () => {
    mockFetch(200, {
      cursos: [{ id: 29, code: "BRN01", name: "Realidad Nacional", progreso: 50 }],
    });

    const resultado = await apiService.getCursosActivos();

    expect(resultado.cursos).toHaveLength(1);
    expect(resultado.cursos[0].code).toBe("BRN01");
  });

  it("no cachea el resultado fallido: el siguiente intento vuelve a pedir", async () => {
    mockFetch(500, { status: "error", errors: [] });
    await apiService.getCursosActivos();

    mockFetch(200, { cursos: [{ id: 7, code: "FB403", name: "Ecuaciones Diferenciales" }] });
    const resultado = await apiService.getCursosActivos();

    expect(resultado.cursos).toHaveLength(1);
    expect(resultado.cursos[0].code).toBe("FB403");
  });
});
