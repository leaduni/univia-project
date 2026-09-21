// Estado global BYOK: cualquier parte de la app (dashboard, perfil, chat
// flotante) puede abrir el mismo modal de "Trae tu propia clave de IA" y leer
// si el estudiante tiene una clave activa. El modal se monta aquí una sola
// vez, a nivel de root layout, para que funcione sobre cualquier página.
"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/components/providers/auth-context"
import { ByokModal } from "@/components/chatbot/byok-modal"
import { leerClaveByok } from "@/lib/byok"

interface ByokContextValue {
  /** Clave de Gemini activa (null si el estudiante usa la cuota compartida). */
  claveByok: string | null
  /** true si hay clave propia guardada en este navegador. */
  modoByok: boolean
  /** Abre el modal de configuración BYOK desde cualquier componente. */
  abrirModalByok: () => void
  cerrarModalByok: () => void
  /** Relee la clave desde localStorage tras guardar/borrar en el modal. */
  refrescarClaveByok: () => void
}

const ByokContext = createContext<ByokContextValue | null>(null)

export function ByokProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [modalAbierto, setModalAbierto] = useState(false)
  // localStorage no existe en el SSR: arrancar en null y leer al montar
  // evita el desajuste de hidratación en los botones que dependen del estado.
  const [claveByok, setClaveByok] = useState<string | null>(null)

  useEffect(() => {
    setClaveByok(leerClaveByok())
  }, [])

  const abrirModalByok = useCallback(() => setModalAbierto(true), [])
  const cerrarModalByok = useCallback(() => setModalAbierto(false), [])
  const refrescarClaveByok = useCallback(() => setClaveByok(leerClaveByok()), [])

  return (
    <ByokContext.Provider
      value={{
        claveByok,
        modoByok: Boolean(claveByok),
        abrirModalByok,
        cerrarModalByok,
        refrescarClaveByok,
      }}
    >
      {children}
      {/* El modal necesita el JWT del usuario para validar la clave con una
          micro-llamada al backend; sin sesión no tiene sentido montarlo. */}
      {session?.access_token && (
        <ByokModal
          abierto={modalAbierto}
          token={session.access_token}
          claveGuardada={claveByok}
          onCerrar={cerrarModalByok}
          onCambio={refrescarClaveByok}
        />
      )}
    </ByokContext.Provider>
  )
}

/** Acceso al estado BYOK global. */
export function useByok(): ByokContextValue {
  const ctx = useContext(ByokContext)
  if (!ctx) {
    throw new Error("useByok debe usarse dentro de <ByokProvider> (app/layout.tsx).")
  }
  return ctx
}
