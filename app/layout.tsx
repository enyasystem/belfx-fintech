import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

// Instantiate Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // This is key for Tailwind
  // weights: [300, 400, 500, 600, 700, 800], // Optional: specify weights
})

export const metadata: Metadata = {
  title: "Kwegofx - P2P Forex Platform",
  description: "Securely exchange NGN, USD, CAD, GBP, and EUR.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      {/* Apply variable here */}
      <body className="font-sans">
        {/* Use Tailwind's font-sans utility which refers to --font-inter */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
