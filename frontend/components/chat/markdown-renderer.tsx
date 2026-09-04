// Renderizador de markdown para el chat: conserva el pipeline de plugins del
// proyecto (remark-math, rehype-katex, rehype-raw, rehype-sanitize) y redefine
// los componentes de ReactMarkdown con estilos del chat (párrafos, código,
// tablas, enlaces y listas).
"use client"

import { useState, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { Check, Copy } from "lucide-react"
import type { Element } from "hast"
import "katex/dist/katex.min.css"

interface MarkdownRendererProps {
  content: string | { contexto: string }
  className?: string
}

function preprocessLaTeX(content: string): string {
  if (!content) return ""

  let result = ""
  let index = 0

  while (index < content.length) {
    // Markdown no debe interpretar ni modificar LaTeX dentro de código.
    if (content[index] === "`") {
      let ticks = 1
      while (content[index + ticks] === "`") ticks += 1
      const delimiter = "`".repeat(ticks)
      const end = content.indexOf(delimiter, index + ticks)
      if (end === -1) {
        result += content.slice(index)
        break
      }
      result += content.slice(index, end + ticks)
      index = end + ticks
      continue
    }

    const slashDelimiter = content.slice(index, index + 2)
    if (slashDelimiter === "\\(" || slashDelimiter === "\\[") {
      const closing = slashDelimiter === "\\(" ? "\\)" : "\\]"
      const end = content.indexOf(closing, index + 2)
      if (end === -1) {
        result += slashDelimiter
        index += 2
        continue
      }

      const expression = content.slice(index + 2, end).trim()
      const display = slashDelimiter === "\\[" || expression.includes("\\displaystyle") || expression.includes("\n")
      result += display ? `\n$$\n${expression}\n$$\n` : `$${expression}$`
      index = end + 2
      continue
    }

    if (content[index] === "$" && content[index - 1] !== "\\") {
      let dollars = 1
      while (content[index + dollars] === "$") dollars += 1
      const delimiterLength = dollars >= 2 ? 2 : 1
      const delimiter = "$".repeat(delimiterLength)
      const end = content.indexOf(delimiter, index + dollars)

      // Un dólar sin pareja (por ejemplo, un precio) se conserva literalmente.
      if (end === -1 || (delimiterLength === 1 && /\d/.test(content[index + 1] ?? "") && /\d/.test(content[end + 1] ?? ""))) {
        result += content.slice(index, index + dollars)
        index += dollars
        continue
      }

      const expression = content.slice(index + dollars, end).trim()
      const display = delimiterLength === 2 || expression.includes("\\displaystyle") || expression.includes("\n")
      result += display ? `\n$$\n${expression}\n$$\n` : `$${expression}$`
      let closingDollars = delimiterLength
      if (delimiterLength === 2) {
        while (content[end + closingDollars] === "$") closingDollars += 1
      }
      index = end + closingDollars
      continue
    }

    result += content[index]
    index += 1
  }

  return result
}

// Tablas Markdown (sintaxis GFM de pipes) no se renderizan en el chat: react-markdown
// usa CommonMark y las deja como texto crudo (las dobles barras "||" reportadas).
// Se convierten a listas fluidas con negritas antes de renderizar.
const REGEX_SEPARADOR_TABLA = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

function preprocessTables(content: string): string {
  if (!content) return content
  const lineas = content.split("\n")
  const salida: string[] = []
  let enCodigo = false

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]
    if (/^\s*```/.test(linea)) {
      enCodigo = !enCodigo
      salida.push(linea)
      continue
    }
    if (enCodigo) {
      salida.push(linea)
      continue
    }

    const recortada = linea.trim()
    const pareceTabla =
      recortada.startsWith("|") && recortada.endsWith("|") && recortada.includes("|", 1)
    if (!pareceTabla) {
      salida.push(linea)
      continue
    }
    if (REGEX_SEPARADOR_TABLA.test(recortada)) continue

    const celdas = recortada
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim())
    if (celdas.length <= 1) {
      salida.push(linea)
      continue
    }

    const siguiente = (lineas[i + 1] ?? "").trim()
    const esEncabezado = REGEX_SEPARADOR_TABLA.test(siguiente)
    if (esEncabezado) {
      i += 1
      salida.push(`- **${celdas.join(" · ")}**`)
    } else {
      salida.push(`- **${celdas[0]}**: ${celdas.slice(1).join(" · ")}`)
    }
  }
  return salida.join("\n")
}

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "details", "summary"],
}

/** Extrae el texto plano del hast de un bloque <pre>, para el botón copiar. */
const textoDelNodo = (node: Element | undefined): string => {
  if (!node) return ""

  let texto = ""
  for (const hijo of node.children) {
    if (hijo.type === "text") texto += hijo.value
    else if (hijo.type === "element") texto += textoDelNodo(hijo)
  }

  return texto
}

/** Bloque de código con header decorativo y botón de copia con feedback. */
function CodigoBloque({ children, node }: { children: ReactNode; node?: Element }) {
  const [copiado, setCopiado] = useState(false)
  const codigo = textoDelNodo(node)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1500)
    } catch {
      /* Portapapeles no disponible (contexto no seguro): se ignora silenciosamente. */
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border mb-4">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/60">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" aria-hidden="true" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" aria-hidden="true" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" aria-hidden="true" />
        <button
          type="button"
          onClick={copiar}
          aria-label="Copiar código"
          className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="m-0 bg-transparent">{children}</pre>
    </div>
  )
}
// Objeto `components` de ReactMarkdown con los estilos del chat. En
// react-markdown v10 el bloque de código se distingue del inline por la clase
// `language-*` que llega en `className`; el `pre` envuelve el bloque con el
// header decorativo y el botón de copia.
const components: Components = {
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">{children}</p>
  ),
  code: ({ children, className }) => {
    const esBloque = typeof className === "string" && /language-/.test(className)

    if (esBloque) {
      return (
        <code className="px-4 py-3 bg-card font-mono text-xs text-foreground overflow-x-auto">
          {children}
        </code>
      )
    }

    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">
        {children}
      </code>
    )
  },
  pre: ({ children, node }) => <CodigoBloque node={node}>{children}</CodigoBloque>,
  // Refuerzo defensivo: si un modelo aún emite una tabla (GFM residual u HTML
  // raw), se renderiza como texto corrido en vez de una tabla rígida que rompe
  // la burbuja estrecha del chat.
  table: ({ children }) => <div className="mb-4 text-sm text-foreground">{children}</div>,
  thead: ({ children }) => <div>{children}</div>,
  tr: ({ children }) => <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 my-1">{children}</div>,
  th: ({ children }) => <span className="font-semibold text-foreground">{children}</span>,
  td: ({ children }) => <span className="text-muted-foreground">{children}</span>,
  a: ({ children, href }) => {
    if (href && href.includes("uni.edu.pe")) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2 break-all"
        >
          <span className="min-w-0">{children}</span>
          <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium shrink-0">
            uni.edu.pe
          </span>
        </a>
      )
    }

    return (
      <a
        href={href}
        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
      >
        {children}
      </a>
    )
  },
  h1: ({ children }) => <h1 className="text-base font-semibold mb-2 mt-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-semibold mb-1.5 mt-3">{children}</h2>,
  h3: ({ children }) => (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1 mt-2">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="space-y-1 mb-3 list-none [&>li]:before:content-['•'] [&>li]:before:mr-1.5 [&>li]:before:text-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-sm">{children}</ol>
  ),
}

function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const raw =
    typeof content === "object" && content !== null && "contexto" in content
      ? content.contexto
      : content
  const textToRender = preprocessTables(preprocessLaTeX(String(raw)))

  return (
    <div className={`break-words max-w-full ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, schema],
          [rehypeKatex, { throwOnError: false, strict: false, macros: { "\\bold": "\\mathbf" } }],
        ]}
        components={components}
      >
        {textToRender}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
