"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedTheme: "light" | "dark"
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const stored = localStorage.getItem("peaq-theme") as Theme | null
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored)
    }
  }, [])

  useEffect(() => {
    const apply = (t: Theme) => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const resolved = t === "system" ? (prefersDark ? "dark" : "light") : t
      document.documentElement.setAttribute("data-theme", resolved)
      setResolvedTheme(resolved)
    }

    apply(theme)
    localStorage.setItem("peaq-theme", theme)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => { if (theme === "system") apply("system") }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
