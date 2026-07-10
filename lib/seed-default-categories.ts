// lib/seed-default-categories.ts
import { NeonQueryFunction } from "@neondatabase/serverless";

const DEFAULT_CATEGORIES = [
  // INCOME
  { name: "Ventas", type: "INCOME" },
  { name: "Servicios", type: "INCOME" },
  { name: "Inversiones", type: "INCOME" },
  { name: "Comisiones", type: "INCOME" },
  { name: "Reembolsos", type: "INCOME" },
  { name: "Otros ingresos", type: "INCOME" },
  // EXPENSE
  { name: "Nómina", type: "EXPENSE" },
  { name: "Servicios", type: "EXPENSE" },
  { name: "Inventario", type: "EXPENSE" },
  { name: "Marketing", type: "EXPENSE" },
  { name: "Renta", type: "EXPENSE" },
  { name: "Mantenimiento", type: "EXPENSE" },
  { name: "Impuestos", type: "EXPENSE" },
  { name: "Transporte", type: "EXPENSE" },
  { name: "Equipamiento", type: "EXPENSE" },
  { name: "Seguros", type: "EXPENSE" },
  { name: "Otros gastos", type: "EXPENSE" },
  // TRANSFER
  { name: "Transferencia", type: "TRANSFER" },
];

export async function seedDefaultCategories(
  orgId: number,
  userId: number,
  sql: NeonQueryFunction<false, false>
) {
  await Promise.all(
    DEFAULT_CATEGORIES.map(
      (cat) =>
        sql`
          INSERT INTO transaction_categories (org_id, created_by, name, type)
          VALUES (${orgId}, ${userId}, ${cat.name}, ${cat.type})
          ON CONFLICT (org_id, name, type) DO NOTHING
        `
    )
  );
}
