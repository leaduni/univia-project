import { beforeEach, describe, expect, it, vi } from "vitest"
import { limpiarCache, leerOCache } from "@/lib/api-cache"
import { tomarCodigoReferido } from "@/lib/gamificacion-utils"
import { verRecomendacionesIA } from "@/lib/preferencias"

describe("migración de almacenamiento desde UniVia a Venus", () => {
  beforeEach(() => {
    localStorage.clear()
    limpiarCache()
  })

  it("mueve la caché persistida al prefijo Venus al leerla", async () => {
    const dato = { cursos: ["BMA02"] }
    localStorage.setItem(
      "univia_cache_anon_catalogo",
      JSON.stringify({ data: dato, timestamp: Date.now() }),
    )
    const cargar = vi.fn().mockResolvedValue({ cursos: [] })

    await expect(leerOCache("catalogo", cargar)).resolves.toEqual(dato)
    expect(cargar).not.toHaveBeenCalled()
    expect(localStorage.getItem("venus_cache_anon_catalogo")).not.toBeNull()
    expect(localStorage.getItem("univia_cache_anon_catalogo")).toBeNull()
  })

  it("lee y consume un código de referido guardado con la clave anterior", () => {
    localStorage.setItem("univia:codigo_referido", "ABCDEF1234")

    expect(tomarCodigoReferido()).toBe("ABCDEF1234")
    expect(localStorage.getItem("univia:codigo_referido")).toBeNull()
    expect(localStorage.getItem("venus:codigo_referido")).toBeNull()
  })

  it("migra las preferencias existentes y conserva su valor", () => {
    localStorage.setItem("univia:preferencias:recomendaciones-ia", "false")

    expect(verRecomendacionesIA()).toBe(false)
    expect(localStorage.getItem("venus:preferencias:recomendaciones-ia")).toBe("false")
    expect(localStorage.getItem("univia:preferencias:recomendaciones-ia")).toBeNull()
  })
})
