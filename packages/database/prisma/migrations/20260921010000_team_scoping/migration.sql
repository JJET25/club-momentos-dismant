-- Aislamiento de datos por empresa (dismant/lauti):
-- 1) Catálogo (reward_skus) y Aliados (partners) ganan columna affiliate,
--    igual que ya tienen members/invitations. Las promociones heredan el
--    affiliate de su partner vía join, no necesitan columna propia.
-- 2) Nuevo rol "team_admin" (administrador de equipo, scoped a una empresa).

ALTER TABLE "partners" ADD COLUMN "affiliate" TEXT NOT NULL DEFAULT 'dismant';
CREATE INDEX "partners_affiliate_idx" ON "partners"("affiliate");

ALTER TABLE "reward_skus" ADD COLUMN "affiliate" TEXT NOT NULL DEFAULT 'dismant';
CREATE INDEX "reward_skus_affiliate_idx" ON "reward_skus"("affiliate");

INSERT INTO "roles" (id, name) VALUES (gen_random_uuid(), 'team_admin')
ON CONFLICT (name) DO NOTHING;
