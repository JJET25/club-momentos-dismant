-- ─────────────────────────────────────────────────────────────
-- Migración manual: Banner de promociones en R2
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "partner_promotions"
    ADD COLUMN IF NOT EXISTS "banner_key" TEXT;

-- Verificar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'partner_promotions' AND column_name = 'banner_key';
