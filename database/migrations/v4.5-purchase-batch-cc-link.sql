-- ============================================================
-- MIGRACIÓN v4.5: LINK CC TRANSACTIONS A PURCHASE BATCHES
-- Fecha: 2026-07-08
-- ============================================================
-- Permite ubicar y revertir el cargo a tarjeta de crédito al
-- cancelar una compra pendiente ("en camino") pagada con tarjeta.
-- ============================================================

ALTER TABLE credit_card_transactions
  ADD COLUMN IF NOT EXISTS purchase_batch_id BIGINT REFERENCES purchase_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cc_transactions_purchase_batch
  ON credit_card_transactions(purchase_batch_id);
