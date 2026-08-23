"use client"

import React, { useEffect, useRef, type CSSProperties, type ReactNode } from "react"

interface Rgb {
  r: number
  g: number
  b: number
}

interface ConstellationNode {
  x: number
  y: number
  vx: number
  vy: number
  baseX: number
  baseY: number
  radius: number
  pulse: number
  label: string
  color: Rgb
}

// Códigos reales de la malla (frontend/lib/mockData.ts): cada nodo es un curso.
const COURSE_CODES = [
  "CS101",
  "MAT101",
  "FIS101",
  "COM101",
  "HUM101",
  "ALG101",
  "ENG101",
  "CS201",
  "MAT201",
  "FIS201",
  "CS301",
  "DB301",
  "SYS301",
  "STA301",
  "PRJ301",
  "WEB401",
  "MOB401",
  "ML401",
  "SEC401",
]

// Fallbacks de la paleta LEAD UNI (documentacion/marca/LEAD_UNI_Brand_Identity.md §11).
// Los colores reales se leen de las variables CSS (--brand-*) para no hardcodear hex en el componente.
const BRAND_RED: Rgb = { r: 217, g: 51, b: 64 }
const BRAND_CARMIN: Rgb = { r: 191, g: 42, b: 81 }
const BRAND_MAGENTA: Rgb = { r: 166, g: 36, b: 157 }
const BRAND_VIOLET: Rgb = { r: 121, g: 87, b: 241 }

function hexToRgb(hex: string): Rgb | null {
  const value = hex.replace("#", "").trim()
  if (value.length === 3) {
    return {
      r: parseInt(value[0] + value[0], 16),
      g: parseInt(value[1] + value[1], 16),
      b: parseInt(value[2] + value[2], 16),
    }
  }
  if (value.length === 6) {
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    }
  }
  return null
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  }
}

interface ConstellationGridProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function ConstellationGrid({ className = "", style, children }: ConstellationGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Leer la paleta desde los tokens CSS (app/globals.css) una sola vez.
    const computed = getComputedStyle(document.documentElement)
    const readVar = (name: string, fallback: Rgb): Rgb => hexToRgb(computed.getPropertyValue(name).trim()) ?? fallback

    const navy = readVar("--brand-navy", { r: 3, g: 12, b: 64 })
    const navyDeep = {
      r: Math.round(navy.r * 0.5),
      g: Math.round(navy.g * 0.5),
      b: Math.round(navy.b * 0.5),
    }
    const gradientStops: Rgb[] = [
      readVar("--brand-red", BRAND_RED),
      readVar("--brand-carmin", BRAND_CARMIN),
      readVar("--brand-magenta", BRAND_MAGENTA),
      readVar("--brand-violet", BRAND_VIOLET),
    ]

    const gradientColorAt = (t: number): Rgb => {
      const clamped = Math.max(0, Math.min(1, t))
      const scaled = clamped * (gradientStops.length - 1)
      const index = Math.min(Math.floor(scaled), gradientStops.length - 2)
      return lerpRgb(gradientStops[index], gradientStops[index + 1], scaled - index)
    }

    let width = 0
    let height = 0
    let nodes: ConstellationNode[] = []

    const mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, vx: 0, vy: 0, radius: 220 }
    let isVisible = true
    let running = false
    let animationFrameId = 0
    let lastTime = performance.now()

    const measure = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      // Asignar width/height resetea el transform; re-aplicar el escalado DPR.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const initNodes = () => {
      nodes = []
      const spacing = 58
      const cols = Math.ceil(width / spacing) + 1
      const rows = Math.ceil(height / spacing) + 1
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing
          const y = j * spacing
          nodes.push({
            x,
            y,
            vx: 0,
            vy: 0,
            baseX: x,
            baseY: y,
            radius: Math.random() * 1.2 + 1.2,
            pulse: Math.random() * Math.PI * 2,
            label: COURSE_CODES[(i * 7 + j * 11) % COURSE_CODES.length],
            color: gradientColorAt(width > 0 ? x / width : 0),
          })
        }
      }
    }

    const drawBackground = () => {
      ctx.fillStyle = `rgb(${navy.r}, ${navy.g}, ${navy.b})`
      ctx.fillRect(0, 0, width, height)

      // Viñeta sutil para dar profundidad sin competir con el contenido.
      const glow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        0,
        width * 0.5,
        height * 0.4,
        Math.max(width, height) * 0.9,
      )
      glow.addColorStop(0, `rgba(${navy.r}, ${navy.g}, ${navy.b}, 0)`)
      glow.addColorStop(1, `rgba(${navyDeep.r}, ${navyDeep.g}, ${navyDeep.b}, 0.85)`)
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)
    }

    const drawConnections = (opacity: number) => {
      const MAX_CONN_DIST = 78
      const MAX_CONN_DIST_SQ = MAX_CONN_DIST * MAX_CONN_DIST
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const ndx = a.x - b.x
          const ndy = a.y - b.y
          const distSq = ndx * ndx + ndy * ndy
          if (distSq < MAX_CONN_DIST_SQ) {
            const dist = Math.sqrt(distSq)
            const alpha = (1 - dist / MAX_CONN_DIST) * opacity
            ctx.strokeStyle = `rgba(${Math.round((a.color.r + b.color.r) / 2)}, ${Math.round(
              (a.color.g + b.color.g) / 2,
            )}, ${Math.round((a.color.b + b.color.b) / 2)}, ${alpha.toFixed(3)})`
            ctx.lineWidth = 0.7
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
    }

    const drawNodes = (pulsing: boolean) => {
      for (const n of nodes) {
        const dx = mouse.x - n.x
        const dy = mouse.y - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const isNear = dist < mouse.radius

        let baseAlpha = pulsing ? 0.28 + Math.sin(n.pulse) * 0.12 : 0.32
        let radius = pulsing ? n.radius + Math.sin(n.pulse) * 0.3 : n.radius
        if (isNear) {
          baseAlpha = 0.95
          radius = n.radius * 2.2
        }

        ctx.fillStyle = `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${baseAlpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, Math.max(0.5, radius), 0, Math.PI * 2)
        ctx.fill()

        if (pulsing && isNear && dist < 90) {
          // Anillo de radar + lectura del código del curso en proximidad activa.
          const pulseRing = ((n.pulse * 20) % 30) + 4
          const ringAlpha = (1 - pulseRing / 34) * 0.4
          ctx.strokeStyle = `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${ringAlpha.toFixed(3)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(n.x, n.y, pulseRing, 0, Math.PI * 2)
          ctx.stroke()

          ctx.font = "8px ui-monospace, SFMono-Regular, Consolas, monospace"
          ctx.fillStyle = `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, 0.85)`
          ctx.fillText(n.label, n.x + 10, n.y - 10)
        }
      }
    }

    const updatePhysics = (dt: number) => {
      mouse.vx = (mouse.x - mouse.prevX) / (dt * 1000 || 1)
      mouse.vy = (mouse.y - mouse.prevY) / (dt * 1000 || 1)
      mouse.prevX = mouse.x
      mouse.prevY = mouse.y
      const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy)

      const SPRING_K = 18
      const DAMPING = 0.82

      for (const n of nodes) {
        n.pulse += dt * 3

        const dx = mouse.x - n.x
        const dy = mouse.y - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < mouse.radius && dist > 0) {
          const power = 1 - dist / mouse.radius
          const force = power * (1500 + speed * 150)
          const angle = Math.atan2(dy, dx)
          n.vx -= Math.cos(angle) * force * dt
          n.vy -= Math.sin(angle) * force * dt
        }

        const homeDx = n.baseX - n.x
        const homeDy = n.baseY - n.y
        n.vx += homeDx * SPRING_K * dt
        n.vy += homeDy * SPRING_K * dt

        n.vx *= DAMPING
        n.vy *= DAMPING

        n.x += n.vx * dt * 60
        n.y += n.vy * dt * 60
      }
    }

    const render = (now: number) => {
      if (!isVisible) {
        running = false
        return
      }
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      updatePhysics(dt)
      drawBackground()
      drawConnections(0.16)
      drawNodes(true)
      animationFrameId = requestAnimationFrame(render)
    }

    const renderStatic = () => {
      drawBackground()
      drawConnections(0.12)
      drawNodes(false)
    }

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const handlePointerLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }
    const handleResize = () => {
      measure()
      initNodes()
      if (prefersReducedMotion) renderStatic()
    }

    const parent = canvas.parentElement
    measure()
    initNodes()

    // Pausar el renderizado cuando la hero sale del viewport (ahorro de batería).
    const observer = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true
      if (isVisible && !running) {
        lastTime = performance.now()
        running = true
        animationFrameId = requestAnimationFrame(render)
      }
    })
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    if (parent) {
      observer.observe(parent)
      resizeObserver.observe(parent)
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerleave", handlePointerLeave)

    if (prefersReducedMotion) {
      renderStatic()
    } else {
      lastTime = performance.now()
      running = true
      animationFrameId = requestAnimationFrame(render)
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerleave", handlePointerLeave)
    }
  }, [])

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <canvas ref={canvasRef} className="absolute inset-0 block" aria-hidden="true" />
      {children}
    </div>
  )
}
