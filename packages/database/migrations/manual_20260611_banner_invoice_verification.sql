-- ─────────────────────────────────────────────────────────────
-- Migración manual: Banner global + Verificación de facturas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Tabla de banners globales (singleton)
CREATE TABLE IF NOT EXISTS "global_banners" (
    "id"         TEXT        NOT NULL,
    "message"    TEXT        NOT NULL,
    "is_active"  BOOLEAN     NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_by" TEXT,
    CONSTRAINT "global_banners_pkey" PRIMARY KEY ("id")
);

-- 2. Nuevas columnas en facturas para flujo de verificación en dos pasos
ALTER TABLE "invoices"
    ADD COLUMN IF NOT EXISTS "verification_status" TEXT        NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS "verified_by"          TEXT,
    ADD COLUMN IF NOT EXISTS "verified_at"          TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "registered_by"        TEXT;

-- 3. Foreign keys opcionales (pueden fallar si hay datos inconsistentes; ignorar si es el caso)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'invoices_verified_by_fkey'
    ) THEN
        ALTER TABLE "invoices"
            ADD CONSTRAINT "invoices_verified_by_fkey"
            FOREIGN KEY ("verified_by") REFERENCES "members"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'invoices_registered_by_fkey'
    ) THEN
        ALTER TABLE "invoices"
            ADD CONSTRAINT "invoices_registered_by_fkey"
            FOREIGN KEY ("registered_by") REFERENCES "members"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Índice de búsqueda por estado de verificación
CREATE INDEX IF NOT EXISTS "invoices_verification_status_idx"
    ON "invoices" ("verification_status");

-- Verificar cambios aplicados
SELECT
    'global_banners' AS tabla,
    COUNT(*) AS columnas
FROM information_schema.columns
WHERE table_name = 'global_banners'
UNION ALL
SELECT
    'invoices.verification_status' AS tabla,
    COUNT(*) AS columnas
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name = 'verification_status';
