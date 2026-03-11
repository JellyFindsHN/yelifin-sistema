// lib/seed-default-categories.ts
import { neon } from "@neondatabase/serverless";

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

export async function seedDefaultCategories(userId: number) {
  const sql = neon(process.env.DATABASE_URL!);

  // Insert todas las categorías usando Promise.all
  await Promise.all(
    DEFAULT_CATEGORIES.map((cat) =>
      sql`
        INSERT INTO transaction_categories (user_id, name, type)
        VALUES (${userId}, ${cat.name}, ${cat.type})
        ON CONFLICT (user_id, name, type) DO NOTHING
      `
    )
  );
}