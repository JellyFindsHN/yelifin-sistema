// app/(legal)/privacy/page.tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
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
            Política de privacidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: 27 de febrero de 2026
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed md:text-base">
          <p>
            Esta Política de privacidad explica cómo Nexly recopila, utiliza y
            protege la información asociada a tu cuenta y al uso de la
            plataforma.
          </p>

          <h2 className="text-lg font-semibold mt-6">1. Información que recopilamos</h2>
          <p>
            Recopilamos datos como tu nombre, correo electrónico, nombre del
            negocio y la información que registras en el sistema (productos,
            ventas, clientes, cuentas, etc.). También podemos registrar datos
            técnicos básicos como tipo de navegador, dirección IP aproximada y
            fechas de acceso para fines de seguridad y estadísticas.
          </p>

          <h2 className="text-lg font-semibold mt-6">2. Uso de la información</h2>
          <p>
            Usamos tus datos para operar la plataforma, mostrarte reportes,
            mejorar el servicio, ofrecer soporte técnico y, de forma opcional,
            enviarte comunicaciones relacionadas con tu cuenta o novedades del
            producto.
          </p>

          <h2 className="text-lg font-semibold mt-6">3. Compartir datos con terceros</h2>
          <p>
            No vendemos tu información. Solo compartimos datos con proveedores
            estrictamente necesarios para operar el servicio (por ejemplo,
            infraestructura en la nube, autenticación o pasarelas de pago), y
            siempre bajo acuerdos de confidencialidad y seguridad.
          </p>

          <h2 className="text-lg font-semibold mt-6">4. Seguridad</h2>
          <p>
            Aplicamos medidas razonables para proteger tu información, como
            conexiones cifradas y controles de acceso. Aun así, ningún sistema
            es 100% infalible, por lo que recomendamos utilizar contraseñas
            seguras y no compartir tus credenciales.
          </p>

          <h2 className="text-lg font-semibold mt-6">5. Tus derechos</h2>
          <p>
            Puedes solicitar la actualización o eliminación de tu cuenta y de
            los datos asociados, salvo que exista alguna obligación legal para
            conservarlos por más tiempo (por ejemplo, requisitos fiscales en tu
            país).
          </p>

          <h2 className="text-lg font-semibold mt-6">6. Cambios en esta política</h2>
          <p>
            Podemos actualizar esta Política de privacidad ocasionalmente. Te
            notificaremos dentro de la aplicación si realizamos cambios
            importantes.
          </p>

          <h2 className="text-lg font-semibold mt-6">7. Contacto</h2>
          <p>
            Si tienes preguntas sobre la privacidad de tus datos en Nexly,
            puedes escribirnos a través del canal de soporte disponible en la
            plataforma.
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