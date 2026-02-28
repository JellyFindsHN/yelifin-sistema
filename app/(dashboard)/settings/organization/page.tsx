"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function OrganizationSettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-4 pb-24 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Mi negocio</h1>
          <p className="text-muted-foreground text-sm">
            Aquí podrás configurar el nombre de tu negocio, moneda, zona horaria
            y otros detalles generales.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/settings/profile")}
          >
            Volver a mi perfil
          </Button>
        </div>
      </div>

      {/* Placeholder principal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">
            Configuración en construcción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Esta sección todavía no está disponible, pero aquí vas a poder:
          </p>

          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Editar el nombre y logo de tu negocio.</li>
            <li>Configurar la moneda principal.</li>
            <li>Definir tu zona horaria.</li>
            <li>Personalizar algunos ajustes generales del sistema.</li>
          </ul>

          <Separator />

          <p className="text-xs text-muted-foreground">
            Por ahora, puedes ver los datos básicos de tu negocio en{" "}
            <span className="font-medium">Mi perfil</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}