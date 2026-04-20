// components/app-sidebar.tsx
"use client"

import {
  BarChart3, Box, Calendar, ChevronDown, CreditCard,
  Home, ShoppingCart, Users, Warehouse, Settings,
  LogOut, User, Zap, Building2, Crown, Receipt,
  Shield, Tags
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { useSidebar } from "@/components/ui/sidebar"

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// ── Nav config ──────────────────────────────────────────────────────────
const mainNav = [
  { title: "Dashboard",    url: "/dashboard",  icon: Home },
  {
    title: "Inventario", url: "/inventory", icon: Warehouse,
    submenu: [
      { title: "Productos",    url: "/inventory" },
      { title: "Movimientos",  url: "/inventory/movements" },
    ],
  },
  {
    title: "Ventas", url: "/sales", icon: ShoppingCart,
    submenu: [
      { title: "Lista de Ventas",    url: "/sales" },
      { title: "Nueva Venta (POS)", url: "/sales/new" },
    ],
  },
  { title: "Clientes",    url: "/customers", icon: Users },
  {
    title: "Finanzas", url: "/finances", icon: CreditCard,
    submenu: [
      { title: "Cuentas",          url: "/finances" },
      { title: "Transacciones",    url: "/finances/transactions" },
      { title: "Tarjetas crédito", url: "/finances/credit-cards" },
    ],
  },
  { title: "Eventos",     url: "/events",   icon: Calendar },
  { title: "Suministros", url: "/supplies", icon: Box },
]

const secondaryNav = [
  {
    title: "Reportes", url: "/reports", icon: BarChart3,
    submenu: [
      { title: "Ventas",        url: "/reports/sales" },
      { title: "Inventario",    url: "/reports/inventory" },
      { title: "Rentabilidad",  url: "/reports/profit" },
      { title: "Eventos",       url: "/reports/events" },
    ],
  },
]

const settingsNav = [
  {
    title: "Configuración", url: "/settings", icon: Settings,
    submenu: [
      { title: "Mi Perfil",           url: "/settings/profile",       icon: User },
      { title: "Mi Negocio",          url: "/settings/organization",  icon: Building2 },
      { title: "Categorías",          url: "/settings/categories",    icon: Tags },
      { title: "Suscripción",         url: "/settings/billing",       icon: Receipt },

      //debe de ser para el panel Admin, no para todos los usuarios
  //  { title: "Usuarios",            url: "/settings/users",         icon: UserPlus },
    ],
  },
]

// ── Component ───────────────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, firebaseUser }  = useAuth()
  const { isMobile, setOpenMobile, state } = useSidebar()

  const isCollapsed  = !isMobile && state === "collapsed"
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false) }

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === url || pathname === "/"
    return pathname.startsWith(url)
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      document.cookie = "token=; Max-Age=0; path=/"
      toast.success("Sesión cerrada exitosamente")
      closeOnMobile()
      router.push("/")
    } catch {
      toast.error("Error al cerrar sesión")
    }
  }

  const displayName =
    user?.profile?.business_name ||
    firebaseUser?.displayName    ||
    firebaseUser?.email?.split("@")[0] ||
    "Usuario"

  const getUserInitials = () =>
    displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  const isAdmin = user?.subscription?.plan?.name === "Admin"

  // ── Icon-only item (collapsed) ─────────────────────────────────────
  const CollapsedItem = ({ item }: { item: any }) => (
    <SidebarMenuItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.url)}
            className="justify-center"
          >
            <Link href={item.submenu ? item.submenu[0].url : item.url} onClick={closeOnMobile}>
              <item.icon className="h-4 w-4" />
            </Link>
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-0.5 py-2 px-3 bg-foreground text-background">
          <span className="font-medium text-sm text-white">{item.title}</span>
          {item.submenu && (
            <div className="flex flex-col gap-0.5 mt-1">
              {item.submenu.map((s: any) => (
                <Link
                  key={s.url}
                  href={s.url}
                  onClick={closeOnMobile}
                  className={`text-xs transition-opacity text-white ${
                    pathname === s.url
                      ? "font-medium opacity-100"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {s.title}
                </Link>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </SidebarMenuItem>
  )

  // ── Full item (expanded) ───────────────────────────────────────────
  const ExpandedItem = ({ item }: { item: any }) => (
    <SidebarMenuItem>
      {item.submenu ? (
        <Collapsible defaultOpen={isActive(item.url)} className="group/collapsible">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton isActive={isActive(item.url)}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
              <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.submenu.map((sub: any) => (
                <SidebarMenuSubItem key={sub.title}>
                  <SidebarMenuSubButton asChild isActive={pathname === sub.url}>
                    <Link href={sub.url} onClick={closeOnMobile}>{sub.title}</Link>
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
  )

  const renderNav = (items: any[]) =>
    items.map((item) =>
      isCollapsed
        ? <CollapsedItem key={item.title} item={item} />
        : <ExpandedItem  key={item.title} item={item} />
    )

  return (
    <TooltipProvider delayDuration={200}>
      <Sidebar collapsible="icon" className="sticky top-0 h-svh">

        {/* ── Header ── */}
        <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
          <Link
            href="/dashboard"
            onClick={closeOnMobile}
            className={`flex items-center gap-2 ${isCollapsed ? "justify-center" : ""}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-semibold text-sidebar-foreground">Konta</span>
            )}
          </Link>
        </SidebarHeader>

        {/* ── Content ── */}
        <SidebarContent>
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderNav(mainNav)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup>
              {!isCollapsed && <SidebarGroupLabel>Análisis</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>{renderNav(secondaryNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

            <SidebarGroup>
              {!isCollapsed && <SidebarGroupLabel>Sistema</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>{renderNav(settingsNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

        </SidebarContent>

        {/* ── Footer ── */}
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex w-full items-center rounded-lg p-2 hover:bg-sidebar-accent transition-colors ${isCollapsed ? "justify-center" : "gap-3"}`}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="flex flex-1 flex-col items-start text-sm min-w-0">
                      <span className="font-medium text-sidebar-foreground truncate w-full">{displayName}</span>
                      <span className="text-xs text-muted-foreground truncate w-full">{firebaseUser?.email}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={isCollapsed ? "right" : "top"}
              align={isCollapsed ? "start" : "end"}
              className="w-56"
            >
              <div className="px-2 py-2 border-b mb-1">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{firebaseUser?.email}</p>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-emerald-600">
                    <Shield className="h-3 w-3" /> Admin
                  </span>
                ) : (
                  user?.subscription?.plan?.name && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
                      <Crown className="h-3 w-3" /> Plan {user.subscription.plan.name}
                    </span>
                  )
                )}
              </div>

              <DropdownMenuItem asChild>
                <Link href="/settings/profile" onClick={closeOnMobile} className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" /> Mi Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/organization" onClick={closeOnMobile} className="flex items-center cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" /> Mi Negocio
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing" onClick={closeOnMobile} className="flex items-center cursor-pointer">
                  <Receipt className="mr-2 h-4 w-4" /> Suscripción
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>

      </Sidebar>
    </TooltipProvider>
  )
}