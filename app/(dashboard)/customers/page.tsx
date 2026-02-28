// app/(dashboard)/customers/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Users, TrendingUp, ShoppingCart, Pencil, Trash2 } from "lucide-react";
import { useCustomers, Customer } from "@/hooks/swr/use-costumers";
import { useCurrency } from "@/hooks/swr/use-currency";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { EditCustomerDialog }   from "@/components/customers/edit-customer-dialog";
import { DeleteCustomerDialog } from "@/components/customers/delete-customer-dialog";
import { Fab } from "@/components/ui/fab";

export default function CustomersPage() {
  const { customers, isLoading, mutate } = useCustomers();
  const { format }                        = useCurrency();

  const [search,          setSearch]          = useState("");
  const [createOpen,      setCreateOpen]      = useState(false);
  const [editCustomer,    setEditCustomer]    = useState<Customer | null>(null);
  const [deleteCustomer,  setDeleteCustomer]  = useState<Customer | null>(null);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (c.phone?.includes(search) ?? false)
  );

  const totalSpent  = customers.reduce((acc, c) => acc + Number(c.total_spent), 0);
  const totalOrders = customers.reduce((acc, c) => acc + Number(c.total_orders), 0);

  return (
    <div className="space-y-5 pb-24">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground text-sm">
          {isLoading ? "Cargando..." : `${customers.length} cliente${customers.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          { title: "Total clientes",  value: customers.length,    sub: "registrados",            icon: Users },
          { title: "Total órdenes",   value: totalOrders,          sub: "ventas realizadas",      icon: ShoppingCart },
          { title: "Total facturado", value: format(totalSpent),   sub: "a clientes registrados", icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.title} className={stat.title === "Total facturado" ? "col-span-2 md:col-span-1 pt-1 pb-1" : "pt-1 pb-1"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pl-3.5 pb-1 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground mb-0">{stat.title}</CardTitle>
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pl-3.5 pb-3">
              <div className="text-xl font-bold">
                {isLoading ? <Skeleton className="h-6 w-20" /> : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabla — desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Órdenes</TableHead>
                <TableHead className="text-right">Total gastado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.total_orders}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {format(Number(customer.total_spent))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCustomer(customer)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteCustomer(customer)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cards — móvil */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No se encontraron clientes</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((customer) => (
            <Card className="pb-1 pt-1" key={customer.id}>
              <CardContent className="px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.phone
                        ? customer.phone
                        : customer.email
                        ? customer.email
                        : "Sin contacto"}
                    </p>
                  </div>

                  {/* Stats inline */}
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Órdenes</p>
                      <p className="text-sm font-bold">{customer.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gastado</p>
                      <p className="text-sm font-bold text-primary">{format(Number(customer.total_spent))}</p>
                    </div>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditCustomer(customer)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteCustomer(customer)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modales */}
      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => mutate()} />
      <EditCustomerDialog
        customer={editCustomer}
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        onSuccess={() => mutate()}
      />
      <DeleteCustomerDialog
        customer={deleteCustomer}
        open={!!deleteCustomer}
        onOpenChange={(open) => !open && setDeleteCustomer(null)}
        onSuccess={() => mutate()}
      />
      <Fab
        actions={[
          { label: "Nuevo cliente", icon: Users, onClick: () => setCreateOpen(true) },
        ]}
      />
    </div>
  );
}