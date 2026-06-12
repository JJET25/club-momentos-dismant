-- ─────────────────────────────────────────────────────────────
-- Migración manual: Evidencia fotográfica de facturas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "invoices"
    ADD COLUMN IF NOT EXISTS "evidence_key" TEXT;

-- Verificar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'evidence_key';
