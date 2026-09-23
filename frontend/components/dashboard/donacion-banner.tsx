// Bloque de donaciones del dashboard: invita a la comunidad a financiar el proyecto.
import Link from "next/link"
import { HandCoins, PiggyBank } from "lucide-react"

export function DonacionBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7957f1]/12 via-[#a6249d]/8 to-[#d93340]/5 border border-[#7957f1]/20 shadow-[var(--glow-brand)] transition-all duration-300 hover:border-[#7957f1]/35 hover:shadow-[0_12px_48px_rgba(121,87,241,0.28)] p-5 anim-up">
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#7957f1]/12 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#d93340]/8 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#a6249d]/50 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <PiggyBank
        // Escala con la altura de la tarjeta, no con un tamaño fijo, para que
        // acompañe al bloque de texto aunque la descripción cambie de líneas.
        className="absolute -bottom-6 -left-4 h-[140%] w-auto text-[#7957f1]/12 rotate-[-10deg] pointer-events-none hidden sm:block"
        strokeWidth={0.75}
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <HandCoins className="size-5 gradient-brand-text" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h4 className="font-heading font-semibold ai-glow-text">
              Ayuda a crecer a UniVia
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Con tu apoyo llevamos este proyecto a más estudiantes UNI, para que puedan
              planificar su ciclo y ponderar mejor su carrera.
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:pl-2">
          <Link
            href="/donaciones"
            className="flex w-full items-center justify-center rounded-lg border-0 bg-gradient-to-r from-[#7957f1] to-[#a6249d] px-5 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-px hover:opacity-90 sm:w-auto"
          >
            Donar
          </Link>
        </div>
      </div>
    </div>
  )
}
