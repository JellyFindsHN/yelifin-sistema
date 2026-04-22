// app/(dashboard)/admin/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/swr/use-me";
import { useAdminStats } from "@/hooks/swr/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserCheck, UserX, TrendingUp, Shield,
  ChevronRight, Crown,
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

export default function AdminPage() {
  const router = useRouter();
  const { profile, isLoading: meLoading } = useMe();
  const { counts, planStats, recentUsers, isLoading } = useAdminStats();

  // Redirect if not admin (plan slug is not "admin")
  // The sidebar already hides the link, but guard here just in case
  if (!meLoading && !profile) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">Gestión de usuarios y suscripciones</p>
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : counts ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Usuarios totales"
            value={counts.total_users}
            bg="bg-primary/5"
          />
          <StatCard
            icon={<UserCheck className="h-5 w-5 text-green-600" />}
            label="Con suscripción activa"
            value={counts.active_count}
            bg="bg-green-50 dark:bg-green-950/20"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
            label="En período de prueba"
            value={counts.trial_count}
            bg="bg-blue-50 dark:bg-blue-950/20"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
            label="Nuevos este mes"
            value={counts.new_this_month}
            bg="bg-amber-50 dark:bg-amber-950/20"
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Plans breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-muted-foreground" />
              Usuarios por plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : planStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              planStats.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant="secondary">{p.user_count} usuario{p.user_count !== 1 ? "s" : ""}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Subscription status breakdown */}
        {counts && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserX className="h-4 w-4 text-muted-foreground" />
                Estado de suscripciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(["TRIAL","ACTIVE","PAST_DUE","CANCELLED","EXPIRED"] as const).map((s) => {
                const countKey = `${s.toLowerCase()}_count` as keyof typeof counts;
                const val = counts[countKey] as number;
                return (
                  <div key={s} className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">{STATUS_LABEL[s]}</span>
                    <Badge className={`${STATUS_COLOR[s]} border text-xs font-medium`}>
                      {val}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent users */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Usuarios recientes</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => router.push("/admin/users")}>
            Ver todos <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="divide-y">
              {recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-3 gap-3 cursor-pointer hover:bg-muted/30 px-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => router.push(`/admin/users/${u.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(u as any).business_name || u.display_name || u.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(u as any).subscription_status && (
                      <Badge className={`${STATUS_COLOR[(u as any).subscription_status] ?? ""} border text-xs hidden sm:flex`}>
                        {STATUS_LABEL[(u as any).subscription_status] ?? (u as any).subscription_status}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("es-HN", { day: "numeric", month: "short" })}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: number; bg: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className={`p-4 rounded-xl ${bg}`}>
        <div className="flex items-center gap-2 mb-2">{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
