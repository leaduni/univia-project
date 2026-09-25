import { describe, it, expect, beforeEach } from "vitest";
import {
  esClaveByokUsable,
  guardarClaveByok,
  leerClaveByok,
  borrarClaveByok,
} from "@/lib/byok";

describe("esClaveByokUsable (validación flexible)", () => {
  it("acepta una clave AI Studio con espacios alrededor", () => {
    expect(esClaveByokUsable("  AIzaSyXyz123abc456def  ")).toBe(true);
  });

  it("acepta una clave con saltos de línea accidentales al pegar", () => {
    expect(esClaveByokUsable("\nAIzaSyXyz123abc456def\n\t")).toBe(true);
  });

  it("acepta formatos que no empiezan por AIza (Google Cloud/Vertex)", () => {
    expect(esClaveByokUsable("ya29.cloud-project-key")).toBe(true);
    expect(esClaveByokUsable("AIzaSyClaveDePanelPercolada")).toBe(true);
  });

  it("rechaza texto vacío o solo espacios en blanco", () => {
    expect(esClaveByokUsable("")).toBe(false);
    expect(esClaveByokUsable("   \n\t ")).toBe(false);
  });
});

describe("persistencia BYOK en localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("guarda y lee con trim aplicado", () => {
    guardarClaveByok("  AIzaSyXyz123  ");
    expect(leerClaveByok()).toBe("AIzaSyXyz123");
  });

  it("lee null cuando no hay clave guardada", () => {
    expect(leerClaveByok()).toBeNull();
  });

  it("borra la clave guardada", () => {
    guardarClaveByok("AIzaSyXyz123");
    borrarClaveByok();
    expect(leerClaveByok()).toBeNull();
  });
});