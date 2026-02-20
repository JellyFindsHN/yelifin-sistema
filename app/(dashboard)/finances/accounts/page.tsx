// app/(dashboard)/finances/accounts/page.tsx
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
import {
  Plus, Search, Wallet, Banknote, CreditCard, Building2, Pencil, Trash2,
} from "lucide-react";
import { useAccounts, Account } from "@/hooks/swr/use-accounts";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";
import { DeleteAccountDialog } from "@/components/accounts/delete-account-dialog";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 2 }).format(value);

const accountTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  CASH:   { label: "Efectivo",          icon: Banknote,  color: "bg-green-100 text-green-700 border-green-200" },
  BANK:   { label: "Banco",             icon: Building2, color: "bg-blue-100 text-blue-700 border-blue-200" },
  WALLET: { label: "Billetera digital", icon: Wallet,    color: "bg-purple-100 text-purple-700 border-purple-200" },
  OTHER:  { label: "Otro",              icon: CreditCard, color: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function AccountsPage() {
  const { accounts, isLoading, mutate } = useAccounts();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuentas</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Cargando..." : `${accounts.length} cuenta${accounts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva cuenta
        </Button>
      </div>

      {/* Balance total */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Balance total</p>
              <p className="text-3xl font-bold text-primary mt-1">
                {isLoading ? <Skeleton className="h-9 w-40" /> : formatCurrency(totalBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                sumando todas las cuentas activas
              </p>
            </div>
            <Wallet className="h-12 w-12 text-primary/20" />
          </div>
        </CardContent>
      </Card>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cuenta..."
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
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No se encontraron cuentas
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((account) => {
                  const config = accountTypeConfig[account.type];
                  const Icon = config.icon;
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{account.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color} variant="outline">
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${Number(account.balance) < 0 ? "text-destructive" : ""}`}>
                        {formatCurrency(Number(account.balance))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditAccount(account)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteAccount(account)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cards — móvil */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No se encontraron cuentas</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((account) => {
            const config = accountTypeConfig[account.type];
            const Icon = config.icon;
            return (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{account.name}</p>
                        <p className={`text-sm font-bold shrink-0 ${Number(account.balance) < 0 ? "text-destructive" : "text-primary"}`}>
                          {formatCurrency(Number(account.balance))}
                        </p>
                      </div>
                      <Badge className={`${config.color} mt-1`} variant="outline">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditAccount(account)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteAccount(account)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modales */}
      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => mutate()} />
      <EditAccountDialog
        account={editAccount}
        open={!!editAccount}
        onOpenChange={(open) => !open && setEditAccount(null)}
        onSuccess={() => mutate()}
      />
      <DeleteAccountDialog
        account={deleteAccount}
        open={!!deleteAccount}
        onOpenChange={(open) => !open && setDeleteAccount(null)}
        onSuccess={() => mutate()}
      />
    </div>
  );
}