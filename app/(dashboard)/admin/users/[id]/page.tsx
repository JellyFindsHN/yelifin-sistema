// app/(dashboard)/admin/users/[id]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminUser, useAdminUpdateUser, useAdminPlans } from "@/hooks/swr/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge }    from "@/components/ui/badge";
import { Button }   from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label }    from "@/components/ui/label";
import { Input }    from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Building2, Mail, Calendar, ShoppingCart,
  Package, ReceiptText, Crown, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Save,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  TRIAL:     "Prueba",
  ACTIVE:    "Activa",
  CANCELLED: "Cancelada",
  EXPIRED:   "Vencida",
  PAST_DUE:  "Pago pendiente",
};
const STATUS_COLOR: Record<string, string> = {
  TRIAL:     "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE:    "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  EXPIRED:   "bg-gray-100 text-gray-600 border-gray-200",
  PAST_DUE:  "bg-amber-100 text-amber-700 border-amber-200",
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const userId  = Number(id);

  const { user, activity, isLoading, mutate } = useAdminUser(userId);
  const { plans }                              = useAdminPlans();
  const { updateUser, isSaving }              = useAdminUpdateUser(userId);

  // Edit state
  const [planId,          setPlanId]          = useState<string>("");
  const [subStatus,       setSubStatus]       = useState<string>("");
  const [trialEndDate,    setTrialEndDate]    = useState<string>("");
  const [periodEndDate,   setPeriodEndDate]   = useState<string>("");

  useEffect(() => {
    if (user) {
      setPlanId(String(user.plan_id ?? ""));
      setSubStatus(user.subscription_status ?? "");
      setTrialEndDate(user.trial_end_date   ? user.trial_end_date.slice(0, 10)   : "");
      setPeriodEndDate(user.current_period_end ? user.current_period_end.slice(0, 10) : "");
    }
  }, [user]);

  const handleSaveSub = async () => {
    try {
      const payload: Record<string, unknown> = {};
      if (planId)        payload.plan_id              = Number(planId);
      if (subStatus)     payload.subscription_status  = subStatus;
      if (trialEndDate)  payload.trial_end_date        = trialEndDate;
      if (periodEndDate) payload.current_period_end    = periodEndDate;
      await updateUser(payload);
      await mutate();
      toast.success("Suscripción actualizada");
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar");
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    try {
      await updateUser({ is_active: !user.is_active });
      await mutate();
      toast.success(user.is_active ? "Usuario desactivado" : "Usuario reactivado");
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    }
  };

  if (isLoading) return <LoadingSkeleton onBack={() => router.back()} />;
  if (!user) return (
    <div className="text-center py-20 text-muted-foreground space-y-2">
      <p>Usuario no encontrado.</p>
      <Button variant="outline" onClick={() => router.back()}>Volver</Button>
    </div>
  );

  const displayName = user.business_name || user.display_name || user.email;

  return (
    <div className="space-y-5 pb-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {user.is_active
            ? <Badge className="bg-green-100 text-green-700 border-green-200 border gap-1"><CheckCircle2 className="h-3 w-3"/>Activo</Badge>
            : <Badge className="bg-red-100 text-red-700 border-red-200 border gap-1"><XCircle className="h-3 w-3"/>Inactivo</Badge>
          }
        </div>
      </div>

      {/* Info + actividad */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Datos del usuario */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-medium">
              <Building2 className="h-4 w-4" /> Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={<Mail className="h-3.5 w-3.5"/>} label="Email" value={user.email} />
            {user.business_name && <InfoRow icon={<Building2 className="h-3.5 w-3.5"/>} label="Negocio" value={user.business_name} />}
            {user.display_name  && <InfoRow icon={<Building2 className="h-3.5 w-3.5"/>} label="Nombre" value={user.display_name} />}
            <InfoRow icon={<Calendar className="h-3.5 w-3.5"/>} label="Registrado"
              value={new Date(user.created_at).toLocaleDateString("es-HN", { day: "numeric", month: "long", year: "numeric" })}
            />
            <InfoRow icon={<Building2 className="h-3.5 w-3.5"/>} label="Moneda" value={user.currency} />
            <InfoRow icon={<Building2 className="h-3.5 w-3.5"/>} label="Zona horaria" value={user.timezone} />
          </CardContent>
        </Card>

        {/* Actividad */}
        {activity && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-medium">
                <ReceiptText className="h-4 w-4" /> Actividad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ActivityStat icon={<ShoppingCart className="h-4 w-4 text-primary"/>} label="Ventas" value={activity.total_sales} />
              <ActivityStat icon={<Package      className="h-4 w-4 text-amber-600"/>} label="Productos" value={activity.total_products} />
              <ActivityStat icon={<ReceiptText  className="h-4 w-4 text-green-600"/>} label="Transacciones" value={activity.total_transactions} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Suscripción — vista */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-medium">
            <Crown className="h-4 w-4" /> Suscripción actual
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-semibold">{user.plan_name ?? "Sin plan"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Estado</p>
              {user.subscription_status ? (
                <Badge className={`${STATUS_COLOR[user.subscription_status] ?? ""} border text-xs`}>
                  {STATUS_LABEL[user.subscription_status] ?? user.subscription_status}
                </Badge>
              ) : <p className="text-muted-foreground">—</p>}
            </div>
            {user.current_period_end && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Vence</p>
                <p>{new Date(user.current_period_end).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
            )}
            {user.trial_end_date && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Fin de prueba</p>
                <p>{new Date(user.trial_end_date).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Editar suscripción */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Editar suscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={planId} onValueChange={setPlanId} disabled={isSaving}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} {p.price_usd > 0 ? `· $${p.price_usd}` : "· Gratis"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={subStatus} onValueChange={setSubStatus} disabled={isSaving}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">Prueba</SelectItem>
                  <SelectItem value="ACTIVE">Activa</SelectItem>
                  <SelectItem value="PAST_DUE">Pago pendiente</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                  <SelectItem value="EXPIRED">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fin del período</Label>
              <Input
                type="date"
                value={periodEndDate}
                onChange={(e) => setPeriodEndDate(e.target.value)}
                disabled={isSaving}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fin de prueba</Label>
              <Input
                type="date"
                value={trialEndDate}
                onChange={(e) => setTrialEndDate(e.target.value)}
                disabled={isSaving}
                className="h-10"
              />
            </div>
          </div>

          <Button onClick={handleSaveSub} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {/* Zona de peligro */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Zona de peligro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {user.is_active ? "Desactivar usuario" : "Reactivar usuario"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.is_active
                  ? "El usuario no podrá iniciar sesión ni usar el sistema."
                  : "Permite al usuario volver a iniciar sesión."}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant={user.is_active ? "destructive" : "outline"}
                  size="sm"
                  disabled={isSaving}
                >
                  {user.is_active ? "Desactivar" : "Reactivar"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {user.is_active ? "¿Desactivar este usuario?" : "¿Reactivar este usuario?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {user.is_active
                      ? `"${displayName}" no podrá acceder al sistema hasta que sea reactivado.`
                      : `"${displayName}" volverá a tener acceso al sistema.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleToggleActive}>
                    {user.is_active ? "Sí, desactivar" : "Sí, reactivar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground">{label}: </span>
        <span className="font-medium break-all">{value}</span>
      </div>
    </div>
  );
}

function ActivityStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-bold text-base">{value}</span>
    </div>
  );
}

function LoadingSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
