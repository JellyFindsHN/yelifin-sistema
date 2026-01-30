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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/50">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">
              Nexly
            </span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="lg">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/30">
                Registrarse Gratis
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-block">
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20">
              Sistema de Gestión para Emprendedores
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Conecta todo tu{" "}
            <span className="text-primary">
              emprendimiento
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Control total de inventario, ventas, finanzas y eventos. 
            La plataforma todo-en-uno para hacer crecer tu negocio.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 h-14 gap-2 shadow-lg shadow-primary/30">
                Comenzar Gratis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                Ver Características
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Gratis</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Disponible</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">Cloud</div>
              <div className="text-sm text-muted-foreground">En la nube</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Herramientas profesionales diseñadas específicamente para emprendedores
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-card p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Gestión de Inventario</h3>
            <p className="text-muted-foreground">
              Control preciso con método FIFO, variantes de productos, 
              alertas de stock bajo y seguimiento por lotes.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-card p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Punto de Venta</h3>
            <p className="text-muted-foreground">
              Interfaz rápida e intuitiva para registrar ventas, 
              aplicar descuentos y gestionar clientes leales.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-card p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Análisis de Rentabilidad</h3>
            <p className="text-muted-foreground">
              Conoce tus ganancias reales por producto, cliente y período. 
              Toma decisiones basadas en datos.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-card p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Base de Clientes</h3>
            <p className="text-muted-foreground">
              Programa de lealtad automático con descuentos progresivos 
              y historial completo de compras.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-card p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Control Financiero</h3>
            <p className="text-muted-foreground">
              Gestiona múltiples cuentas bancarias, efectivo y 
              registra todos tus gastos operativos.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-card p-8 rounded-2xl border hover:shadow-xl hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Gestión de Eventos</h3>
            <p className="text-muted-foreground">
              Planifica y analiza ferias y eventos con seguimiento 
              de inventario, gastos y ROI específico.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">
              ¿Por qué elegir Nexly?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">100% Gratuito</h3>
                  <p className="text-primary-foreground/80">Sin costos ocultos ni límites de uso</p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Fácil de Usar</h3>
                  <p className="text-primary-foreground/80">Interfaz intuitiva diseñada para emprendedores</p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Acceso desde Cualquier Lugar</h3>
                  <p className="text-primary-foreground/80">Web y móvil, siempre disponible</p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Seguro y Confiable</h3>
                  <p className="text-primary-foreground/80">Tus datos protegidos en la nube</p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Reportes Detallados</h3>
                  <p className="text-primary-foreground/80">Visualiza el crecimiento de tu emprendimiento</p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Soporte en Español</h3>
                  <p className="text-primary-foreground/80">Todo el sistema en tu idioma</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-primary/5 rounded-3xl p-12 border border-primary/20">
          <h2 className="text-4xl font-bold mb-4">
            Comienza a gestionar tu emprendimiento hoy
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            No necesitas tarjeta de crédito. Empieza ahora mismo y 
            lleva tu negocio al siguiente nivel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-12 h-14 gap-2 shadow-lg shadow-primary/30">
                Registrarse Gratis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-12 h-14">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Nexly</span>
            </div>
            
            <p className="text-muted-foreground text-sm">
              © 2025 Nexly. Sistema de gestión para emprendedores.
            </p>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-primary transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/register" className="hover:text-primary transition-colors">
                Registrarse
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