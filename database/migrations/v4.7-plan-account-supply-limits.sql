-- v4.7 — Límites de cuentas y suministros por plan
-- NULL = sin límite

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_accounts INT;

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_supplies INT;

COMMENT ON COLUMN subscription_plans.max_accounts IS
  'Máximo de cuentas financieras activas. NULL = ilimitado.';
COMMENT ON COLUMN subscription_plans.max_supplies IS
  'Máximo de suministros registrados. NULL = ilimitado.';
