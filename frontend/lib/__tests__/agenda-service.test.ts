import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock("@/lib/api-service", () => ({
  fetchWithAuth: mocks.fetchWithAuth,
}));

import { parseMatricula } from "@/lib/agenda-service";

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe("parseMatricula", () => {
  beforeEach(() => {
    mocks.fetchWithAuth.mockReset();
  });

  it("usa un timeout de 60s SOLO para matrícula y envía el PDF como FormData", async () => {
    const esperado = {
      eventos_creados: [{ id: 1 }],
      cursos_detectados: [{ course_code: "BMA02", section: "U" }],
      message: "ok",
    };
    mocks.fetchWithAuth.mockResolvedValueOnce(mockResponse(200, esperado));

    const file = new File(["pdf"], "matricula.pdf", { type: "application/pdf" });
    const result = await parseMatricula(file);

    expect(result).toEqual(esperado);
    expect(mocks.fetchWithAuth).toHaveBeenCalledTimes(1);

    const [url, options, customToken, timeoutMs] = mocks.fetchWithAuth.mock.calls[0];
    expect(url).toContain("/api/agenda/parse-matricula");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(customToken).toBeUndefined();
    expect(timeoutMs).toBe(60_000);
  });

  it("propaga el detail del backend en el error", async () => {
    mocks.fetchWithAuth.mockResolvedValueOnce(
      mockResponse(400, { detail: "No se detectaron cursos." })
    );

    const file = new File(["pdf"], "matricula.pdf", { type: "application/pdf" });

    await expect(parseMatricula(file)).rejects.toThrow(
      "No se detectaron cursos."
    );
  });
});
