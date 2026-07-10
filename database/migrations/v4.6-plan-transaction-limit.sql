-- v4.6 — Límite de transacciones mensuales por plan
-- NULL = sin límite (igual que max_products / max_sales_per_month)

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_transactions_per_month INT;

COMMENT ON COLUMN subscription_plans.max_transactions_per_month IS
  'Máximo de transacciones financieras por mes calendario. NULL = ilimitado.';
