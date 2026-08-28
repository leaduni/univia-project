// Boundary de último recurso: reemplaza al root layout cuando este falla.
// Por eso trae sus propios <html>/<body> y no importa nada del design system:
// si lo que se rompió fue el layout, las fuentes, el tema y las variables CSS
// pueden ser justamente lo que no está disponible. Todo va en estilos inline.
"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error crítico en el layout raíz:", error)
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0b14",
          color: "#e5e7eb",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "440px", textAlign: "center" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 24px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #7c3aed, #db2777)",
              fontSize: "30px",
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            !
          </div>

          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              margin: "0 0 12px",
              color: "#f9fafb",
            }}
          >
            UniVia no pudo cargarse
          </h1>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 28px",
              color: "#9ca3af",
            }}
          >
            Ocurrió un error inesperado al iniciar la aplicación. Puedes intentar
            recargar; si el problema continúa, vuelve a intentarlo en unos
            minutos.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 22px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                color: "#ffffff",
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
              }}
            >
              Recargar la aplicación
            </button>

            {/* <a> y no <Link>: el router puede ser parte de lo que falló. */}
            <a
              href="/"
              style={{
                padding: "10px 22px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                color: "#e5e7eb",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              Ir al inicio
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: "28px", fontSize: "12px", color: "#6b7280" }}>
              Código de referencia:{" "}
              <code style={{ fontFamily: "ui-monospace, monospace" }}>
                {error.digest}
              </code>
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
