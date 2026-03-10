import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showClear?: boolean;
  size?:  "md" | "full";
}

const sizeClasses = {
  md: "max-w-[50%]",      
  full: "max-w-full",
};

export function SearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
  className,
  showClear = true,
  size = "full",
}: SearchBarProps) {
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("pl-9", showClear && "pr-9")}
      />
      {showClear && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}