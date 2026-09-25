"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import {
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  GraduationCap,
  Search,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react"

export interface CatalogItem {
  id?: string | number
  titulo?: string
  title?: string
  nombre?: string
  course_name?: string
  nombre_curso?: string
  curso?: string
  codigo_curso?: string
  course_id?: string
  codigo?: string
  code?: string
  tipo?: string
  ciclo?: number | string
  year?: number | string
  total_files?: number
  [key: string]: unknown
}

interface RecursosAlianzaProps {
  initialCatalog: CatalogItem[]
}

const SACU_URL = "https://sacu.netlify.app"

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number") {
      return String(value)
    }
  }

  return ""
}

function getCourseName(item: CatalogItem): string {
  return firstString(
    item.nombre_curso,
    item.curso,
    item.course_name,
    item.name
  )
    .replace(/_/g, " ")
    .replace(/^(intr|int|ing|ec)\._/i, (m) => m.replace(/[._]/g, ""))
}

function getCourseCode(item: CatalogItem): string {
  return firstString(
    item.codigo_curso,
    item.course_id,
    item.codigo,
    item.code,
    item.course_code
  )
}

function getTitle(item: CatalogItem): string {
  return firstString(
    item.titulo,
    item.title,
    item.nombre,
    item.name,
    item.course_name
  ).replace(/_/g, " ")
}

export function RecursosAlianza({
  initialCatalog,
}: RecursosAlianzaProps) {
  const [search, setSearch] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)

  const catalog = Array.isArray(initialCatalog) ? initialCatalog : []

  const totalFiles = useMemo(
    () => catalog.reduce((acc, item) => acc + (Number(item.total_files) || 0), 0),
    [catalog],
  )

  const uniqueCourses = useMemo(() => {
    const values = new Set<string>()

    catalog.forEach((item) => {
      const code = getCourseCode(item)
      const name = getCourseName(item)

      const key = code || name

      if (key) {
        values.add(key.toLowerCase())
      }
    })

    return values.size
  }, [catalog])

  const filteredResults = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return catalog.slice(0, 6)
    }

    return catalog
      .filter((item) => {
        const searchableText = [
          getTitle(item),
          getCourseName(item),
          getCourseCode(item),
          firstString(item.tipo),
          firstString(item.ciclo),
          firstString(item.year),
        ]
          .join(" ")
          .toLowerCase()

        return searchableText.includes(term)
      })
      .slice(0, 6)
  }, [catalog, search])

  const openSacu = () => {
    window.open(SACU_URL, "_blank", "noopener,noreferrer")
  }

  const openCourse = (item: CatalogItem) => {
    const code = getCourseCode(item)
    window.open(
      code ? `${SACU_URL}/repositorio?curso=${encodeURIComponent(code)}` : SACU_URL,
      "_blank",
      "noopener,noreferrer",
    )
  }

  const clearSearch = () => {
    setSearch("")
  }

  return (
    <section className="relative isolate overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#090a12] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      {/* =========================================================
          ATMÓSFERA
         ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-[-12%] top-[-18%] h-[32rem] w-[32rem] rounded-full bg-fuchsia-600/[0.10] blur-[140px]" />
        <div className="absolute right-[-10%] top-[18%] h-[28rem] w-[28rem] rounded-full bg-violet-500/[0.09] blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[28%] h-[24rem] w-[24rem] rounded-full bg-cyan-400/[0.05] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(circle at center, black 0%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 0%, transparent 78%)",
          }}
        />
      </div>

      <div className="relative z-10">

        {/* =========================================================
            BENTO PRINCIPAL
           ========================================================= */}

        <div className="grid gap-4 lg:grid-cols-12">

          {/* -----------------------------------------------------
              BLOQUE DE IDENTIDAD
             ----------------------------------------------------- */}

          <div className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-2xl transition-all duration-500 hover:border-white/[0.14] lg:col-span-4 lg:min-h-[460px]">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/[0.08] blur-[90px] transition-transform duration-700 group-hover:scale-125"
            />

            <div className="relative flex h-full flex-col justify-between">

              {/* Logos */}

              <div>
                <div className="mb-10 flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Image
                      src="/Logo_LEAD_UNI.png"
                      alt="LEAD UNI"
                      width={42}
                      height={42}
                      className="object-contain"
                    />
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-slate-300">
                    <Users className="h-4 w-4" />
                  </div>

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.035]">
                    <Image
                      src="/logo_NUCLEO.png"
                      alt="Núcleo — Centro Cultural (SACU)"
                      width={42}
                      height={42}
                      className="object-contain"
                    />
                  </div>
                </div>

                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  Alianza estratégica
                </div>

                <h2 className="max-w-[15rem] text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                  UniVia
                  <span className="mx-2 text-white/20">×</span>
                  <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                    SACU
                  </span>
                </h2>

                <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
                  El conocimiento de la comunidad universitaria integrado
                  directamente en tu experiencia académica.
                </p>
              </div>

              {/* Insight */}

              <div className="mt-10">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
                  Repositorio comunitario
                </div>

                <div className="mt-4 h-px w-full bg-gradient-to-r from-white/[0.12] via-white/[0.04] to-transparent" />

                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Exámenes, apuntes, guías y material académico organizado
                  para acompañar cada etapa de tu carrera.
                </p>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------
              BLOQUE CENTRAL — BUSCADOR
             ----------------------------------------------------- */}

          <div className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-2xl transition-all duration-500 hover:border-white/[0.14] sm:p-8 lg:col-span-8 lg:min-h-[460px]">
            <div
              aria-hidden="true"
              className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-violet-600/[0.10] blur-[120px] transition-all duration-700 group-hover:bg-fuchsia-500/[0.13] group-hover:scale-110"
            />

            <div
              aria-hidden="true"
              className="absolute bottom-[-30%] left-[30%] h-72 w-72 rounded-full bg-cyan-400/[0.05] blur-[110px]"
            />

            <div className="relative flex h-full flex-col justify-between">

              {/* Título */}

              <div className="max-w-2xl">
                <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <BookOpen className="h-4 w-4 text-fuchsia-400" />
                  Biblioteca universitaria
                </div>

                <h3 className="max-w-2xl text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
                  Todo el material.
                  <span className="block bg-gradient-to-r from-white via-slate-200 to-white/40 bg-clip-text text-transparent">
                    Una sola búsqueda.
                  </span>
                </h3>

                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                  Encuentra rápidamente exámenes, apuntes y guías por
                  curso, código, ciclo o tipo de recurso.
                </p>
              </div>

              {/* Search */}

              <div className="mt-10">
                <div
                  className={[
                    "relative rounded-2xl border p-2 transition-all duration-500",
                    searchFocused
                      ? "border-fuchsia-400/30 bg-white/[0.07] shadow-[0_0_50px_rgba(168,85,247,0.10)]"
                      : "border-white/[0.10] bg-black/20",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-slate-400">
                      <Search className="h-5 w-5" />
                    </div>

                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      placeholder="Busca un curso, código o tipo de material..."
                      className="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium text-white outline-none placeholder:text-slate-600 sm:text-base"
                      aria-label="Buscar recursos académicos"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
                        aria-label="Limpiar búsqueda"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={openSacu}
                      className="group/search inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/20"
                    >
                      Abrir SACU
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover/search:translate-x-0.5 group-hover/search:-translate-y-0.5" />
                    </button>
                  </div>
                </div>

                {/* Sugerencias */}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Explora
                  </span>

                  {["Cálculo", "Física", "Programación"].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setSearch(term)}
                      className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-xs font-medium text-slate-400 transition-all duration-300 hover:border-fuchsia-400/20 hover:bg-fuchsia-400/[0.06] hover:text-white"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultados rápidos */}

              {search && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
                  {filteredResults.length > 0 ? (
                    <div className="divide-y divide-white/[0.06]">
                      {filteredResults.map((item, index) => {
                        const title = getTitle(item) || "Recurso académico"
                        const course = getCourseName(item) || "Curso"
                        const code = getCourseCode(item)

                        return (
                          <button
                            key={`${item.id ?? code ?? title}-${index}`}
                            type="button"
                            onClick={() => openCourse(item)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.045]"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/[0.10] text-fuchsia-300">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">
                                {title}
                              </p>

                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                                <span>{course}</span>
                                {code && (
                                  <>
                                    <span className="text-slate-700">•</span>
                                    <span>{code}</span>
                                  </>
                                )}
                                {typeof item.total_files === "number" && (
                                  <>
                                    <span className="text-slate-700">•</span>
                                    <span>{item.total_files} archivos</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600" />
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm font-semibold text-slate-300">
                        No encontramos coincidencias.
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Prueba con otro curso, código o palabra clave.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* -----------------------------------------------------
              MÉTRICA 1
             ----------------------------------------------------- */}

          <div className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300/20 lg:col-span-4">
            <div
              aria-hidden="true"
              className="absolute -bottom-14 -right-14 h-40 w-40 rounded-full bg-cyan-400/[0.08] blur-[60px] transition-transform duration-700 group-hover:scale-125"
            />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-cyan-300">
                  <FileText className="h-5 w-5" />
                </div>

                <Zap className="h-4 w-4 text-cyan-300/60" />
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Archivos disponibles
              </p>

              <p className="mt-2 text-5xl font-black tracking-[-0.05em] text-white">
                {totalFiles.toLocaleString("en-US")}
              </p>

              <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                Exámenes, apuntes, guías y más contenido de la comunidad.
              </p>
            </div>
          </div>

          {/* -----------------------------------------------------
              MÉTRICA 2
             ----------------------------------------------------- */}

          <div className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-fuchsia-300/20 lg:col-span-4">
            <div
              aria-hidden="true"
              className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-fuchsia-500/[0.08] blur-[60px] transition-transform duration-700 group-hover:scale-125"
            />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-fuchsia-300">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <div className="rounded-full border border-fuchsia-400/10 bg-fuchsia-400/[0.06] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300">
                  Mallas
                </div>
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Cursos cubiertos
              </p>

              <p className="mt-2 text-5xl font-black tracking-[-0.05em] text-white">
                {uniqueCourses.toLocaleString("en-US")}
              </p>

              <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                Cobertura organizada para descubrir material por asignatura.
              </p>
            </div>
          </div>

          {/* -----------------------------------------------------
              CTA FINAL
             ----------------------------------------------------- */}

          <div className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-fuchsia-500/[0.08] via-transparent to-cyan-400/[0.05] p-6 backdrop-blur-2xl transition-all duration-500 hover:border-white/[0.14] lg:col-span-4">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at 20% 20%, rgba(217,51,64,0.10), transparent 35%), radial-gradient(circle at 80% 80%, rgba(121,87,241,0.12), transparent 40%)",
              }}
            />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#d93340] via-[#a6249d] to-[#7957f1] text-white shadow-lg shadow-fuchsia-500/10">
                  <Sparkles className="h-5 w-5" />
                </div>

                <h4 className="mt-6 text-xl font-black tracking-tight text-white">
                  Investiga. Practica.
                  <span className="block text-slate-400">
                    Avanza.
                  </span>
                </h4>

                <p className="mt-3 text-xs leading-6 text-slate-500">
                  La biblioteca comunitaria ahora forma parte de tu ruta
                  académica.
                </p>
              </div>

              <button
                type="button"
                onClick={openSacu}
                className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-bold text-white transition-colors hover:text-cyan-300"
              >
                Explorar repositorio
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            FOOTER / ESTADO
         ========================================================= */}

        <div className="mt-5 flex flex-col gap-3 px-1 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-400/80" />
            <span>Repositorio conectado a tu experiencia UniVia</span>
          </div>

          <button
            type="button"
            onClick={openSacu}
            className="group inline-flex w-fit items-center gap-1.5 transition-colors hover:text-slate-300"
          >
            sacu.netlify.app
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </section>
  )
}
