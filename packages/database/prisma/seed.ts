import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log('🌱 Iniciando seed...\n')

  // ── 1. ROLES ──────────────────────────────────────────────
  console.log('→ Verificando roles...')
  // Insertar solo los que no existan (ignorar si ya hay por nombre)
  for (const name of ['owner', 'admin', 'employee', 'member']) {
    await supabase.from('roles').insert({ name }).select().maybeSingle()
    // ignoramos error de duplicado intencionalmente
  }
  // Leer los IDs reales de la DB
  const { data: roles, error: rolesReadError } = await supabase
    .from('roles').select('id, name')
  if (rolesReadError) throw new Error(`roles read: ${rolesReadError.message}`)
  const roleMap = Object.fromEntries(roles!.map(r => [r.name, r.id]))
  console.log('  ✓ Roles:', Object.keys(roleMap).join(', '), '\n')

  // ── 2. USUARIO ADMIN / OWNER ──────────────────────────────
  console.log('→ Insertando usuario owner...')
  const { error: adminError } = await supabase.from('members').upsert([
    {
      id:           'member-admin-0000-0000-000000000001',
      email:        'admin@dismant.com',
      full_name:    'Administrador Dismant',
      company_name: 'Distribuidora Dismant',
      rfc:          'DIS010101AAA',
      location_state: 'Ciudad de México',
      location_city:  'CDMX',
      status:       'active',
      role_id:      roleMap['owner'],
    },
  ], { onConflict: 'id' })
  if (adminError) throw new Error(`admin: ${adminError.message}`)
  console.log('  ✓ Owner: admin@dismant.com\n')

  // ── 3. INVITACIONES DE PRUEBA ─────────────────────────────
  console.log('→ Insertando invitaciones de prueba...')
  const { error: invError } = await supabase.from('invitations').upsert([
    {
      id:       'invite-test-0000-0000-000000000001',
      email:    'miembro@test.com',
      token:    'TEST-INVITE-LOCAL-2026',
      sent_by:  'member-admin-0000-0000-000000000001',
      used:     false,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id:       'invite-test-0000-0000-000000000002',
      email:    'cliente2@test.com',
      token:    'TEST-INVITE-CLIENTE2-2026',
      sent_by:  'member-admin-0000-0000-000000000001',
      used:     false,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ], { onConflict: 'id' })
  if (invError) throw new Error(`invitations: ${invError.message}`)
  console.log('  ✓ 2 invitaciones creadas\n')

  // ── 4. PREMIOS DE PRUEBA ──────────────────────────────────
  console.log('→ Insertando premios de prueba...')
  const { error: skusError } = await supabase.from('reward_skus').upsert([
    {
      id:          'sku-cafe-0000-0000-000000000001',
      name:        'Café de especialidad 250g',
      description: 'Bolsa de café de especialidad de origen único, tostado artesanal.',
      points_cost: 150,
      stock:       50,
      geo_type:    'national',
      geo_states:  [],
      geo_cities:  [],
      is_digital:  false,
      status:      'active',
      category:    'Alimentos',
    },
    {
      id:          'sku-gift-0000-0000-000000000002',
      name:        'Tarjeta de regalo Amazon $200',
      description: 'Código digital de Amazon México con saldo de $200 MXN.',
      points_cost: 500,
      stock:       100,
      geo_type:    'national',
      geo_states:  [],
      geo_cities:  [],
      is_digital:  true,
      status:      'active',
      category:    'Digital',
    },
    {
      id:          'sku-merm-0000-0000-000000000003',
      name:        'Kit de mermeladas artesanales',
      description: 'Set de 3 mermeladas artesanales (fresa, mango y frutos rojos).',
      points_cost: 300,
      stock:       30,
      geo_type:    'national',
      geo_states:  [],
      geo_cities:  [],
      is_digital:  false,
      status:      'active',
      category:    'Alimentos',
    },
    {
      id:          'sku-cinp-0000-0000-000000000004',
      name:        'Boletos de cine (2 personas)',
      description: '2 boletos para cualquier función en Cinépolis o Cinemex.',
      points_cost: 400,
      stock:       20,
      geo_type:    'local',
      geo_states:  ['Ciudad de México', 'Jalisco', 'Nuevo León'],
      geo_cities:  [],
      is_digital:  false,
      status:      'active',
      category:    'Entretenimiento',
    },
    {
      id:          'sku-tech-0000-0000-000000000005',
      name:        'Audífonos inalámbricos Bluetooth',
      description: 'Audífonos over-ear con cancelación de ruido pasiva, 20h de batería.',
      points_cost: 2500,
      stock:       10,
      geo_type:    'national',
      geo_states:  [],
      geo_cities:  [],
      is_digital:  false,
      status:      'active',
      category:    'Tecnología',
    },
  ], { onConflict: 'id' })
  if (skusError) throw new Error(`reward_skus: ${skusError.message}`)
  console.log('  ✓ 5 premios creados\n')

  console.log('✅ Seed completado.\n')
  console.log('Resumen:')
  console.log('  Roles:        owner, admin, employee, member')
  console.log('  Admin:        admin@dismant.com  (role: owner)')
  console.log('  Invitaciones: TEST-INVITE-LOCAL-2026  →  miembro@test.com')
  console.log('                TEST-INVITE-CLIENTE2-2026  →  cliente2@test.com')
  console.log('  Catálogo:     5 premios (150–2500 pts)')
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err.message)
  process.exit(1)
})
