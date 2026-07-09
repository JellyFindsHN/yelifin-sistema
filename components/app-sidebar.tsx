// components/app-sidebar.tsx
"use client"

import {
  BarChart3, Box, Calendar, ChevronDown, ChevronsLeft, ChevronsRight, CreditCard,
  Home, ShoppingCart, Users, Warehouse, Settings,
  LogOut, User, Building2, Crown, Receipt,
  Shield, Tags, Wallet, ArrowLeftRight, UserCog,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { useMe }   from "@/hooks/swr/use-me"
import type { OrgModule } from "@/types"
import { toast } from "sonner"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { KontaIcon } from "@/components/shared/konta-icon"
import { KontaTitle } from "@/components/shared/konta-title"

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle }   from "@/components/theme-toggle"
import { PrivacyToggle } from "@/components/privacy-toggle"

// ── Plan-specific nav (finanzas plan: flat finance items) ────────────────
const financesOnlyNav = [
  { title: "Cuentas",          url: "/finances",                icon: Wallet },
  { title: "Transacciones",    url: "/finances/transactions",   icon: ArrowLeftRight },
  { title: "Tarjetas crédito", url: "/finances/credit-cards",   icon: CreditCard },
]

// ── Nav config ──────────────────────────────────────────────────────────
const mainNav: Array<{
  title: string; url: string; icon: any; module?: OrgModule;
  submenu?: Array<{ title: string; url: string }>;
}> = [
  { title: "Dashboard",    url: "/dashboard",  icon: Home, module: "DASHBOARD" as OrgModule },
  {
    title: "Inventario", url: "/inventory", icon: Warehouse, module: "INVENTORY",
    submenu: [
      { title: "Productos",    url: "/inventory" },
      { title: "Movimientos",  url: "/inventory/movements" },
      { title: "En camino",    url: "/purchases/pending" },
    ],
  },
  {
    title: "Ventas", url: "/sales", icon: ShoppingCart, module: "SALES",
    submenu: [
      { title: "Lista de Ventas",    url: "/sales" },
      { title: "Nueva Venta (POS)", url: "/sales/new" },
    ],
  },
  { title: "Clientes",    url: "/customers", icon: Users,     module: "CUSTOMERS" },
  {
    title: "Finanzas", url: "/finances", icon: CreditCard, module: "FINANCES",
    submenu: [
      { title: "Cuentas",          url: "/finances" },
      { title: "Transacciones",    url: "/finances/transactions" },
      { title: "Tarjetas crédito", url: "/finances/credit-cards" },
    ],
  },
  { title: "Eventos",     url: "/events",   icon: Calendar,  module: "EVENTS" },
  { title: "Suministros", url: "/supplies", icon: Box,        module: "INVENTORY" },
]

const secondaryNav: Array<{
  title: string; url: string; icon: any; module?: OrgModule;
  submenu?: Array<{ title: string; url: string }>;
}> = [
  {
    title: "Reportes", url: "/reports", icon: BarChart3, module: "REPORTS",
    submenu: [
      { title: "Ventas",        url: "/reports/sales" },
      { title: "Inventario",    url: "/reports/inventory" },
      { title: "Rentabilidad",  url: "/reports/profit" },
      { title: "Eventos",       url: "/reports/events" },
    ],
  },
]

const adminNav = [
  {
    title: "Administración", url: "/admin", icon: Shield,
    submenu: [
      { title: "Resumen",   url: "/admin" },
      { title: "Usuarios",  url: "/admin/users" },
      { title: "Planes",    url: "/admin/plans" },
    ],
  },
]

const settingsNavBase = [
  { title: "Mi Perfil",   url: "/settings/profile",       icon: User },
  { title: "Mi Negocio",  url: "/settings/organization",  icon: Building2 },
  { title: "Categorías",  url: "/settings/categories",    icon: Tags },
  { title: "Suscripción", url: "/settings/billing",       icon: Receipt },
]

const settingsNavOwner = [
  { title: "Equipo",      url: "/settings/members",       icon: Users },
  { title: "Roles",       url: "/settings/roles",         icon: UserCog },
]

// ── Icon-only item (collapsed) ─────────────────────────────────────────
function CollapsedItem({
  item,
  isActive,
  closeOnMobile,
  pathname,
}: {
  item: any;
  isActive: (url: string) => boolean;
  closeOnMobile: () => void;
  pathname: string;
}) {
  return (
    <SidebarMenuItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.url)}
            className="justify-center"
          >
            <Link href={item.submenu ? item.submenu[0].url : item.url} onClick={closeOnMobile}>
              <item.icon className="size-4" />
            </Link>
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-0.5 py-2 px-3 bg-foreground text-background">
          <span className="font-medium text-sm text-background">{item.title}</span>
          {item.submenu && (
            <div className="flex flex-col gap-0.5 mt-1">
              {item.submenu.map((s: any) => (
                <Link
                  key={s.url}
                  href={s.url}
                  onClick={closeOnMobile}
                  className={`text-xs transition-opacity text-background ${
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
}

// ── Full item (expanded) ───────────────────────────────────────────────
const navIconCls = "flex items-center justify-center size-7 rounded-full group-hover/navbtn:bg-sidebar-accent-foreground/10 group-data-[active=true]/navbtn:bg-sidebar-accent-foreground/10 transition-colors shrink-0"

function ExpandedItem({
  item,
  isActive,
  closeOnMobile,
  pathname,
}: {
  item: any;
  isActive: (url: string) => boolean;
  closeOnMobile: () => void;
  pathname: string;
}) {
  return (
    <SidebarMenuItem>
      {item.submenu ? (
        <Collapsible defaultOpen={isActive(item.url)} className="group/collapsible">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={isActive(item.url)}
              className="group/navbtn h-11 hover:rounded-xl data-[active=true]:rounded-xl"
            >
              <span className={navIconCls}>
                <item.icon className="size-4 shrink-0" />
              </span>
              <span>{item.title}</span>
              <span className={cn(navIconCls, "ml-auto")}>
                <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </span>
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
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url)}
          className="group/navbtn h-11 hover:rounded-xl data-[active=true]:rounded-xl"
        >
          <Link href={item.url} onClick={closeOnMobile}>
            <span className={navIconCls}>
              <item.icon className="size-4 shrink-0" />
            </span>
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}

// ── Component ───────────────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname()
  const { push } = useRouter()
  const { user, firebaseUser }  = useAuth()
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar()

  const { isOwner, org, getModulePermissions, isLoading: meIsLoading } = useMe()
  const isAdmin      = user?.subscription?.plan?.slug === "admin"
  const planSlug     = user?.subscription?.plan?.slug ?? null
  const isFinanzas   = planSlug === "finanzas"

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
      push("/")
    } catch {
      toast.error("Error al cerrar sesión")
    }
  }

  const displayName =
    user?.profile?.business_name      ||
    org?.name                         ||
    firebaseUser?.displayName         ||
    firebaseUser?.email?.split("@")[0] ||
    "Usuario"

  const getUserInitials = () =>
    displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)



  const canViewModule = (module?: OrgModule) => {
    if (!module || meIsLoading) return true
    return getModulePermissions(module).can_view
  }

  const visibleMainNav = mainNav.filter(item => canViewModule(item.module))
  const visibleSecondaryNav = secondaryNav.filter(item => canViewModule(item.module))

  const renderNav = (items: typeof mainNav) =>
    items.map((item) =>
      isCollapsed
        ? <CollapsedItem key={item.title} item={item} isActive={isActive} closeOnMobile={closeOnMobile} pathname={pathname} />
        : <ExpandedItem  key={item.title} item={item} isActive={isActive} closeOnMobile={closeOnMobile} pathname={pathname} />
    )

  return (
    <TooltipProvider delayDuration={200}>
      <Sidebar collapsible="icon" variant="floating" className="sticky top-0 h-svh">

        {/* ── Header ── */}
        <SidebarHeader className="px-4 py-3">
          <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between gap-2"}`}>
            <Link
              href="/dashboard"
              onClick={closeOnMobile}
              className="flex items-center gap-2"
            >
              <KontaIcon className="size-8" />
              {!isCollapsed && <KontaTitle className="h-5" />}
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
              className="hidden size-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:flex"
            >
              {isCollapsed
                ? <ChevronsRight className="size-4" />
                : <ChevronsLeft className="size-4" />}
            </button>
          </div>
        </SidebarHeader>

        {/* ── Content ── */}
        <SidebarContent>
          {isFinanzas ? (
            // Finanzas plan: flat finance nav, no dashboard, no other sections
            <SidebarGroup>
              {!isCollapsed && <SidebarGroupLabel>Finanzas</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>{renderNav(financesOnlyNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <>
              <SidebarGroup>
                {!isCollapsed && <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>{renderNav(visibleMainNav)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {visibleSecondaryNav.length > 0 && (
                <SidebarGroup>
                  {!isCollapsed && <SidebarGroupLabel>Análisis</SidebarGroupLabel>}
                  <SidebarGroupContent>
                    <SidebarMenu>{renderNav(visibleSecondaryNav)}</SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {isAdmin && (
                <SidebarGroup>
                  {!isCollapsed && <SidebarGroupLabel>Admin</SidebarGroupLabel>}
                  <SidebarGroupContent>
                    <SidebarMenu>{renderNav(adminNav)}</SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </>
          )}

          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Sistema</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderNav([{
                  title: "Configuración", url: "/settings", icon: Settings,
                  submenu: [
                    ...settingsNavBase,
                    ...(isOwner ? settingsNavOwner : []),
                  ],
                }])}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </SidebarContent>

        {/* ── Footer ── */}
        <SidebarFooter className="border-t border-sidebar-border p-3 gap-1">
          <PrivacyToggle isCollapsed={isCollapsed} />
          <ThemeToggle isCollapsed={isCollapsed} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex w-full items-center rounded-lg p-2 hover:bg-sidebar-accent transition-colors ${isCollapsed ? "justify-center" : "gap-3"}`}>
                <Avatar className="size-8 shrink-0">
                  <AvatarImage
                    src={org?.logo_url ?? user?.profile?.business_logo_url ?? undefined}
                    alt={displayName}
                    className="object-cover"
                  />
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
                    <ChevronDown className="size-4 text-muted-foreground shrink-0" />
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
                    <Shield className="size-3" /> Admin
                  </span>
                ) : (
                  user?.subscription?.plan?.name && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
                      <Crown className="size-3" /> Plan {user.subscription.plan.name}
                    </span>
                  )
                )}
              </div>

              <DropdownMenuItem asChild>
                <Link href="/settings/profile" onClick={closeOnMobile} className="flex items-center cursor-pointer">
                  <User className="mr-2 size-4" /> Mi Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/organization" onClick={closeOnMobile} className="flex items-center cursor-pointer">
                  <Building2 className="mr-2 size-4" /> Mi Negocio
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing" onClick={closeOnMobile} className="flex items-center cursor-pointer">
                  <Receipt className="mr-2 size-4" /> Suscripción
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 size-4" /> Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>

      </Sidebar>
    </TooltipProvider>
  )
}