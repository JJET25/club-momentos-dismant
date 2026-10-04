-- ─────────────────────────────────────────────────────────────
-- Datos de prueba de la base LOCAL (bootstrap.sh). Correos con dominio
-- ficticio .test: nunca existen en producción ni reciben correo real.
-- La contraseña sale de QA_PASSWORD (scripts/local-db/.env.local, no se
-- versiona); bootstrap.sh inyecta su hash como :'pw_hash'.
-- ─────────────────────────────────────────────────────────────

INSERT INTO "roles" ("id", "name") VALUES
  (gen_random_uuid(), 'owner'),
  (gen_random_uuid(), 'admin'),
  (gen_random_uuid(), 'team_admin'),
  (gen_random_uuid(), 'employee'),
  (gen_random_uuid(), 'member')
ON CONFLICT ("name") DO NOTHING;

WITH r AS (SELECT "id", "name" FROM "roles")
INSERT INTO "members" (
  "id", "email", "full_name", "company_name", "rfc", "location_state", "location_city",
  "phone", "password_hash", "affiliate", "status", "role_id"
) VALUES
  -- Admin. de equipo de Dismant (solo ve Dismant)
  ('qa-teamadmin-dismant', 'qa.teamadmin@clubmomentos.test', 'QA Admin Equipo Dismant', 'Dismant', 'DIS010101AAA',
   'Ciudad de México', 'CDMX', '5511112222', :'pw_hash', 'dismant', 'active', (SELECT "id" FROM r WHERE "name" = 'team_admin')),
  -- Miembro de Dismant
  ('qa-miembro-dismant', 'qa.miembro@clubmomentos.test', 'QA Miembro Dismant', 'Ferretería QA S.A. de C.V.', 'FQA010101AB1',
   'Nuevo León', 'Monterrey', '8133334444', :'pw_hash', 'dismant', 'active', (SELECT "id" FROM r WHERE "name" = 'member')),
  -- Miembro de Dismant SIN contraseña (prueba "Establecer contraseña")
  ('qa-sinpass-dismant', 'qa.sinpassword@clubmomentos.test', 'QA Sin Contraseña', 'Ferretería QA S.A. de C.V.', 'FQA010101AB1',
   'Jalisco', 'Guadalajara', NULL, NULL, 'dismant', 'active', (SELECT "id" FROM r WHERE "name" = 'member')),
  -- Miembro de Lauti (el Admin. de equipo de Dismant NO debe poder verlo ni editarlo)
  ('qa-miembro-lauti', 'qa.miembro.lauti@clubmomentos.test', 'QA Miembro Lauti', 'Constructora QA Lauti', 'CQL020202BB2',
   'Puebla', 'Puebla', '2225556666', :'pw_hash', 'lauti', 'active', (SELECT "id" FROM r WHERE "name" = 'member'))
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "staff_affiliates" ("member_id", "affiliate")
VALUES ('qa-teamadmin-dismant', 'dismant')
ON CONFLICT DO NOTHING;
