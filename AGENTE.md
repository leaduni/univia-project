# 🤖 Perfil del Agente y Contexto del Proyecto

Este archivo sirve como memoria técnica y operativa para el asistente de IA (Antigravity) que trabaja en UniVia.

## 🎯 Misión
Asistir en el desarrollo de **UniVia**, una plataforma de orientación académica personalizada que ayuda a los estudiantes a navegar su malla curricular y optimizar su aprendizaje.

## 🧱 Contexto Técnico (Frontend)

### Estructura de Datos
- **Mock Data**: Actualmente el frontend depende de `frontend/lib/mockData.ts` para renderizar el Dashboard y la Malla.
- **API Service**: Ubicado en `frontend/lib/api-service.ts`. Está diseñado para alternar entre llamadas reales y datos mock.

### Autenticación Actual (Mock Mode)
- **Email**: `usuario@univia.edu`
- **Password**: `password123`
- **Lógica**: Manejada en `AuthContext` (utiliza un prefijo `mock-` en el token para diferenciar de sesiones reales).

## 📋 Reglas de Desarrollo para el Agente

1.  **Prioridad Estética**: Los componentes deben seguir un diseño premium, usando gradientes, sombras suaves (glassmorphism) y animaciones de Lucide/Tailwind.
2.  **Mantenimiento de Mock**: No borrar los datos simulados en `mockData.ts`, ya que sirven como fallback cuando el backend está caído o en mantenimiento.
3.  **Modularización**: Mantener los componentes en `frontend/components` y las páginas en `frontend/app`.
4.  **Estado del Backend**: Actualmente el backend está en blanco. Cualquier cambio en el frontend que requiera persistencia debe marcarse como "Mock" hasta que se provean las nuevas credenciales de Supabase.

## 🚩 Bloqueos Actuales
- [ ] Esperando nuevas credenciales de Supabase.
- [ ] Esperando nuevo esquema SQL.

## 📜 Historial de Decisiones Clave
- **2026-02-01**: Se decidió resetear el backend por problemas de permisos RLS y empezar una integración limpia desde cero. Se restauró el frontend a un estado funcional 100% Mock para no detener el desarrollo visual.
