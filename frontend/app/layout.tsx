import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased text-foreground bg-background`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}