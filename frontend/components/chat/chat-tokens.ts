// Design tokens del chat (clases Tailwind y valores de animación GSAP).
// Módulo puro sin dependencias de React: lo consumen componentes y hooks.
export const CHAT_TOKENS = {
  PANEL_BLUR: "backdrop-blur-2xl",
  PANEL_BG_DARK: "bg-white/[0.06]",
  PANEL_BG_LIGHT: "bg-white/80",
  BORDER: "border border-white/10",
  SHADOW: "shadow-[0_8px_32px_rgba(0,0,0,0.28)]",
  RADIUS_PANEL: "rounded-3xl",
  RADIUS_BUBBLE_USER: "rounded-[22px_22px_4px_22px]",
  RADIUS_BUBBLE_AI: "rounded-[22px_22px_22px_4px]",
  SPRING_EASE: "back.out(1.7)",
  SPRING_DURATION: 0.55,
  FADE_DURATION: 0.3,
  CHIP_BASE:
    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer select-none",
} as const