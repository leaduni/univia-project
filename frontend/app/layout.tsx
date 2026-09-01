// Root layout with ThemeProvider, AuthProvider, Poppins + Open Sans fonts
import type React from "react"
import type { Metadata } from "next"
import { Anton, Poppins, Open_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-heading",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  title: "UniVia - Academic Orientation Dashboard",
  description: "Personalized learning paths based on university curriculum",
  generator: "v0.app",

  icons: {
    icon: "/Logo_LEAD_UNI.png",
    shortcut: "/Logo_LEAD_UNI.png",
    apple: "/Logo_LEAD_UNI.png",
  },
}

import { AuthProvider } from "@/components/providers/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { ChatBubble } from "@/components/chatbot/chat-bubble"

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
            {children}
            {/* Montado a nivel de layout raíz (no en DashboardLayout) para que
                el hilo de la conversación sobreviva a la navegación entre
                páginas: cada página instancia su propio DashboardLayout, que
                se desmonta en cada cambio de ruta. ChatBubble decide sola
                cuándo mostrarse (sesión + onboarding completo). */}
            <ChatBubble />
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
