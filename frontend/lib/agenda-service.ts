/**
 * Agenda API service — Cliente para el módulo de agenda del backend.
 *
 * Reutiliza fetchWithAuth de api-service.ts para autenticación,
 * timeouts y reintentos automáticos en GET.
 */

import { fetchWithAuth } from './api-service';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// ── Tipos ────────────────────────────────────────────────────────────────

export interface AgendaTarea {
  id: number;
  evento_id: number;
  titulo: string;
  is_completed: boolean;
  created_at: string;
}

export interface AgendaEvento {
  id: number;
  titulo: string;
  subtitulo?: string;
  tipo: string;
  etiqueta_id: number | null;
  fecha_iso: string;
  fecha_fin_iso?: string;
  hora_inicio: number;
  duracion: number;
  todo_el_dia: boolean;
  recurrencia: string;
  ubicacion?: string;
  videollamada?: string;
  notificacion?: string;
  descripcion?: string;
  invitados?: string[];
  completed: boolean;
  completed_at?: string;
  created_at?: string;
  is_recurring?: boolean;
  rrule?: string;
  agenda_tareas?: AgendaTarea[];
}

export interface AgendaEtiqueta {
  id: number;
  nombre: string;
  color: string;
  is_system: boolean;
}

export interface AgendaConfiguracion {
  sleep_start: string;
  sleep_end: string;
  semester_start: string | null;
  semester_end: string | null;
  meta_horas_semanal: number;
  pomodoro_focus_min: number;
  pomodoro_break_min: number;
}

export interface Productividad {
  horas_estudiadas: number;
  meta: number;
  porcentaje: number;
  sesiones_semana: number;
  total_sesiones: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function extraerError(body: any): string {
  return body?.errors?.[0]?.message || body?.detail || 'Error inesperado.';
}

// ── Etiquetas ────────────────────────────────────────────────────────────

export async function fetchEtiquetas(): Promise<AgendaEtiqueta[]> {
  const resp = await fetchWithAuth(`${API}/agenda/etiquetas`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
  return resp.json();
}

export async function crearEtiqueta(data: { nombre: string; color: string }): Promise<AgendaEtiqueta> {
  const resp = await fetchWithAuth(`${API}/agenda/etiquetas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
  return resp.json();
}

export async function editarEtiqueta(id: number, data: { nombre?: string; color?: string }): Promise<AgendaEtiqueta> {
  const resp = await fetchWithAuth(`${API}/agenda/etiquetas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
  return resp.json();
}

export async function eliminarEtiqueta(id: number): Promise<void> {
  const resp = await fetchWithAuth(`${API}/agenda/etiquetas/${id}`, {
    method: 'DELETE',
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
}

// ── Eventos ──────────────────────────────────────────────────────────────

export async function fetchEventos(desde?: string, hasta?: string): Promise<AgendaEvento[]> {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const qs = params.toString();
  const resp = await fetchWithAuth(`${API}/agenda/eventos${qs ? '?' + qs : ''}`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
  return resp.json();
}

export async function crearEvento(data: Omit<AgendaEvento, 'id' | 'completed' | 'completed_at' | 'created_at'>): Promise<AgendaEvento> {
  const resp = await fetchWithAuth(`${API}/agenda/eventos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
  return resp.json();
}

export async function editarEvento(id: number, data: Partial<AgendaEvento>): Promise<AgendaEvento> {
  const resp = await fetchWithAuth(`${API}/agenda/eventos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
  return resp.json();
}

export async function eliminarEvento(id: number): Promise<void> {
  const resp = await fetchWithAuth(`${API}/agenda/eventos/${id}`, {
    method: 'DELETE',
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
}

// ── Configuración ────────────────────────────────────────────────────────

export async function fetchConfiguracion(): Promise<AgendaConfiguracion> {
  const resp = await fetchWithAuth(`${API}/agenda/configuracion`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
  return resp.json();
}

export async function guardarConfiguracion(data: Partial<AgendaConfiguracion>): Promise<void> {
  const resp = await fetchWithAuth(`${API}/agenda/configuracion`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
}

// ── Sesiones de Estudio (Pomodoro) ───────────────────────────────────────

export async function registrarSesion(data: {
  evento_id?: number;
  minutos_configurados: number;
  minutos_reales: number;
  finalizado_temprano: boolean;
  started_at: string;
  ended_at: string;
}): Promise<void> {
  const resp = await fetchWithAuth(`${API}/agenda/sesiones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
}

export async function fetchProductividad(): Promise<Productividad> {
  const resp = await fetchWithAuth(`${API}/agenda/productividad`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(extraerError(body));
  }
  return resp.json();
}
