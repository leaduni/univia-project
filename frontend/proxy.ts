// Middleware de protección de rutas (C4 - hardening pre-producción).
//
// Hasta aquí las rutas de la app se protegían SOLO del lado del cliente
// (DashboardLayout consulta la sesión en el navegador y redirige). Esto
// dejaba una ventana en la que el HTML/JS de páginas privadas se servía a
// cualquiera. Este middleware valida la sesión de Supabase DESDE EL SERVIDOR
// leyendo las cookies de sesión (escritas por createBrowserClient en
// lib/supabase.ts) y redirige a /auth/login antes de renderizar nada.
//
// Routas protegidas = las mismas que ya envuelve DashboardLayout en el
// cliente mas /dashboard. La redirección del cliente se mantiene como
// respaldo (p. ej. expiración de sesión post-navegación) y para el flujo de
// onboarding, que el middleware no puede conocer.
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Prefijos que requieren sesión. Deben coincidir con las páginas que ya usan
// DashboardLayout (redirección client-side) para no cambiar el comportamiento
// visible: solo anticipamos la decisión al servidor.
const RUTAS_PROTEGIDAS = [
  "/dashboard",
  "/agenda",
  "/curso",
  "/donaciones",
  "/foro",
  "/malla",
  "/mensajes",
  "/perfil",
  "/ranking",
  "/recursos",
]

// Rutas que NUNCA deben pasar por la verificación de sesión: el propio flujo
// de autenticación, la API y los assets estáticos. Sin esta exclusión el
// middleware puede redirigir /auth/login a sí mismo (ERR_TOO_MANY_REDIRECTS).
const PREFIJOS_PUBLICOS = ["/auth", "/login", "/api", "/onboarding"]
const PREFIJOS_ESTATICOS = ["/_next/static", "/_next/image", "/favicon.ico"]

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1) Salida inmediata para rutas públicas y estáticas: sin verificación de
  //    sesión y sin redirecciones.
  if (
    PREFIJOS_ESTATICOS.some((p) => pathname.startsWith(p)) ||
    PREFIJOS_PUBLICOS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return NextResponse.next()
  }

  // 2) Doble candado: si por lo que sea la ruta no es una de las protegidas,
  //    dejarla pasar (el matcher ya lo garantiza, pero no dependemos de él).
  const esProtegida = RUTAS_PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  )
  if (!esProtegida) {
    return NextResponse.next()
  }

  // Si faltan las credenciales públicas (despliegue mal configurado), no
  // bloqueamos la navegación: la protección client-side sigue activa.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Refrescar la cookie de sesión tanto en la request como en la
        // response, según el patrón oficial de @supabase/ssr.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() valida el JWT contra Supabase Auth (no solo decodifica la cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/auth/login"
    // Salvaguarda anti-bucle: jamás redirigir si ya estamos en una ruta de
    // autenticación (defensa en profundidad; la exclusión de arriba ya lo
    // evita).
    if (pathname.startsWith("/auth")) {
      return NextResponse.next()
    }
    return NextResponse.redirect(loginUrl)
  }

  return response
}

// El matcher restringe dónde corre el middleware: solo las rutas del panel,
// ignorando estáticos de Next, imágenes optimizadas y favicon. Debe ser un
// array de LITERALES: Next lo parsea estáticamente en build y no acepta
// spreads ni .map() (rompe el build de producción).
// Debe coincidir con RUTAS_PROTEGIDAS (cada ruta y su prefijo /:path*).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/agenda/:path*",
    "/agenda",
    "/curso/:path*",
    "/curso",
    "/donaciones/:path*",
    "/donaciones",
    "/foro/:path*",
    "/foro",
    "/malla/:path*",
    "/malla",
    "/mensajes/:path*",
    "/mensajes",
    "/perfil/:path*",
    "/perfil",
    "/ranking/:path*",
    "/ranking",
    "/recursos/:path*",
    "/recursos",
  ],
} 