// app/(dashboard)/settings/roles/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useMe } from "@/hooks/swr/use-me";
import {
  useOrgRoles,
  useCreateOrgRole,
  useUpdateOrgRole,
  useDeleteOrgRole,
  type OrgRole,
} from "@/hooks/swr/use-organization";
import type { OrgModule, ModulePermissions } from "@/types";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, Crown, Shield,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────

const MODULES: { key: OrgModule; label: string }[] = [
  { key: "PRODUCTS",   label: "Productos"   },
  { key: "INVENTORY",  label: "Inventario"  },
  { key: "SALES",      label: "Ventas"      },
  { key: "CUSTOMERS",  label: "Clientes"    },
  { key: "FINANCES",   label: "Finanzas"    },
  { key: "EVENTS",     label: "Eventos"     },
  { key: "REPORTS",    label: "Reportes"    },
  { key: "ADMIN",      label: "Admin"       },
];

const PERM_COLS: { key: keyof ModulePermissions; label: string; short: string }[] = [
  { key: "can_view",    label: "Ver",      short: "V"  },
  { key: "can_edit",    label: "Editar",   short: "E"  },
  { key: "can_delete",  label: "Eliminar", short: "Elm" },
  { key: "show_costs",  label: "Costos",   short: "C"  },
  { key: "show_profit", label: "Ganancia", short: "G"  },
];

type PermState = Record<OrgModule, ModulePermissions>;

function emptyPerms(): PermState {
  return Object.fromEntries(
    MODULES.map(({ key }) => [key, {
      can_view: false, can_edit: false, can_delete: false,
      show_costs: false, show_profit: false,
    }])
  ) as PermState;
}

function roleToPerms(role: OrgRole): PermState {
  const base = emptyPerms();
  for (const mod of MODULES) {
    const p = role.permissions[mod.key];
    if (p) base[mod.key] = { ...p };
  }
  return base;
}

// ── Permission grid ────────────────────────────────────────────────────────

function PermGrid({
  perms,
  onChange,
  readOnly = false,
}: {
  perms: PermState;
  onChange?: (next: PermState) => void;
  readOnly?: boolean;
}) {
  const toggle = (mod: OrgModule, col: keyof ModulePermissions) => {
    if (readOnly || !onChange) return;
    onChange({
      ...perms,
      [mod]: { ...perms[mod], [col]: !perms[mod][col] },
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-3 font-medium text-muted-foreground w-28">Módulo</th>
            {PERM_COLS.map((c) => (
              <th key={c.key} className="text-center py-2 px-1 font-medium text-muted-foreground min-w-[48px]">
                <span className="hidden sm:inline">{c.label}</span>
                <span className="sm:hidden">{c.short}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map(({ key, label }) => (
            <tr key={key} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2.5 pr-3 font-medium text-sm">{label}</td>
              {PERM_COLS.map((col) => (
                <td key={col.key} className="py-2.5 px-1 text-center">
                  <Checkbox
                    checked={perms[key][col.key]}
                    onCheckedChange={() => toggle(key, col.key)}
                    disabled={readOnly}
                    className="mx-auto"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Role dialog (create / edit) ────────────────────────────────────────────

function RoleDialog({
  role,
  onClose,
  onSaved,
}: {
  role: OrgRole | null;       // null = create mode
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!role;
  const { createRole, isCreating } = useCreateOrgRole();
  const { updateRole, isUpdating } = useUpdateOrgRole();

  const [name,  setName]  = useState(role?.name ?? "");
  const [perms, setPerms] = useState<PermState>(role ? roleToPerms(role) : emptyPerms());

  const busy = isCreating || isUpdating;

  const handleSave = async () => {
    if (!name.trim()) { toast.error("El nombre del rol es requerido"); return; }
    try {
      if (isEdit) {
        await updateRole(role.id, { name: name.trim(), permissions: perms });
        toast.success("Rol actualizado");
      } else {
        await createRole(name.trim(), perms);
        toast.success("Rol creado");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el rol");
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar rol" : "Nuevo rol"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="roleName">Nombre del rol</Label>
            <Input
              id="roleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cajero, Bodeguero, Contador…"
              disabled={busy}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Permisos por módulo</Label>
            <PermGrid perms={perms} onChange={setPerms} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSave} disabled={busy} className="gap-2">
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear rol"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { back } = useRouter();
  const { isOwner, isLoading: meLoading } = useMe();
  const { roles, isLoading: rolesLoading, mutate } = useOrgRoles();
  const { deleteRole, isDeleting } = useDeleteOrgRole();

  const [showCreate,  setShowCreate]  = useState(false);
  const [editRole,    setEditRole]    = useState<OrgRole | null>(null);
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [expandedId,  setExpandedId]  = useState<number | null>(null);

  const isLoading = meLoading || rolesLoading;

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteRole(deletingId);
      toast.success("Rol eliminado");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar rol");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pb-24 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:space-y-6 max-w-3xl mx-auto">

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Roles y permisos</h1>
            <p className="text-muted-foreground text-sm">
              Definí qué puede hacer cada rol en cada módulo.
            </p>
          </div>
        </div>
        {isOwner && (
          <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            Nuevo rol
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {roles.map((role) => {
          const isExpanded = expandedId === role.id;
          const ownerPerms = emptyPerms();
          if (role.is_owner) {
            for (const m of MODULES) ownerPerms[m.key] = { can_view: true, can_edit: true, can_delete: true, show_costs: true, show_profit: true };
          }
          const displayPerms = role.is_owner ? ownerPerms : roleToPerms(role);

          return (
            <Card key={role.id}>
              <CardHeader className="pb-2 pt-4 px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {role.is_owner
                      ? <Crown className="size-4 text-amber-500 shrink-0" />
                      : <Shield className="size-4 text-muted-foreground shrink-0" />
                    }
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    {role.is_owner && (
                      <Badge variant="outline" className="text-xs">Sistema</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setExpandedId(isExpanded ? null : role.id)}
                    >
                      {isExpanded ? "Ocultar permisos" : "Ver permisos"}
                    </Button>
                    {isOwner && !role.is_owner && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditRole(role)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(role.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-2 pb-4 px-6">
                  <PermGrid perms={displayPerms} readOnly />
                </CardContent>
              )}
            </Card>
          );
        })}

        {roles.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No hay roles configurados.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      {showCreate && (
        <RoleDialog
          role={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => mutate()}
        />
      )}

      {editRole && (
        <RoleDialog
          role={editRole}
          onClose={() => setEditRole(null)}
          onSaved={() => mutate()}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se puede eliminar si no hay miembros activos asignados a este rol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
