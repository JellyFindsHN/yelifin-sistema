"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Plus,
  Search,
  Eye,
  Users,
  Crown,
  ShoppingBag,
  DollarSign,
  Star,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"
import { mockCustomers, mockSales, type Customer } from "@/lib/mock-data"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const Loading = () => null

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  )

  const loyalCustomers = customers.filter((c) => c.is_loyal).length
  const totalSpent = customers.reduce((acc, c) => acc + c.total_spent, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getCustomerSales = (customerId: string) => {
    return mockSales.filter((s) => s.customer_id === customerId)
  }

  const getNextDiscount = (totalPurchases: number) => {
    if (totalPurchases < 3) return { next: 4, discount: 10 }
    if (totalPurchases < 5) return { next: 6, discount: 15 }
    if (totalPurchases < 7) return { next: 8, discount: 20 }
    return null
  }

  const handleCreateCustomer = () => {
    const customer: Customer = {
      id: `${Date.now()}`,
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      address: newCustomer.address,
      total_purchases: 0,
      total_spent: 0,
      is_loyal: false,
      loyalty_discount: 0,
      created_at: new Date().toISOString(),
    }
    setCustomers([customer, ...customers])
    setNewCustomer({ name: "", email: "", phone: "", address: "" })
    setIsCreateDialogOpen(false)
  }

  const searchParams = useSearchParams()

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gestiona tu base de clientes
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
                <DialogDescription>
                  Agrega la información del cliente
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    placeholder="+504 1234-5678"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={newCustomer.address}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, address: e.target.value })
                    }
                    placeholder="Dirección completa"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCustomer}>Registrar Cliente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-xs text-muted-foreground">clientes registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Leales</CardTitle>
              <Crown className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loyalCustomers}</div>
              <p className="text-xs text-muted-foreground">con beneficios activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
              <p className="text-xs text-muted-foreground">de todos los clientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Compras</TableHead>
                  <TableHead>Total Gastado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {customer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.address}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{customer.email}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.total_purchases} compras</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(customer.total_spent)}
                    </TableCell>
                    <TableCell>
                      {customer.is_loyal ? (
                        <Badge className="bg-warning text-warning-foreground gap-1">
                          <Crown className="h-3 w-3" />
                          Leal ({customer.loyalty_discount}%)
                        </Badge>
                      ) : (
                        <Badge variant="outline">Regular</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredCustomers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No se encontraron clientes</p>
              <p className="text-sm text-muted-foreground">
                Intenta con otros términos de búsqueda
              </p>
            </CardContent>
          </Card>
        )}

        {/* Customer Profile Dialog */}
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Perfil del Cliente</DialogTitle>
              <DialogDescription>
                Información detallada y historial de compras
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {selectedCustomer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                      {selectedCustomer.is_loyal && (
                        <Badge className="bg-warning text-warning-foreground gap-1">
                          <Crown className="h-3 w-3" />
                          Cliente Leal
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {selectedCustomer.email}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {selectedCustomer.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {selectedCustomer.address}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <ShoppingBag className="mx-auto h-6 w-6 text-muted-foreground" />
                      <p className="mt-2 text-2xl font-bold">{selectedCustomer.total_purchases}</p>
                      <p className="text-xs text-muted-foreground">Compras</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <DollarSign className="mx-auto h-6 w-6 text-muted-foreground" />
                      <p className="mt-2 text-2xl font-bold">
                        {formatCurrency(selectedCustomer.total_spent)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Gastado</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Star className="mx-auto h-6 w-6 text-warning" />
                      <p className="mt-2 text-2xl font-bold">
                        {selectedCustomer.loyalty_discount}%
                      </p>
                      <p className="text-xs text-muted-foreground">Descuento</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Next Discount */}
                {!selectedCustomer.is_loyal && getNextDiscount(selectedCustomer.total_purchases) && (
                  <Card className="border-dashed">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Próximo beneficio: En la compra{" "}
                        <strong>#{getNextDiscount(selectedCustomer.total_purchases)?.next}</strong>{" "}
                        obtendrá{" "}
                        <strong className="text-primary">
                          {getNextDiscount(selectedCustomer.total_purchases)?.discount}% de descuento
                        </strong>
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Purchases */}
                <div>
                  <h4 className="mb-3 font-medium">Historial de Compras</h4>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {getCustomerSales(selectedCustomer.id).length > 0 ? (
                      getCustomerSales(selectedCustomer.id).map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="font-medium">{sale.sale_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sale.sale_date).toLocaleDateString("es-HN")}
                            </p>
                          </div>
                          <p className="font-medium">{formatCurrency(sale.total)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sin compras registradas
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
