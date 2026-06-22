-- ─────────────────────────────────────────────────────────────
-- Datos de prueba — Club Momentos Dismant
-- Ejecutar en: Supabase → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────
-- IMPORTANTE: Antes de correr, cambia el email del admin (línea ~40)
-- ─────────────────────────────────────────────────────────────

-- ── 1. ROLES ─────────────────────────────────────────────────

INSERT INTO roles (id, name) VALUES
  ('role-owner-0000-0000-000000000001', 'owner'),
  ('role-admin-0000-0000-000000000002', 'admin'),
  ('role-empl-0000-0000-000000000003', 'employee'),
  ('role-memb-0000-0000-000000000004', 'member')
ON CONFLICT (id) DO NOTHING;

-- ── 2. USUARIO OWNER / ADMIN ──────────────────────────────────
-- ⚠️  CAMBIA el email 'admin@dismant.com' por tu email real
-- Este es el usuario con el que harás login como administrador

INSERT INTO members (
  id,
  email,
  full_name,
  company_name,
  rfc,
  location_state,
  location_city,
  status,
  role_id
) VALUES (
  'member-admin-0000-0000-000000000001',
  'admin@dismant.com',         -- ← CAMBIA ESTO a tu email real
  'Administrador Dismant',
  'Distribuidora Dismant',
  'DIS010101AAA',
  'Ciudad de México',
  'CDMX',
  'active',
  'role-owner-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. INVITACIÓN DE PRUEBA ───────────────────────────────────
-- Token: TEST-INVITE-LOCAL-2026
-- Email al que está vinculada: miembro@test.com
-- Para registrarse: ir a /register?invite=TEST-INVITE-LOCAL-2026
-- (el email en el formulario debe ser miembro@test.com)

INSERT INTO invitations (
  id,
  email,
  token,
  sent_by,
  used,
  expires_at
) VALUES (
  'invite-test-0000-0000-000000000001',
  'miembro@test.com',
  'TEST-INVITE-LOCAL-2026',
  'member-admin-0000-0000-000000000001',
  false,
  NOW() + INTERVAL '1 year'
)
ON CONFLICT (id) DO NOTHING;

-- Segunda invitación de prueba con otro email
INSERT INTO invitations (
  id,
  email,
  token,
  sent_by,
  used,
  expires_at
) VALUES (
  'invite-test-0000-0000-000000000002',
  'cliente2@test.com',
  'TEST-INVITE-CLIENTE2-2026',
  'member-admin-0000-0000-000000000001',
  false,
  NOW() + INTERVAL '1 year'
)
ON CONFLICT (id) DO NOTHING;

-- ── 4. PREMIOS DE PRUEBA (Catálogo) ──────────────────────────

INSERT INTO reward_skus (
  id,
  name,
  description,
  points_cost,
  stock,
  geo_type,
  geo_states,
  geo_cities,
  is_digital,
  status,
  category
) VALUES
  (
    'sku-cafe-0000-0000-000000000001',
    'Café de especialidad 250g',
    'Bolsa de café de especialidad de origen único, tostado artesanal. Incluye guía de preparación.',
    150,
    50,
    'national',
    ARRAY[]::text[],
    ARRAY[]::text[],
    false,
    'active',
    'Alimentos'
  ),
  (
    'sku-gift-0000-0000-000000000002',
    'Tarjeta de regalo Amazon $200',
    'Código digital de Amazon México con saldo de $200 MXN. Válido para cualquier compra en amazon.com.mx.',
    500,
    100,
    'national',
    ARRAY[]::text[],
    ARRAY[]::text[],
    true,
    'active',
    'Digital'
  ),
  (
    'sku-merm-0000-0000-000000000003',
    'Kit de mermeladas artesanales',
    'Set de 3 mermeladas artesanales (fresa, mango y frutos rojos). Sin conservadores artificiales.',
    300,
    30,
    'national',
    ARRAY[]::text[],
    ARRAY[]::text[],
    false,
    'active',
    'Alimentos'
  ),
  (
    'sku-cinp-0000-0000-000000000004',
    'Boletos de cine (2 personas)',
    '2 boletos para cualquier función en Cinépolis o Cinemex. Válido para funciones en sala normal, lunes a jueves.',
    400,
    20,
    'local',
    ARRAY['Ciudad de México', 'Jalisco', 'Nuevo León'],
    ARRAY[]::text[],
    false,
    'active',
    'Entretenimiento'
  ),
  (
    'sku-tech-0000-0000-000000000005',
    'Audífonos inalámbricos Bluetooth',
    'Audífonos tipo over-ear con cancelación de ruido pasiva, 20 horas de batería, compatible con iOS y Android.',
    2500,
    10,
    'national',
    ARRAY[]::text[],
    ARRAY[]::text[],
    false,
    'active',
    'Tecnología'
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- RESUMEN DE LO QUE SE CREÓ
-- ─────────────────────────────────────────────────────────────
--
-- Roles:
--   owner   → id: role-owner-0000-0000-000000000001
--   admin   → id: role-admin-0000-0000-000000000002
--   employee→ id: role-empl-0000-0000-000000000003
--   member  → id: role-memb-0000-0000-000000000004
--
-- Admin owner:
--   Email: admin@dismant.com (cámbialo antes de correr)
--   Para login: /login → magic link → revisar consola del servidor
--
-- Invitaciones de prueba:
--   Email: miembro@test.com   → Token: TEST-INVITE-LOCAL-2026
--   Email: cliente2@test.com  → Token: TEST-INVITE-CLIENTE2-2026
--   URL de registro: /register?invite=TEST-INVITE-LOCAL-2026
--
-- Catálogo (5 premios):
--   150 pts → Café de especialidad
--   300 pts → Kit de mermeladas
--   400 pts → Boletos de cine (local: CDMX, Jalisco, NL)
--   500 pts → Tarjeta Amazon $200 (digital)
--  2500 pts → Audífonos Bluetooth
--
-- ─────────────────────────────────────────────────────────────
