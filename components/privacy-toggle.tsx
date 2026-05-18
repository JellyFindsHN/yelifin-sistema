"use client";

import { Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePrivacyMode } from "@/context/privacy-mode-context";

interface PrivacyToggleProps {
  isCollapsed?: boolean;
}

export function PrivacyToggle({ isCollapsed = false }: PrivacyToggleProps) {
  const { isPrivate, toggle } = usePrivacyMode();

  const label = isPrivate ? "Mostrar valores" : "Ocultar valores";

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggle}
            className="flex w-full items-center justify-center rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            {isPrivate
              ? <EyeOff className="h-4 w-4 text-primary" />
              : <Eye className="h-4 w-4" />
            }
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span className="text-sm">{label}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors ${
        isPrivate
          ? "text-primary bg-primary/5"
          : "text-sidebar-foreground"
      }`}
    >
      {isPrivate
        ? <EyeOff className="h-4 w-4 shrink-0" />
        : <Eye    className="h-4 w-4 shrink-0" />
      }
      <span className="text-sm">{label}</span>
    </button>
  );
}
