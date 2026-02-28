// app/(legal)/terms/page.tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header simple */}
      <header className="border-b bg-card/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <span className="text-lg font-semibold">Nexly</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-16 space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Términos de servicio
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: 27 de febrero de 2026
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed md:text-base">
          <p>
            Al crear una cuenta en Nexly y utilizar la plataforma, aceptas
            estos Términos de servicio. Si no estás de acuerdo con alguna
            parte, no debes usar el sistema.
          </p>

          <h2 className="text-lg font-semibold mt-6">1. Uso de la plataforma</h2>
          <p>
            Nexly está diseñado para ayudarte a gestionar el inventario, las
            ventas, las finanzas y los eventos de tu emprendimiento. Eres
            responsable de toda la información que registres en tu cuenta y de
            que su uso cumpla con las leyes aplicables en tu país.
          </p>

          <h2 className="text-lg font-semibold mt-6">2. Cuenta y seguridad</h2>
          <p>
            Debes mantener la confidencialidad de tus credenciales de acceso y
            notificar inmediatamente si detectas un acceso no autorizado.
            Nexly no se hace responsable por pérdidas causadas por el uso
            indebido de tu cuenta.
          </p>

          <h2 className="text-lg font-semibold mt-6">3. Suscripciones y pagos</h2>
          <p>
            Ofrecemos un periodo de prueba gratuito de 30 días. Al finalizar la
            prueba, podrás suscribirte a un plan de pago si deseas continuar
            usando el sistema. Los precios, periodos de facturación y
            condiciones de cancelación se mostrarán claramente en la sección de
            suscripción dentro de la aplicación.
          </p>

          <h2 className="text-lg font-semibold mt-6">4. Datos y respaldo</h2>
          <p>
            Hacemos esfuerzos razonables para mantener la disponibilidad del
            servicio y proteger tus datos. Sin embargo, te recomendamos realizar
            tus propios respaldos periódicos de la información que consideres
            crítica para tu negocio.
          </p>

          <h2 className="text-lg font-semibold mt-6">5. Cambios en los términos</h2>
          <p>
            Podemos actualizar estos Términos de servicio en el futuro. Si los
            cambios son relevantes, te lo notificaremos dentro de la
            aplicación. El uso continuado del servicio después de la
            actualización implica la aceptación de los nuevos términos.
          </p>

          <h2 className="text-lg font-semibold mt-6">6. Contacto</h2>
          <p>
            Si tienes dudas sobre estos términos, puedes escribirnos al correo
            indicado en la sección de soporte dentro de la aplicación.
          </p>
        </section>

        <div className="pt-6">
          <Link href="/register">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              Crear cuenta y comenzar la prueba
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}