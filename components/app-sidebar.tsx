"use client"

import {
  BarChart3,
  Box,
  Calendar,
  ChevronDown,
  CreditCard,
  Home,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
  Settings,
  LogOut,
  Sparkles,
  User,
  Building2,
  Crown,
  Receipt,
  UserPlus,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { useSidebar } from "@/components/ui/sidebar"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Productos", url: "/products", icon: Package },
  {
    title: "Inventario",
    url: "/inventory",
    icon: Warehouse,
    submenu: [
      { title: "Vista General", url: "/inventory" },
      { title: "Movimientos", url: "/inventory/movements" },
      { title: "Ajustes", url: "/inventory/adjustments" },
    ],
  },
  {
    title: "Ventas",
    url: "/sales",
    icon: ShoppingCart,
    submenu: [
      { title: "Lista de Ventas", url: "/sales" },
      { title: "Nueva Venta (POS)", url: "/sales/new" },
    ],
  },
  { title: "Clientes", url: "/customers", icon: Users },
  {
    title: "Finanzas",
    url: "/finances",
    icon: CreditCard,
    submenu: [
      { title: "Cuentas", url: "/finances" },
      { title: "Transacciones", url: "/finances/transactions" },
    ],
  },
  { title: "Eventos", url: "/events", icon: Calendar },
  { title: "Suministros", url: "/supplies", icon: Box },
]

const secondaryNav = [
  {
    title: "Reportes",
    url: "/reports",
    icon: BarChart3,
    submenu: [
      { title: "Ventas", url: "/reports/sales" },
      { title: "Inventario", url: "/reports/inventory" },
      { title: "Rentabilidad", url: "/reports/profit" },
      { title: "Eventos", url: "/reports/events" },
    ],
  },
]

const settingsNav = [
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
    submenu: [
      { title: "Mi Perfil", url: "/settings/profile", icon: User },
      { title: "Mi Negocio", url: "/settings/organization", icon: Building2 },
      { title: "Programa de Lealtad", url: "/settings/loyalty", icon: Crown },
      { title: "Suscripción", url: "/settings/billing", icon: Receipt },
      { title: "Usuarios", url: "/settings/users", icon: UserPlus },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, firebaseUser } = useAuth()

  const { isMobile, setOpenMobile } = useSidebar()

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === url || pathname === "/"
    return pathname.startsWith(url)
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast.success("Sesión cerrada exitosamente")
      closeOnMobile()
      router.push("/")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión")
    }
  }

  const displayName =
    user?.profile?.business_name ||
    firebaseUser?.displayName ||
    firebaseUser?.email?.split("@")[0] ||
    "Usuario"

  const getUserInitials = () => {
    return displayName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const renderNavItems = (items: any[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        {item.submenu ? (
          <Collapsible
            defaultOpen={isActive(item.url)}
            className="group/collapsible"
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton isActive={isActive(item.url)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                {item.submenu.map((subitem: any) => (
                  <SidebarMenuSubItem key={subitem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === subitem.url}
                    >
                      <Link href={subitem.url} onClick={closeOnMobile}>
                        {subitem.title}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <Link href={item.url} onClick={closeOnMobile}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    ))

  return (
    <Sidebar
      // Esto ayuda a que el sidebar quede "pegado" y con su propio scroll
      className="sticky top-0 h-svh"
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link
          href="/dashboard"
          onClick={closeOnMobile}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">
            Nexly
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(mainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Análisis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(secondaryNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(settingsNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-1 flex-col items-start text-sm min-w-0">
                <span className="font-medium text-sidebar-foreground truncate w-full">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {firebaseUser?.email}
                </span>
              </div>

              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2 border-b mb-1">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {firebaseUser?.email}
              </p>

              {user?.subscription?.plan?.name && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
                  <Crown className="h-3 w-3" />
                  Plan {user.subscription.plan.name}
                </span>
              )}
            </div>

            <DropdownMenuItem asChild>
              <Link
                href="/settings/profile"
                onClick={closeOnMobile}
                className="flex items-center cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Mi Perfil
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/settings/organization"
                onClick={closeOnMobile}
                className="flex items-center cursor-pointer"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Mi Negocio
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/settings/billing"
                onClick={closeOnMobile}
                className="flex items-center cursor-pointer"
              >
                <Receipt className="mr-2 h-4 w-4" />
                Suscripción
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
