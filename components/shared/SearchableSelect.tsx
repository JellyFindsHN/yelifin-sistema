import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SearchableSelectItem {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: SearchableSelectItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  searchThreshold?: number;
  className?: string;
  disabled?: boolean;
  defaultOption?: SearchableSelectItem; // Nueva prop para "Todos", "Ninguno", etc.
}

export function SearchableSelect({
  value,
  onValueChange,
  items,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  searchThreshold = 9,
  className,
  disabled = false,
  defaultOption,
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const showSearch = items.length > searchThreshold;

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenChange = (isOpen: boolean) => {
    // Si el input de búsqueda tiene el foco, no cerrar
    if (!isOpen && isSearchFocused) {
      return;
    }
    setOpen(isOpen);
    if (!isOpen) {
      setSearch("");
      setIsSearchFocused(false);
    }
  };

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showSearch && (
          <div 
            className="sticky top-0 z-10 bg-popover px-1 pb-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  // Pequeño delay para permitir que el click en un item se procese
                  setTimeout(() => setIsSearchFocused(false), 100);
                }}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
        )}
        
        {defaultOption && (
          <SelectItem value={defaultOption.value}>
            {defaultOption.label}
          </SelectItem>
        )}
        
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No se encontraron resultados
          </div>
        ) : (
          filtered.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}