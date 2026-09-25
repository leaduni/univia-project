import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateKey } from "@/lib/chatbot-service";

function mockFetch(response: {
  ok: boolean;
  status: number;
  body?: unknown;
}) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: vi.fn().mockResolvedValue(response.body ?? null),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("validateKey", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envía la clave por el header X-User-LLM-Key, nunca en el body", async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, body: { valid: true } });

    const resultado = await validateKey("token-x", "AIzaSyClave");

    expect(resultado).toEqual({ valid: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/chatbot/validate-key");
    expect(options.method).toBe("POST");
    expect(options.headers["X-User-LLM-Key"]).toBe("AIzaSyClave");
    expect(options.body).toBeUndefined();
  });

  it("propaga el detalle específico del backend en un error HTTP", async () => {
    const fetchMock = mockFetch({
      ok: false,
      status: 503,
      body: { detail: "El servicio de Google está saturado (5xx)." },
    });

    const resultado = await validateKey("token-x", "AIzaSyClave");

    expect(resultado.valid).toBe(false);
    expect(resultado.error).toContain("saturado");
  });

  it("extrae el mensaje estructurado {errors:[{message}]} si el backend lo usa", async () => {
    const fetchMock = mockFetch({
      ok: false,
      status: 500,
      body: { errors: [{ field: "general", message: "Error interno controlado." }] },
    });

    const resultado = await validateKey("token-x", "AIzaSyClave");

    expect(resultado.valid).toBe(false);
    expect(resultado.error).toBe("Error interno controlado.");
  });

  it("devuelve un fallback legible cuando el cuerpo no es parseable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error("no es JSON")),
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await validateKey("token-x", "AIzaSyClave");

    expect(resultado.valid).toBe(false);
    expect(resultado.error).toContain("No se pudo validar la clave");
  });

  it("devuelve un error de conexión si el fetch lanza (sin red)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await validateKey("token-x", "AIzaSyClave");

    expect(resultado.valid).toBe(false);
    expect(resultado.error).toContain("conexión");
  });
});