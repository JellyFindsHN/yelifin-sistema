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
            className="flex size-8 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            {isPrivate
              ? <EyeOff className="size-4 text-primary" />
              : <Eye className="size-4" />
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
        ? <EyeOff className="size-4 shrink-0" />
        : <Eye    className="size-4 shrink-0" />
      }
      <span className="text-sm">{label}</span>
    </button>
  );
}
