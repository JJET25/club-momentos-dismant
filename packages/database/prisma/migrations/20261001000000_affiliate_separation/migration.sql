-- ─────────────────────────────────────────────────────────────
-- Separación de empresas (Dismant / Lauti)
-- ─────────────────────────────────────────────────────────────
-- Dismant y Lauti son dos empresas independientes que comparten la
-- plataforma; solo el administrador global de Club Momentos ve ambas.
--
-- Esta migración es ADITIVA y compatible con el código anterior: se puede
-- aplicar con la versión actual todavía desplegada.
--  1. Valores válidos de empresa (CHECK) en las tablas que ya la tienen.
--  2. partner_promotions.affiliate (antes se heredaba solo vía join al
--     partner). Un trigger la mantiene igual a la del partner, también
--     para inserts de código que no la mande.
--  3. global_banners.affiliate: un banner por empresa.
--  4. staff_affiliates: empleados / admins. de equipo con acceso a una o
--     ambas empresas.
--  5. Email único POR EMPRESA: una persona puede ser miembro de ambas, con
--     cuentas e invitaciones independientes.
--  6. Se quitan las políticas RLS permisivas (USING true) de ledger_entries
--     y audit_log: exponían ambos ledgers a cualquiera con la anon key. La
--     app solo usa el service role (que no pasa por RLS); la inmutabilidad
--     del ledger la siguen garantizando los triggers.
-- ─────────────────────────────────────────────────────────────

-- 1. Valores válidos de empresa
ALTER TABLE "members"     ADD CONSTRAINT "members_affiliate_check"     CHECK ("affiliate" IN ('dismant', 'lauti'));
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_affiliate_check" CHECK ("affiliate" IN ('dismant', 'lauti'));
ALTER TABLE "partners"    ADD CONSTRAINT "partners_affiliate_check"    CHECK ("affiliate" IN ('dismant', 'lauti'));
ALTER TABLE "reward_skus" ADD CONSTRAINT "reward_skus_affiliate_check" CHECK ("affiliate" IN ('dismant', 'lauti'));

-- 2. Empresa propia en promociones, siempre igual a la de su partner
ALTER TABLE "partner_promotions" ADD COLUMN "affiliate" TEXT NOT NULL DEFAULT 'dismant';

UPDATE "partner_promotions" pp
SET "affiliate" = p."affiliate"
FROM "partners" p
WHERE p."id" = pp."partner_id";

ALTER TABLE "partner_promotions" ADD CONSTRAINT "partner_promotions_affiliate_check" CHECK ("affiliate" IN ('dismant', 'lauti'));
CREATE INDEX "partner_promotions_affiliate_status_idx" ON "partner_promotions"("affiliate", "status", "valid_until");

CREATE OR REPLACE FUNCTION sync_promotion_affiliate()
RETURNS TRIGGER AS $$
BEGIN
  SELECT p."affiliate" INTO NEW."affiliate" FROM "partners" p WHERE p."id" = NEW."partner_id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_promotions_sync_affiliate
  BEFORE INSERT OR UPDATE OF "partner_id", "affiliate" ON "partner_promotions"
  FOR EACH ROW EXECUTE FUNCTION sync_promotion_affiliate();

-- 3. Un banner por empresa. El banner existente se mostraba a todos, así
--    que se conserva para Dismant y se copia para Lauti.
ALTER TABLE "global_banners" ADD COLUMN "affiliate" TEXT NOT NULL DEFAULT 'dismant';
ALTER TABLE "global_banners" ADD CONSTRAINT "global_banners_affiliate_check" CHECK ("affiliate" IN ('dismant', 'lauti'));

INSERT INTO "global_banners" ("id", "message", "is_active", "updated_at", "updated_by", "affiliate")
SELECT gen_random_uuid()::text, "message", "is_active", "updated_at", "updated_by", 'lauti'
FROM "global_banners"
WHERE "affiliate" = 'dismant'
ORDER BY "updated_at" DESC
LIMIT 1;

CREATE INDEX "global_banners_affiliate_is_active_idx" ON "global_banners"("affiliate", "is_active");

-- 4. Empresas asignadas al staff scoped (team_admin / employee)
CREATE TABLE "staff_affiliates" (
  "member_id"  TEXT NOT NULL,
  "affiliate"  TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_affiliates_pkey" PRIMARY KEY ("member_id", "affiliate"),
  CONSTRAINT "staff_affiliates_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "staff_affiliates_affiliate_check" CHECK ("affiliate" IN ('dismant', 'lauti'))
);
ALTER TABLE "staff_affiliates" ENABLE ROW LEVEL SECURITY;

INSERT INTO "staff_affiliates" ("member_id", "affiliate")
SELECT m."id", m."affiliate"
FROM "members" m
JOIN "roles" r ON r."id" = m."role_id"
WHERE r."name" IN ('team_admin', 'employee');

-- 5. Email único por empresa
DROP INDEX "members_email_key";
CREATE UNIQUE INDEX "members_email_affiliate_key" ON "members"("email", "affiliate");
CREATE INDEX "members_email_idx" ON "members"("email");

-- 6. Sin acceso por anon/authenticated a ledger y auditoría
DROP POLICY IF EXISTS "ledger_select" ON "ledger_entries";
DROP POLICY IF EXISTS "ledger_insert" ON "ledger_entries";
DROP POLICY IF EXISTS "audit_select"  ON "audit_log";
DROP POLICY IF EXISTS "audit_insert"  ON "audit_log";
