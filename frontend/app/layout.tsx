import type React from "react"
import type { Metadata } from "next"
import { Poppins, Montserrat, Anton, Open_Sans, EB_Garamond } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700", "800"], 
  variable: "--font-poppins" 
})

const montserrat = Montserrat({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"], 
  variable: "--font-montserrat" 
})

const anton = Anton({ 
  subsets: ["latin"], 
  weight: ["400"], 
  variable: "--font-anton" 
})

const openSans = Open_Sans({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600"], 
  variable: "--font-opensans" 
})

const ebGaramond = EB_Garamond({ 
  subsets: ["latin"], 
  weight: ["400", "700"], 
  variable: "--font-garamond" 
})

export const metadata: Metadata = {
  title: "UniVia — Plataforma de Orientación Académica | LEAD UNI",
  description: "Rutas de aprendizaje personalizadas para potenciar tu éxito académico e integración profesional con LEAD UNI",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

import { AuthProvider } from "@/components/providers/auth-context"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${poppins.variable} ${montserrat.variable} ${anton.variable} ${openSans.variable} ${ebGaramond.variable} font-sans antialiased text-foreground bg-background`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}

