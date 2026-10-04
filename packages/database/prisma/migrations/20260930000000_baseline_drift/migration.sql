-- ─────────────────────────────────────────────────────────────
-- Baseline de deriva histórica
-- ─────────────────────────────────────────────────────────────
-- Estas columnas/tablas se crearon en producción sin migración (SQL Editor /
-- db push), así que el historial no reconstruía el esquema real: la base
-- local y la shadow de `prisma migrate dev` fallaban en
-- 20261001000000_affiliate_separation ("column affiliate does not exist").
--
-- IDEMPOTENTE: en producción (donde ya existe todo) no cambia nada; en una
-- base nueva crea lo que falta. Solo agrega; nunca borra datos.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "members"
  ADD COLUMN IF NOT EXISTS "affiliate"     TEXT NOT NULL DEFAULT 'dismant',
  ADD COLUMN IF NOT EXISTS "password_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "phone"         TEXT;

ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "affiliate" TEXT NOT NULL DEFAULT 'dismant';
ALTER TABLE "partners"    ADD COLUMN IF NOT EXISTS "affiliate" TEXT NOT NULL DEFAULT 'dismant';
ALTER TABLE "reward_skus" ADD COLUMN IF NOT EXISTS "affiliate" TEXT NOT NULL DEFAULT 'dismant';

ALTER TABLE "partner_promotions" ADD COLUMN IF NOT EXISTS "banner_key" TEXT;

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "evidence_key"        TEXT,
  ADD COLUMN IF NOT EXISTS "folio_referencia"    TEXT,
  ADD COLUMN IF NOT EXISTS "registered_by"       TEXT,
  ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "verified_at"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verified_by"         TEXT;

ALTER TABLE "redemptions"
  ADD COLUMN IF NOT EXISTS "delivery_address" JSONB,
  ADD COLUMN IF NOT EXISTS "prize_content"    TEXT,
  ADD COLUMN IF NOT EXISTS "prize_file_key"   TEXT,
  ADD COLUMN IF NOT EXISTS "shipping_info"    JSONB;

-- La migración de afiliados le agrega "affiliate" y su índice
CREATE TABLE IF NOT EXISTS "global_banners" (
  "id"         TEXT NOT NULL,
  "message"    TEXT NOT NULL,
  "is_active"  BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by" TEXT,
  CONSTRAINT "global_banners_pkey" PRIMARY KEY ("id")
);

-- Llaves foráneas: crear las que falten y alinear ON DELETE / ON UPDATE CASCADE con schema.prisma
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN SELECT * FROM (VALUES
    ('invoices',      'invoices_verified_by_fkey',     'verified_by',   'n', 'SET NULL'),
    ('invoices',      'invoices_registered_by_fkey',   'registered_by', 'n', 'SET NULL'),
    ('invitations',   'invitations_sent_by_fkey',      'sent_by',       'n', 'SET NULL'),
    ('notifications', 'notifications_member_id_fkey',  'member_id',     'c', 'CASCADE')
  ) AS t(tbl, name, col, deltype, action)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.name AND (confdeltype::text <> fk.deltype OR confupdtype <> 'c')) THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', fk.tbl, fk.name);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.name) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "members"("id") ON DELETE %s ON UPDATE CASCADE',
        fk.tbl, fk.name, fk.col, fk.action
      );
    END IF;
  END LOOP;
END $$;
