-- ─────────────────────────────────────────────────────────────
-- Migración manual: Folio de referencia en facturas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "invoices"
    ADD COLUMN IF NOT EXISTS "folio_referencia" TEXT;

CREATE INDEX IF NOT EXISTS "invoices_folio_referencia_idx"
    ON "invoices" ("folio_referencia");

-- Verificar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'folio_referencia';
