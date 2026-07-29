// Indicador de avance del onboarding: "Paso X de N" + barra con degradado
"use client"

interface OnboardingProgressProps {
  currentStep: number
  steps: string[]
}

/**
 * Una sola barra continua en lugar de un segmento por paso.
 *
 * El diseño anterior pintaba cuatro barras sueltas, lo que se lee como cuatro
 * cosas distintas y no como un avance. Aquí el degradado de marca crece de
 * izquierda a derecha, que es lo que la gente ya entiende como progreso.
 */
export function OnboardingProgress({ currentStep, steps }: OnboardingProgressProps) {
  const total = steps.length
  const pasoActual = Math.min(currentStep + 1, total)
  const porcentaje = (pasoActual / total) * 100

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-heading text-sm font-semibold text-foreground">
          {steps[currentStep]}
        </p>
        <p className="text-xs font-medium text-muted-foreground shrink-0">
          Paso {pasoActual} de {total}
        </p>
      </div>

      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={pasoActual}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Paso ${pasoActual} de ${total}: ${steps[currentStep]}`}
      >
        <div
          className="progress-bar-modern-fill"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* En pantallas anchas sí caben los nombres de los cuatro pasos. */}
      <div className="hidden md:flex items-center justify-between gap-2 pt-0.5">
        {steps.map((nombre, idx) => (
          <span
            key={nombre}
            className={`text-xs transition-colors ${
              idx === currentStep
                ? "font-semibold text-foreground"
                : idx < currentStep
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
            }`}
          >
            {idx + 1}. {nombre}
          </span>
        ))}
      </div>
    </div>
  )
}
