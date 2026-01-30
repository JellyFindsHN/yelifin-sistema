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
  FileText,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Productos",
    url: "/products",
    icon: Package,
  },
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
  {
    title: "Clientes",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Finanzas",
    url: "/finances",
    icon: CreditCard,
    submenu: [
      { title: "Dashboard", url: "/finances" },
      { title: "Cuentas", url: "/finances/accounts" },
      { title: "Transacciones", url: "/finances/transactions" },
    ],
  },
  {
    title: "Eventos",
    url: "/events",
    icon: Calendar,
  },
  {
    title: "Suministros",
    url: "/supplies",
    icon: Box,
  },
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

export function AppSidebar() {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === url || pathname === "/"
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">JellyFinds</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
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
                          {item.submenu.map((subitem) => (
                            <SidebarMenuSubItem key={subitem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subitem.url}>
                                <Link href={subitem.url}>{subitem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Análisis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
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
                          {item.submenu.map((subitem) => (
                            <SidebarMenuSubItem key={subitem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subitem.url}>
                                <Link href={subitem.url}>{subitem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">JF</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start text-sm">
                <span className="font-medium text-sidebar-foreground">Demo Usuario</span>
                <span className="text-xs text-muted-foreground">Administrador</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/organization/settings" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Organización
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
