"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  Plus,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react"
import { mockEvents, type Event } from "@/lib/mock-data"

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({
    name: "",
    location: "",
    start_date: "",
    end_date: "",
    fixed_costs: "",
  })

  const activeEvents = events.filter((e) => e.status === "ACTIVE").length
  const totalRevenue = events.reduce((acc, e) => acc + e.total_sales, 0)
  const totalProfit = events.reduce((acc, e) => acc + e.net_profit, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-HN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLANNED":
        return <Badge variant="secondary">Planificado</Badge>
      case "ACTIVE":
        return <Badge className="bg-success text-success-foreground">Activo</Badge>
      case "COMPLETED":
        return <Badge variant="outline">Completado</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return null
    }
  }

  const getROI = (event: Event) => {
    if (event.total_expenses === 0) return 0
    return ((event.net_profit / event.total_expenses) * 100).toFixed(1)
  }

  const handleCreateEvent = () => {
    const event: Event = {
      id: `${Date.now()}`,
      name: newEvent.name,
      location: newEvent.location,
      start_date: newEvent.start_date,
      end_date: newEvent.end_date,
      status: "PLANNED",
      fixed_costs: parseFloat(newEvent.fixed_costs),
      total_sales: 0,
      total_expenses: parseFloat(newEvent.fixed_costs),
      net_profit: -parseFloat(newEvent.fixed_costs),
    }
    setEvents([event, ...events])
    setNewEvent({
      name: "",
      location: "",
      start_date: "",
      end_date: "",
      fixed_costs: "",
    })
    setIsCreateDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eventos y Ferias</h1>
          <p className="text-muted-foreground">
            Gestiona tus participaciones en eventos
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Evento</DialogTitle>
              <DialogDescription>
                Registra un nuevo evento o feria
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre del Evento</Label>
                <Input
                  id="name"
                  value={newEvent.name}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, name: e.target.value })
                  }
                  placeholder="Feria del Emprendedor"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, location: e.target.value })
                  }
                  placeholder="Centro de Convenciones"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Fecha Inicio</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newEvent.start_date}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">Fecha Fin</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newEvent.end_date}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fixed_costs">Costos Fijos (L)</Label>
                <Input
                  id="fixed_costs"
                  type="number"
                  value={newEvent.fixed_costs}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, fixed_costs: e.target.value })
                  }
                  placeholder="Alquiler de stand, transporte, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateEvent}>Crear Evento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">{activeEvents} activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas en Eventos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">total acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">de todos los eventos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Promedio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.length > 0
                ? (events.reduce((acc, e) => acc + parseFloat(getROI(e)), 0) / events.length).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">retorno sobre inversión</p>
          </CardContent>
        </Card>
      </div>

      {/* Events Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </CardDescription>
                </div>
                {getStatusBadge(event.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dates */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(event.start_date)} - {formatDate(event.end_date)}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Ventas</p>
                  <p className="text-lg font-bold">{formatCurrency(event.total_sales)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="text-lg font-bold">{formatCurrency(event.total_expenses)}</p>
                </div>
              </div>

              {/* Profit and ROI */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Ganancia Neta</p>
                  <p
                    className={`text-lg font-bold ${
                      event.net_profit >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(event.net_profit)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">ROI</p>
                  <p
                    className={`text-lg font-bold flex items-center justify-end gap-1 ${
                      parseFloat(getROI(event)) >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {parseFloat(getROI(event)) >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {getROI(event)}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  Ver Detalle
                </Button>
                {event.status === "PLANNED" && (
                  <Button size="sm" className="flex-1">
                    Iniciar Evento
                  </Button>
                )}
                {event.status === "ACTIVE" && (
                  <Button size="sm" className="flex-1">
                    Registrar Venta
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No hay eventos registrados</p>
            <p className="text-sm text-muted-foreground">
              Crea tu primer evento para comenzar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
