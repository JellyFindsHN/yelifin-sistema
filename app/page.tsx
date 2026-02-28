// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Package, ShoppingCart, TrendingUp, Users,
  DollarSign, Calendar, CheckCircle2, ArrowRight, Zap,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingCta }    from "@/components/landing/landing-cta";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-primary/5 via-background to-primary/5">

      <LandingHeader />

      {/* Hero */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="inline-block">
            <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium border border-primary/20">
              Sistema de Gestión para Emprendedores
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight px-4 sm:px-0">
            Conecta todo tu{" "}
            <span className="text-primary">emprendimiento</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
            Control total de inventario, ventas, finanzas y eventos.
            La plataforma todo-en-uno para hacer crecer tu negocio.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4 px-4 sm:px-0">
            <LandingCta />
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 sm:pt-12 max-w-2xl mx-auto">
            {[
              { value: "$9.99", label: "Por mes" },
              { value: "24/7",  label: "Disponible" },
              { value: "Cloud", label: "En la nube" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-bold text-primary">{s.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Precio simple y transparente</h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Sin sorpresas, sin tarifas ocultas. Cancela cuando quieras.
          </p>
        </div>
        <div className="max-w-lg mx-auto px-4 sm:px-0">
          <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="text-center mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Plan Profesional</h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl sm:text-5xl font-bold text-primary">$9.99</span>
                <span className="text-muted-foreground">USD/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Facturación mensual</p>
            </div>
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {[
                "Inventario ilimitado con método FIFO",
                "Punto de venta completo",
                "Gestión de clientes y lealtad",
                "Control financiero multi-cuenta",
                "Gestión de eventos y ferias",
                "Reportes y análisis detallados",
                "Soporte prioritario en español",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="block">
              <Button size="lg" className="w-full text-base sm:text-lg h-12 sm:h-14 gap-2 shadow-lg shadow-primary/30">
                Comenzar prueba gratuita
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <p className="text-xs sm:text-sm text-center text-muted-foreground mt-3 sm:mt-4">
              7 días gratis, sin tarjeta de crédito requerida
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Todo lo que necesitas en un solo lugar</h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Herramientas profesionales diseñadas específicamente para emprendedores
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[
            { icon: Package,      bg: "bg-primary/10",     color: "text-primary",      title: "Gestión de Inventario",    desc: "Control preciso con método FIFO, variantes de productos, alertas de stock bajo y seguimiento por lotes." },
            { icon: ShoppingCart, bg: "bg-emerald-500/10", color: "text-emerald-600",  title: "Punto de Venta",           desc: "Interfaz rápida e intuitiva para registrar ventas, aplicar descuentos y gestionar clientes leales." },
            { icon: TrendingUp,   bg: "bg-primary/10",     color: "text-primary",      title: "Análisis de Rentabilidad", desc: "Conoce tus ganancias reales por producto, cliente y período. Toma decisiones basadas en datos." },
            { icon: Users,        bg: "bg-orange-500/10",  color: "text-orange-600",   title: "Base de Clientes",         desc: "Programa de lealtad automático con descuentos progresivos y historial completo de compras." },
            { icon: DollarSign,   bg: "bg-amber-500/10",   color: "text-amber-600",    title: "Control Financiero",       desc: "Gestiona múltiples cuentas bancarias, efectivo y registra todos tus gastos operativos." },
            { icon: Calendar,     bg: "bg-rose-500/10",    color: "text-rose-600",     title: "Gestión de Eventos",       desc: "Planifica y analiza ferias y eventos con seguimiento de inventario, gastos y ROI específico." },
          ].map((f) => (
            <div key={f.title} className="bg-card p-6 sm:p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
              <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-primary text-primary-foreground py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center">¿Por qué elegir Nexly?</h2>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {[
              { title: "Precio Justo",               desc: "Solo $9.99/mes con todo incluido" },
              { title: "Fácil de Usar",              desc: "Interfaz intuitiva diseñada para emprendedores" },
              { title: "Acceso desde Cualquier Lugar", desc: "Web y móvil, siempre disponible" },
              { title: "Seguro y Confiable",         desc: "Tus datos protegidos en la nube" },
              { title: "Reportes Detallados",        desc: "Visualiza el crecimiento de tu emprendimiento" },
              { title: "Soporte en Español",         desc: "Todo el sistema en tu idioma" },
            ].map((b) => (
              <div key={b.title} className="flex gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">{b.title}</h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto text-center bg-primary/5 rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-primary/20">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            Comienza a gestionar tu emprendimiento hoy
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            Prueba gratuita de 7 días. Sin tarjeta de crédito requerida. Cancela cuando quieras.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <LandingCta />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg sm:text-xl font-bold">Nexly</span>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm text-center">
              © 2026 Nexly. Sistema de gestión para emprendedores.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <Link href="/login"    className="hover:text-primary transition-colors">Iniciar Sesión</Link>
              <Link href="/register" className="hover:text-primary transition-colors">Registrarse</Link>
              <Link href="#pricing"  className="hover:text-primary transition-colors">Precios</Link>
              <Link href="#features" className="hover:text-primary transition-colors">Características</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}