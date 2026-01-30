import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Zap
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-primary/5">
      {/* Header/Navbar */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/50">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-primary">
              Nexly
            </span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="sm:size-lg">
                <span className="hidden sm:inline">Iniciar Sesión</span>
                <span className="sm:hidden">Entrar</span>
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-2 shadow-lg shadow-primary/30 sm:size-lg">
                <span className="hidden sm:inline">Registrarse</span>
                <span className="sm:hidden">Registro</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="inline-block">
            <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium border border-primary/20">
              Sistema de Gestión para Emprendedores
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight px-4 sm:px-0">
            Conecta todo tu{" "}
            <span className="text-primary">
              emprendimiento
            </span>
          </h1>
          
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
            Control total de inventario, ventas, finanzas y eventos. 
            La plataforma todo-en-uno para hacer crecer tu negocio.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4 px-4 sm:px-0">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 gap-2 shadow-lg shadow-primary/30">
                Comenzar Ahora
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link href="#pricing" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14">
                Ver Precios
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 sm:pt-12 max-w-2xl mx-auto px-4 sm:px-0">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">$4.99</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Por mes</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">24/7</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Disponible</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">Cloud</div>
              <div className="text-xs sm:text-sm text-muted-foreground">En la nube</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 px-4 sm:px-0">
            Precio simple y transparente
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
            Sin sorpresas, sin tarifas ocultas. Cancela cuando quieras.
          </p>
        </div>

        <div className="max-w-lg mx-auto px-4 sm:px-0">
          <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="text-center mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Plan Profesional</h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl sm:text-5xl font-bold text-primary">$4.99</span>
                <span className="text-muted-foreground">USD/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Facturación mensual</p>
            </div>

            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Inventario ilimitado con método FIFO</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Punto de venta completo</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Gestión de clientes y lealtad</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Control financiero multi-cuenta</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Gestión de eventos y ferias</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Reportes y análisis detallados</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Soporte prioritario en español</span>
              </li>
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

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 px-4 sm:px-0">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
            Herramientas profesionales diseñadas específicamente para emprendedores
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="bg-card p-6 sm:p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Gestión de Inventario</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Control preciso con método FIFO, variantes de productos, 
              alertas de stock bajo y seguimiento por lotes.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-card p-6 sm:p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Punto de Venta</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Interfaz rápida e intuitiva para registrar ventas, 
              aplicar descuentos y gestionar clientes leales.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-card p-6 sm:p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Análisis de Rentabilidad</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Conoce tus ganancias reales por producto, cliente y período. 
              Toma decisiones basadas en datos.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-card p-6 sm:p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Base de Clientes</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Programa de lealtad automático con descuentos progresivos 
              y historial completo de compras.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-card p-6 sm:p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Control Financiero</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gestiona múltiples cuentas bancarias, efectivo y 
              registra todos tus gastos operativos.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-card p-6 sm:p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Gestión de Eventos</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Planifica y analiza ferias y eventos con seguimiento 
              de inventario, gastos y ROI específico.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-primary text-primary-foreground py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center px-4 sm:px-0">
              ¿Por qué elegir Nexly?
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">Precio Justo</h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80">Solo $4.99/mes con todo incluido</p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">Fácil de Usar</h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80">Interfaz intuitiva diseñada para emprendedores</p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">Acceso desde Cualquier Lugar</h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80">Web y móvil, siempre disponible</p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">Seguro y Confiable</h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80">Tus datos protegidos en la nube</p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">Reportes Detallados</h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80">Visualiza el crecimiento de tu emprendimiento</p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">Soporte en Español</h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80">Todo el sistema en tu idioma</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto text-center bg-primary/5 rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-primary/20">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-4 sm:px-0">
            Comienza a gestionar tu emprendimiento hoy
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4 sm:px-0">
            Prueba gratuita de 7 días. Sin tarjeta de crédito requerida.
            Cancela cuando quieras.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-12 h-12 sm:h-14 gap-2 shadow-lg shadow-primary/30">
                Comenzar Prueba Gratis
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-12 h-12 sm:h-14">
                Iniciar Sesión
              </Button>
            </Link>
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
              <Link href="/login" className="hover:text-primary transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/register" className="hover:text-primary transition-colors">
                Registrarse
              </Link>
              <Link href="#pricing" className="hover:text-primary transition-colors">
                Precios
              </Link>
              <Link href="#features" className="hover:text-primary transition-colors">
                Características
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}