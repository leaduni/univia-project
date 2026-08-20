// Root layout with ThemeProvider, AuthProvider, Poppins + Open Sans fonts
import type React from "react"
import type { Metadata } from "next"
import { Anton, Poppins, Open_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
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
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}