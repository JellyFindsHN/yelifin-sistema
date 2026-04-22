// app/(dashboard)/settings/organization/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

import { useMe, useUpdateProfile, useUploadLogo } from "@/hooks/swr/use-me";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Skeleton }  from "@/components/ui/skeleton";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Building2, Upload, X, Loader2, Save, ImageIcon,
} from "lucide-react";

// ── Opciones ──────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: "America/Tegucigalpa",         label: "Honduras (Tegucigalpa)" },
  { value: "America/Guatemala",           label: "Guatemala" },
  { value: "America/El_Salvador",         label: "El Salvador" },
  { value: "America/Managua",             label: "Nicaragua" },
  { value: "America/Costa_Rica",          label: "Costa Rica" },
  { value: "America/Panama",              label: "Panamá" },
  { value: "America/Mexico_City",         label: "México (Ciudad de México)" },
  { value: "America/Bogota",              label: "Colombia (Bogotá)" },
  { value: "America/Lima",               label: "Perú (Lima)" },
  { value: "America/Santiago",            label: "Chile (Santiago)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Caracas",             label: "Venezuela (Caracas)" },
  { value: "America/New_York",            label: "EE.UU. Este (New York)" },
  { value: "America/Chicago",             label: "EE.UU. Central (Chicago)" },
  { value: "America/Los_Angeles",         label: "EE.UU. Pacífico (Los Ángeles)" },
  { value: "Europe/Madrid",               label: "España (Madrid)" },
  { value: "UTC",                         label: "UTC" },
];

const CURRENCIES = [
  { value: "HNL", label: "HNL — Lempira hondureño" },
  { value: "USD", label: "USD — Dólar estadounidense" },
  { value: "GTQ", label: "GTQ — Quetzal guatemalteco" },
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "COP", label: "COP — Peso colombiano" },
  { value: "PEN", label: "PEN — Sol peruano" },
  { value: "CLP", label: "CLP — Peso chileno" },
  { value: "ARS", label: "ARS — Peso argentino" },
  { value: "EUR", label: "EUR — Euro" },
];

// ── Componente ────────────────────────────────────────────────────────

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { user, profile, isLoading, mutate } = useMe();
  const { updateProfile, isSaving }           = useUpdateProfile();
  const { uploadLogo, isUploading }           = useUploadLogo();

  // Form state
  const [displayName,   setDisplayName]   = useState("");
  const [businessName,  setBusinessName]  = useState("");
  const [logoUrl,       setLogoUrl]       = useState<string | null>(null);
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null);
  const [pendingFile,   setPendingFile]   = useState<File | null>(null);
  const [timezone,      setTimezone]      = useState("");
  const [currency,      setCurrency]      = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar form con datos actuales
  useEffect(() => {
    if (user && profile) {
      setDisplayName(user.display_name ?? "");
      setBusinessName(profile.business_name ?? "");
      setLogoUrl(profile.business_logo_url ?? null);
      setTimezone(profile.timezone ?? "America/Tegucigalpa");
      setCurrency(profile.currency ?? "HNL");
    }
  }, [user, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes (JPG, PNG, WebP, GIF)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no puede superar 2 MB");
      return;
    }

    setPendingFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setPendingFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    try {
      let finalLogoUrl = logoUrl;

      // Subir imagen si hay una pendiente
      if (pendingFile) {
        finalLogoUrl = await uploadLogo(pendingFile);
        setPendingFile(null);
        setLogoPreview(null);
        setLogoUrl(finalLogoUrl);
      }

      await updateProfile({
        display_name:     displayName.trim() || null,
        business_name:    businessName.trim() || null,
        business_logo_url: finalLogoUrl,
        timezone,
        currency,
      });

      await mutate();
      toast.success("Datos actualizados correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error al guardar los cambios");
    }
  };

  const currentLogo = logoPreview ?? logoUrl;
  const busy        = isSaving || isUploading;

  // ── Skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 pb-24 md:space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 md:space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi negocio</h1>
          <p className="text-muted-foreground text-sm">
            Actualizá el nombre, logo y configuración de tu negocio.
          </p>
        </div>
      </div>

      {/* Logo del negocio */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Logo del negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="h-20 w-20 rounded-xl border bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
              {currentLogo ? (
                <Image
                  src={currentLogo}
                  alt="Logo del negocio"
                  width={80}
                  height={80}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {currentLogo ? "Cambiar imagen" : "Subir logo"}
              </Button>
              {currentLogo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={handleRemoveLogo}
                  disabled={busy}
                >
                  <X className="h-3.5 w-3.5" />
                  Eliminar logo
                </Button>
              )}
            </div>
          </div>

          {pendingFile && (
            <p className="text-xs text-muted-foreground">
              Imagen seleccionada: <span className="font-medium">{pendingFile.name}</span>.
              Se subirá al guardar.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP o GIF · Máximo 2 MB · Recomendado: cuadrado, min. 200×200 px.
          </p>
        </CardContent>
      </Card>

      {/* Datos del negocio */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Nombre visible</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre o apodo"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Cómo aparecés en el sistema.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessName">Nombre del negocio</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej. Tienda Don José"
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={busy}>
              <SelectTrigger id="timezone" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Moneda principal</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={busy}>
              <SelectTrigger id="currency" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se usa para mostrar precios y calcular totales en el sistema.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botón de guardar — fijo en la parte inferior en mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-3 bg-background/95 backdrop-blur border-t md:static md:border-0 md:bg-transparent md:backdrop-blur-none md:px-0 md:pt-0 md:pb-0">
        <Button
          className="w-full md:w-auto gap-2"
          onClick={handleSave}
          disabled={busy}
        >
          {busy ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
          ) : (
            <><Save className="h-4 w-4" />Guardar cambios</>
          )}
        </Button>
      </div>
    </div>
  );
}
