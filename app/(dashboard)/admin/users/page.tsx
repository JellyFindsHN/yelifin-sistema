// app/(dashboard)/admin/users/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminUsers } from "@/hooks/swr/use-admin";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

function relativeTime(date: string | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)    return "hace un momento";
  if (mins < 60)   return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `hace ${hours}h`;
  const days  = Math.floor(hours / 24);
  if (days < 30)   return `hace ${days}d`;
  return new Date(date).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  TRIAL:     "Prueba",
  ACTIVE:    "Activa",
  CANCELLED: "Cancelada",
  EXPIRED:   "Vencida",
  PAST_DUE:  "Pendiente",
};
const STATUS_COLOR: Record<string, string> = {
  TRIAL:     "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE:    "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  EXPIRED:   "bg-gray-100 text-gray-600 border-gray-200",
  PAST_DUE:  "bg-amber-100 text-amber-700 border-amber-200",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState("all");
  const [page,    setPage]    = useState(1);

  const debouncedSearch = useDebounce(search, 350);

  const { users, total, pages, isLoading } = useAdminUsers({
    search: debouncedSearch,
    status,
    page,
  });

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const handleStatus = useCallback((v: string) => {
    setStatus(v);
    setPage(1);
  }, []);

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Cargando..." : `${total} usuario${total !== 1 ? "s" : ""} registrados`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por email, nombre o negocio..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={handleStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="TRIAL">Prueba</SelectItem>
            <SelectItem value="ACTIVE">Activa</SelectItem>
            <SelectItem value="PAST_DUE">Pago pendiente</SelectItem>
            <SelectItem value="CANCELLED">Cancelada</SelectItem>
            <SelectItem value="EXPIRED">Vencida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Usuario / Negocio</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/admin/users/${u.id}`)}
                >
                  <TableCell>
                    <p className="font-medium text-sm">
                      {u.business_name || u.display_name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{u.plan_name ?? "—"}</TableCell>
                  <TableCell>
                    {u.subscription_status ? (
                      <Badge className={`${STATUS_COLOR[u.subscription_status] ?? ""} border text-xs`}>
                        {STATUS_LABEL[u.subscription_status] ?? u.subscription_status}
                      </Badge>
                    ) : <span className="text-muted-foreground text-xs">Sin suscripción</span>}
                  </TableCell>
                  <TableCell>
                    {u.is_active
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <XCircle    className="h-4 w-4 text-destructive" />}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("es-HN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span title={u.last_refresh_time ?? u.last_sign_in_time ?? "—"}>
                        {relativeTime(u.last_refresh_time ?? u.last_sign_in_time)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs">Ver</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : users.length === 0
            ? <p className="text-sm text-center text-muted-foreground py-12">No se encontraron usuarios</p>
            : users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border p-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => router.push(`/admin/users/${u.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {u.business_name || u.display_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {u.is_active
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        : <XCircle    className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">{u.plan_name ?? "Sin plan"}</span>
                    {u.subscription_status && (
                      <Badge className={`${STATUS_COLOR[u.subscription_status] ?? ""} border text-xs`}>
                        {STATUS_LABEL[u.subscription_status] ?? u.subscription_status}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Clock className="h-3 w-3" />
                      {relativeTime(u.last_refresh_time ?? u.last_sign_in_time)}
                    </span>
                  </div>
                </div>
              ))
        }
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
