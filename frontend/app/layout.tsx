// Root layout with ThemeProvider, AuthProvider, League Spartan + Roboto fonts
import type React from "react"
import type { Metadata } from "next"
import { League_Spartan, Roboto } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  variable: "--font-heading",
})

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
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
      <body className={`${roboto.variable} ${leagueSpartan.variable} font-sans antialiased text-foreground bg-background`}>
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