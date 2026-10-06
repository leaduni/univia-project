// Root layout with ThemeProvider, AuthProvider, Poppins + Open Sans fonts
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Anton, Poppins, Open_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

// Solo los pesos usados de verdad: cada peso extra son ~15-20 KB de WOFF2
// que la landing pública también pagaba.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-heading",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-sans",
})

// Anton: titulares display (manual de marca LEAD UNI §6.3, alternativa a MediaPro Heavy Condensed).
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: {
    default: "Venus | Orientación académica universitaria",
    template: "%s | Venus",
  },
  description:
    "Organiza tus cursos de la UNI, sigue tu avance y aprende a tu ritmo con Venus.",
  applicationName: "Venus",
  generator: "v0.app",
  openGraph: {
    title: "Venus | Orientación académica universitaria",
    description:
      "Organiza tus cursos de la UNI, sigue tu avance y aprende a tu ritmo con Venus.",
    siteName: "Venus",
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Venus | Orientación académica universitaria",
    description:
      "Organiza tus cursos de la UNI, sigue tu avance y aprende a tu ritmo con Venus.",
  },

  icons: {
    icon: "/Logo_LEAD_UNI.png",
    shortcut: "/Logo_LEAD_UNI.png",
    apple: "/Logo_LEAD_UNI.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

import { AuthProvider } from "@/components/providers/auth-context"
import { ByokProvider } from "@/components/providers/byok-context"
import { PomodoroProvider } from "@/components/providers/pomodoro-context"
import { ThemeProvider } from "@/components/theme-provider"
// Wrapper cliente: `ssr:false` no es válido en un Server Component (layout),
// así que la carga lazy de react-markdown/KaTeX/GSAP se hace dentro del wrapper.
import { ChatBubbleWrapper } from "@/components/chat/chat-bubble-wrapper"
import { GlobalPomodoro } from "@/components/agenda/global-pomodoro"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${poppins.variable} ${openSans.variable} ${anton.variable} font-sans antialiased text-foreground bg-background min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <ByokProvider>
              <PomodoroProvider>
                {children}
                <ChatBubbleWrapper />
                <GlobalPomodoro />
              </PomodoroProvider>
            </ByokProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster
          position="top-right"
          theme="dark"
          closeButton
          richColors={false}
          toastOptions={{
            classNames: {
              toast:
                "bg-[#0d0e1b]/90 backdrop-blur-md border border-white/10 text-white rounded-xl shadow-xl shadow-purple-950/20",
              description: "text-slate-400 text-xs",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
