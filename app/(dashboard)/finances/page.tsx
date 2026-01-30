"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import {
  Wallet,
  Building,
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowLeftRight,
} from "lucide-react"
import { mockAccounts, mockTransactions, type Transaction } from "@/lib/mock-data"

export default function FinancesPage() {
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE")
  const [newTransaction, setNewTransaction] = useState({
    account_id: mockAccounts[0].id,
    to_account_id: mockAccounts[1].id,
    amount: "",
    description: "",
  })

  const totalBalance = mockAccounts.reduce((acc, a) => acc + a.balance, 0)
  
  const todayTransactions = mockTransactions.filter((t) => {
    const today = new Date().toDateString()
    return new Date(t.created_at).toDateString() === today
  })

  const todayIncome = todayTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + t.amount, 0)

  const todayExpense = todayTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + t.amount, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-HN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Generate cash flow chart data
  const cashFlowData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return {
      date: date.toLocaleDateString("es-HN", { weekday: "short" }),
      ingresos: Math.floor(Math.random() * 3000) + 1000,
      gastos: Math.floor(Math.random() * 1500) + 500,
    }
  })

  const getAccountIcon = (type: string) => {
    return type === "CASH" ? (
      <Banknote className="h-5 w-5" />
    ) : (
      <Building className="h-5 w-5" />
    )
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "INCOME":
        return <ArrowUpRight className="h-4 w-4 text-success" />
      case "EXPENSE":
        return <ArrowDownRight className="h-4 w-4 text-destructive" />
      case "TRANSFER":
        return <ArrowLeftRight className="h-4 w-4 text-primary" />
      default:
        return null
    }
  }

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "INCOME":
        return <Badge className="bg-success text-success-foreground">Ingreso</Badge>
      case "EXPENSE":
        return <Badge variant="destructive">Gasto</Badge>
      case "TRANSFER":
        return <Badge variant="secondary">Transferencia</Badge>
      default:
        return null
    }
  }

  const handleCreateTransaction = () => {
    // In a real app, this would save to the database
    setIsNewTransactionOpen(false)
    setNewTransaction({
      account_id: mockAccounts[0].id,
      to_account_id: mockAccounts[1].id,
      amount: "",
      description: "",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finanzas</h1>
          <p className="text-muted-foreground">
            Control de cuentas y flujo de efectivo
          </p>
        </div>
        <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Transacción</DialogTitle>
              <DialogDescription>
                Registra un ingreso, gasto o transferencia
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Tipo de Transacción</Label>
                <div className="flex gap-2">
                  <Button
                    variant={transactionType === "INCOME" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTransactionType("INCOME")}
                  >
                    <ArrowUpRight className="mr-1 h-4 w-4" />
                    Ingreso
                  </Button>
                  <Button
                    variant={transactionType === "EXPENSE" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTransactionType("EXPENSE")}
                  >
                    <ArrowDownRight className="mr-1 h-4 w-4" />
                    Gasto
                  </Button>
                  <Button
                    variant={transactionType === "TRANSFER" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTransactionType("TRANSFER")}
                  >
                    <ArrowLeftRight className="mr-1 h-4 w-4" />
                    Transferir
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{transactionType === "TRANSFER" ? "Cuenta Origen" : "Cuenta"}</Label>
                <Select
                  value={newTransaction.account_id}
                  onValueChange={(value) =>
                    setNewTransaction({ ...newTransaction, account_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {transactionType === "TRANSFER" && (
                <div className="grid gap-2">
                  <Label>Cuenta Destino</Label>
                  <Select
                    value={newTransaction.to_account_id}
                    onValueChange={(value) =>
                      setNewTransaction({ ...newTransaction, to_account_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mockAccounts
                        .filter((a) => a.id !== newTransaction.account_id)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} - {formatCurrency(account.balance)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="amount">Monto (L)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, amount: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newTransaction.description}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, description: e.target.value })
                  }
                  placeholder="Detalle de la transacción"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewTransactionOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTransaction}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              En {mockAccounts.length} cuentas activas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(todayIncome)}</div>
            <p className="text-xs text-muted-foreground">
              +{todayTransactions.filter((t) => t.type === "INCOME").length} transacciones
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Hoy</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(todayExpense)}</div>
            <p className="text-xs text-muted-foreground">
              {todayTransactions.filter((t) => t.type === "EXPENSE").length} transacciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts */}
      <div className="grid gap-4 md:grid-cols-3">
        {mockAccounts.map((account) => (
          <Card key={account.id} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {getAccountIcon(account.type)}
                </div>
                <div>
                  <CardTitle className="text-base">{account.name}</CardTitle>
                  <CardDescription>
                    {account.type === "CASH" ? "Efectivo" : "Cuenta Bancaria"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(account.balance)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Transactions */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Cash Flow Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Flujo de Efectivo</CardTitle>
            <CardDescription>Últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `L${value / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                    name="Ingresos"
                  />
                  <Area
                    type="monotone"
                    dataKey="gastos"
                    stackId="2"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.3}
                    name="Gastos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transacciones Recientes</CardTitle>
              <CardDescription>Últimos movimientos</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/finances/transactions">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTransactions.slice(0, 6).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="text-sm font-medium line-clamp-1">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        transaction.type === "INCOME"
                          ? "text-success"
                          : transaction.type === "EXPENSE"
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      {transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "-" : ""}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
