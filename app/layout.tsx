'use client'

import { useEffect, useState } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
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

  // Load dark mode preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'true' : prefersDark
    setDarkMode(isDark)
    setMounted(true)
  }, [])

  // Apply dark class to html element and save preference
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

  // Listen for dark mode toggle events from page components
  useEffect(() => {
    const handleThemeToggle = (e: CustomEvent) => {
      setDarkMode(e.detail)
    }

    window.addEventListener('themeToggle' as any, handleThemeToggle)

    return () => {
      window.removeEventListener('themeToggle' as any, handleThemeToggle)
    }
  }, [])

  // Expose toggle function globally for components
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
      <body className="min-h-full flex flex-col theme-transition">
        {children}
        <Analytics />
      </body>
    </html>
  )
}