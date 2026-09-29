"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { registrarSesion } from "@/lib/agenda-service"
import { toast } from "sonner"

export interface PomodoroState {
  isRunning: boolean;
  isMinimized: boolean;
  isFocusModeOpen: boolean;
  phase: "focus" | "break";
  targetEndTime: number | null; // Date.now() + timeLeft
  timeLeft: number; // in seconds
  totalDurationSec: number;
  asignadoA: string;
  createBlock: boolean;
  focusMinutes: number;
  breakMinutes: number;
}

interface PomodoroContextValue {
  state: PomodoroState;
  openFocusMode: (prefillAsignadoA?: string, prefillCreateBlock?: boolean) => void;
  closeFocusMode: () => void;
  minimize: () => void;
  maximize: () => void;
  startSession: (focusMin: number, breakMin: number, asignadoA: string, createBlock: boolean) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: (isFinishedEarly: boolean) => void;
  setTimeLeft: (secs: number) => void;
}

const defaultState: PomodoroState = {
  isRunning: false,
  isMinimized: false,
  isFocusModeOpen: false,
  phase: "focus",
  targetEndTime: null,
  timeLeft: 50 * 60,
  totalDurationSec: 50 * 60,
  asignadoA: "libre",
  createBlock: true,
  focusMinutes: 50,
  breakMinutes: 10,
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null)

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>(defaultState)
  const [initialized, setInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("univia_pomodoro_state")
      if (saved) {
        const parsed = JSON.parse(saved)
        // If it was running, recalculate timeLeft based on targetEndTime
        if (parsed.isRunning && parsed.targetEndTime) {
          const now = Date.now()
          const newTimeLeft = Math.max(0, Math.floor((parsed.targetEndTime - now) / 1000))
          if (newTimeLeft === 0) {
            parsed.isRunning = false
            parsed.timeLeft = 0
          } else {
            parsed.timeLeft = newTimeLeft
          }
        }
        setState(parsed)
      }
    } catch (err) {
      console.warn("Failed to load pomodoro state", err)
    }
    setInitialized(true)
  }, [])

  // Save to localStorage when state changes
  useEffect(() => {
    if (!initialized) return
    localStorage.setItem("univia_pomodoro_state", JSON.stringify(state))
  }, [state, initialized])

  // Timer tick
  useEffect(() => {
    if (!state.isRunning || state.targetEndTime === null) return

    const playBeep = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {}
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const newTimeLeft = Math.max(0, Math.floor((state.targetEndTime! - now) / 1000))
      
      setState(prev => {
        if (newTimeLeft === 300 && prev.timeLeft > 300 && prev.phase === "focus") {
          toast.info("¡Faltan 5 minutos!", { description: "Estás por terminar tu sesión de concentración." })
        }
        
        if (newTimeLeft === 0) {
          playBeep()
          // Time is up!
          if (prev.phase === "focus") {
            // Focus completed
            window.dispatchEvent(new CustomEvent("pomodoroPhaseComplete", { detail: { phase: "focus" } }))
            return { ...prev, phase: "break", timeLeft: prev.breakMinutes * 60, totalDurationSec: prev.breakMinutes * 60, targetEndTime: Date.now() + (prev.breakMinutes * 60000) }
          } else {
            // Break completed
            window.dispatchEvent(new CustomEvent("pomodoroPhaseComplete", { detail: { phase: "break" } }))
            return { ...prev, isRunning: false, timeLeft: 0, targetEndTime: null }
          }
        }
        return { ...prev, timeLeft: newTimeLeft }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [state.isRunning, state.targetEndTime])

  const openFocusMode = (prefillAsignadoA = "libre", prefillCreateBlock = true) => {
    setState(prev => ({
      ...prev,
      isFocusModeOpen: true,
      isMinimized: false,
      asignadoA: prev.isRunning ? prev.asignadoA : prefillAsignadoA,
      createBlock: prev.isRunning ? prev.createBlock : prefillCreateBlock
    }))
  }

  const closeFocusMode = () => setState(prev => ({ ...prev, isFocusModeOpen: false, isMinimized: false }))
  const minimize = () => setState(prev => ({ ...prev, isMinimized: true }))
  const maximize = () => setState(prev => ({ ...prev, isMinimized: false, isFocusModeOpen: true }))
  
  const startSession = (focusMin: number, breakMin: number, asignadoA: string, createBlock: boolean) => {
    const totalSecs = focusMin * 60
    setState(prev => ({
      ...prev,
      isRunning: true,
      phase: "focus",
      focusMinutes: focusMin,
      breakMinutes: breakMin,
      timeLeft: totalSecs,
      totalDurationSec: totalSecs,
      targetEndTime: Date.now() + (totalSecs * 1000),
      asignadoA,
      createBlock
    }))
  }

  const pauseSession = () => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      targetEndTime: null
    }))
  }

  const resumeSession = () => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      targetEndTime: Date.now() + (prev.timeLeft * 1000)
    }))
  }
  
  const setTimeLeft = (secs: number) => {
    setState(prev => ({
      ...prev,
      timeLeft: secs,
      totalDurationSec: prev.isRunning ? prev.totalDurationSec : secs,
      targetEndTime: prev.isRunning ? Date.now() + (secs * 1000) : null
    }))
  }

  const completeSession = async (isFinishedEarly: boolean) => {
    const minEstudiados = Math.floor((state.totalDurationSec - state.timeLeft) / 60)
    
    // Call the API to save
    if (minEstudiados > 0) {
      try {
        await registrarSesion({
          minutos_configurados: state.focusMinutes,
          minutos_reales: minEstudiados,
          evento_id: state.asignadoA !== "libre" ? parseInt(state.asignadoA) : undefined,
          finalizado_temprano: isFinishedEarly,
          started_at: new Date(Date.now() - minEstudiados * 60000).toISOString(),
          ended_at: new Date().toISOString()
        })
        
        // Emite un evento para que el widget de productividad se entere y actualice reactivamente
        window.dispatchEvent(new CustomEvent("sesionEstudioCompletada", { detail: { minutos: minEstudiados } }))
        toast.success("¡Sesión completada!", { description: `Has sumado ${minEstudiados} minutos a tu meta semanal.` })
      } catch (err) {
        console.error("Error guardando sesión de estudio:", err)
      }
    }

    setState(defaultState)
  }

  return (
    <PomodoroContext.Provider value={{ state, openFocusMode, closeFocusMode, minimize, maximize, startSession, pauseSession, resumeSession, completeSession, setTimeLeft }}>
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error("usePomodoro must be used within a PomodoroProvider")
  return ctx
}
