"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ThemeToggleProps {
  isCollapsed?: boolean
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const toggle = () => setTheme(isDark ? "light" : "dark")
  const label = isDark ? "Modo claro" : "Modo oscuro"

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggle}
            className="flex w-full items-center justify-center rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            {mounted
              ? isDark
                ? <Sun className="h-4 w-4" />
                : <Moon className="h-4 w-4" />
              : <Moon className="h-4 w-4 opacity-0" />
            }
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span className="text-sm">{label}</span>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
    >
      {mounted
        ? isDark
          ? <Sun className="h-4 w-4 shrink-0" />
          : <Moon className="h-4 w-4 shrink-0" />
        : <Moon className="h-4 w-4 shrink-0 opacity-0" />
      }
      <span className="text-sm">{label}</span>
    </button>
  )
}
