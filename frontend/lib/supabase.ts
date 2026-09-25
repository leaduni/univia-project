// Supabase client initialization and configuration
//
// Se usa createBrowserClient de @supabase/ssr (compatible con la API de
// supabase-js que ya consume toda la app) para que la sesión se persista en
// COOKIES en vez de solo localStorage. Así el middleware de Next.js
// (frontend/middleware.ts) puede leer la sesión en el servidor y proteger
// /dashboard sin depender del cliente. El resto del código sigue importando
// `supabase` exactamente igual (cero cambios en los consumidores).
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('Supabase URL or Anon Key is missing. Check your environment variables.')
    }
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
