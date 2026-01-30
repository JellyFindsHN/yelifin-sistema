"use client"

import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Search,
  Box,
  AlertTriangle,
  Package,
  Calculator,
} from "lucide-react"
import { mockSupplies, type Supply } from "@/lib/mock-data"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>(mockSupplies)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newSupply, setNewSupply] = useState({
    name: "",
    type: "CONTABLE" as "CONTABLE" | "NO_CONTABLE",
    unit: "",
    current_stock: "",
    min_stock: "",
    cost_per_unit: "",
    estimated_usage_per_sale: "",
  })

  const searchParams = useSearchParams()
  const filteredSupplies = supplies.filter((supply) => {
    const matchesSearch = supply.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || supply.type === typeFilter
    return matchesSearch && matchesType
  })

  const lowStockSupplies = supplies.filter(
    (s) => s.type === "CONTABLE" && s.current_stock < s.min_stock
  )
  const totalValue = supplies
    .filter((s) => s.type === "CONTABLE")
    .reduce((acc, s) => acc + s.current_stock * s.cost_per_unit, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleCreateSupply = () => {
    const supply: Supply = {
      id: `${Date.now()}`,
      name: newSupply.name,
      type: newSupply.type,
      unit: newSupply.unit,
      current_stock: newSupply.type === "CONTABLE" ? parseFloat(newSupply.current_stock) : 0,
      min_stock: newSupply.type === "CONTABLE" ? parseFloat(newSupply.min_stock) : 0,
      cost_per_unit: parseFloat(newSupply.cost_per_unit),
      estimated_usage_per_sale:
        newSupply.type === "NO_CONTABLE" ? parseFloat(newSupply.estimated_usage_per_sale) : null,
    }
    setSupplies([supply, ...supplies])
    setNewSupply({
      name: "",
      type: "CONTABLE",
      unit: "",
      current_stock: "",
      min_stock: "",
      cost_per_unit: "",
      estimated_usage_per_sale: "",
    })
    setIsCreateDialogOpen(false)
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suministros</h1>
            <p className="text-muted-foreground">
              Gestiona insumos y materiales de tu negocio
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Suministro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Suministro</DialogTitle>
                <DialogDescription>
                  Registra un nuevo suministro o insumo
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newSupply.name}
                    onChange={(e) =>
                      setNewSupply({ ...newSupply, name: e.target.value })
                    }
                    placeholder="Nombre del suministro"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Tipo de Suministro</Label>
                    <p className="text-sm text-muted-foreground">
                      {newSupply.type === "CONTABLE"
                        ? "Se lleva control de inventario"
                        : "Costo estimado por venta"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={newSupply.type === "CONTABLE" ? "font-medium" : "text-muted-foreground"}>
                      Contable
                    </span>
                    <Switch
                      checked={newSupply.type === "NO_CONTABLE"}
                      onCheckedChange={(checked) =>
                        setNewSupply({
                          ...newSupply,
                          type: checked ? "NO_CONTABLE" : "CONTABLE",
                        })
                      }
                    />
                    <span className={newSupply.type === "NO_CONTABLE" ? "font-medium" : "text-muted-foreground"}>
                      No Contable
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unidad</Label>
                    <Input
                      id="unit"
                      value={newSupply.unit}
                      onChange={(e) =>
                        setNewSupply({ ...newSupply, unit: e.target.value })
                      }
                      placeholder="unidad, rollo, kg..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cost">Costo por Unidad (L)</Label>
                    <Input
                      id="cost"
                      type="number"
                      value={newSupply.cost_per_unit}
                      onChange={(e) =>
                        setNewSupply({ ...newSupply, cost_per_unit: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                {newSupply.type === "CONTABLE" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="stock">Stock Actual</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={newSupply.current_stock}
                        onChange={(e) =>
                          setNewSupply({ ...newSupply, current_stock: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="min_stock">Stock Mínimo</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        value={newSupply.min_stock}
                        onChange={(e) =>
                          setNewSupply({ ...newSupply, min_stock: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="usage">Uso Estimado por Venta (L)</Label>
                    <Input
                      id="usage"
                      type="number"
                      value={newSupply.estimated_usage_per_sale}
                      onChange={(e) =>
                        setNewSupply({
                          ...newSupply,
                          estimated_usage_per_sale: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Costo estimado que se descuenta de cada venta
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSupply}>Agregar Suministro</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suministros</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplies.length}</div>
              <p className="text-xs text-muted-foreground">registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contables</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {supplies.filter((s) => s.type === "CONTABLE").length}
              </div>
              <p className="text-xs text-muted-foreground">con inventario</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor en Stock</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground">en suministros contables</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{lowStockSupplies.length}</div>
              <p className="text-xs text-muted-foreground">necesitan reorden</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar suministro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="CONTABLE">Contables</SelectItem>
                  <SelectItem value="NO_CONTABLE">No Contables</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Supplies Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Suministro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stock / Uso</TableHead>
                  <TableHead>Costo Unitario</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSupplies.map((supply) => (
                  <TableRow key={supply.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Box className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{supply.name}</p>
                          <p className="text-xs text-muted-foreground">por {supply.unit}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supply.type === "CONTABLE" ? "default" : "secondary"}>
                        {supply.type === "CONTABLE" ? "Contable" : "No Contable"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {supply.type === "CONTABLE" ? (
                        <div>
                          <p className="font-medium">
                            {supply.current_stock} {supply.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">Mín: {supply.min_stock}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">
                            {formatCurrency(supply.estimated_usage_per_sale || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">por venta</p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(supply.cost_per_unit)}</TableCell>
                    <TableCell>
                      {supply.type === "CONTABLE" ? (
                        supply.current_stock < supply.min_stock ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Stock Bajo
                          </Badge>
                        ) : (
                          <Badge className="bg-success text-success-foreground">OK</Badge>
                        )
                      ) : (
                        <Badge variant="outline">N/A</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredSupplies.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Box className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No se encontraron suministros</p>
              <p className="text-sm text-muted-foreground">
                Intenta con otros filtros de búsqueda
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Suspense>
  )
}
