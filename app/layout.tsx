'use client'

import { useEffect, useState } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'true' : prefersDark
    setDarkMode(isDark)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      if (darkMode) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('darkMode', 'true')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('darkMode', 'false')
      }
    }
  }, [darkMode, mounted])

  useEffect(() => {
    const handleThemeToggle = (e: CustomEvent) => {
      setDarkMode(e.detail)
    }
    window.addEventListener('themeToggle' as any, handleThemeToggle)
    return () => {
      window.removeEventListener('themeToggle' as any, handleThemeToggle)
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      ;(window as any).toggleDarkMode = () => {
        setDarkMode(prev => !prev)
      }
      ;(window as any).setDarkMode = (value: boolean) => {
        setDarkMode(value)
      }
    }
  }, [mounted])

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* ✅ GOOGLE ANALYTICS - ADD THIS EXACT CODE */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-JW8XGYGQBR"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-JW8XGYGQBR');
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col theme-transition">
        {children}
      </body>
    </html>
  )
}