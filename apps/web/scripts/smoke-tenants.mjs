#!/usr/bin/env node
/**
 * Smoke test de la separación por empresa (dominios, sesiones, marca).
 * Solo hace peticiones de LECTURA y logins fallidos — no escribe datos ni
 * envía correos. Úsalo después de configurar los dominios en cada ambiente.
 *
 *   JWT_SECRET=… \
 *   DISMANT_URL=https://club.dismant.com.mx \
 *   LAUTI_URL=https://club.silauti.com.mx \
 *   ADMIN_URL=https://admin.<dominio> \
 *   [HUB_URL=https://clubmomentos.<dominio>] \
 *   [LEGACY_URL=https://<dominio-anterior>] [EXPECT_LEGACY_REDIRECTS=true] \
 *   node scripts/smoke-tenants.mjs
 *
 * En local (npm run dev) basta con JWT_SECRET: usa *.localhost:3000.
 * JWT_SECRET debe ser el del ambiente probado (las sesiones se firman con él).
 */
import { SignJWT } from 'jose'

const port = process.env.PORT ?? '3000'
const local = (h) => `http://${h}.localhost:${port}`
const URLS = {
  dismant: process.env.DISMANT_URL ?? local('dismant'),
  lauti:   process.env.LAUTI_URL   ?? local('lauti'),
  admin:   process.env.ADMIN_URL   ?? local('admin'),
  legacy:  process.env.LEGACY_URL  ?? null,
  hub:     process.env.HUB_URL     ?? null,
}
const expectLegacyRedirects = process.env.EXPECT_LEGACY_REDIRECTS === 'true'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET (el del ambiente que vas a probar)')
  process.exit(2)
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET)
const sign = (p) => new SignJWT(p).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m').sign(secret)

// Sesiones sintéticas: el middleware solo valida firma, rol y empresa.
const S = {
  memberDismant: await sign({ sub: 'smoke-member-d', email: 'smoke-d@example.com', role: 'member', name: 'Smoke', affiliate: 'dismant', affiliates: ['dismant'] }),
  memberLauti:   await sign({ sub: 'smoke-member-l', email: 'smoke-l@example.com', role: 'member', name: 'Smoke', affiliate: 'lauti',   affiliates: ['lauti'] }),
  owner:         await sign({ sub: 'smoke-owner',    email: 'smoke-o@example.com', role: 'owner',  name: 'Smoke', affiliate: 'dismant', affiliates: ['dismant', 'lauti'] }),
}

let pass = 0, fail = 0
const ok  = (m) => { pass++; console.log(`  ✓ ${m}`) }
const bad = (m, d) => { fail++; console.log(`  ✗ ${m}  →  ${d}`) }

async function get(base, path, session, init = {}) {
  const res = await fetch(base + path, {
    redirect: 'manual',
    ...init,
    headers: { ...(session ? { cookie: `session=${session}` } : {}), ...(init.headers ?? {}) },
  })
  // Location puede venir relativo: se resuelve contra el dominio pedido
  const raw = res.headers.get('location')
  const location = raw ? new URL(raw, base).href : ''
  return { status: res.status, location, body: await res.text(), headers: res.headers }
}
const sameOrigin = (a, b) => { try { return new URL(a).origin === new URL(b).origin } catch { return false } }

async function expectRedirect(label, r, toBase, pathPrefix) {
  const loc = r.location ? new URL(r.location) : null
  const good = r.status >= 300 && r.status < 400 && r.location && (toBase ? sameOrigin(r.location, toBase) : true) && loc.pathname.startsWith(pathPrefix)
  good ? ok(label) : bad(label, `${r.status} ${r.location}`)
}
const expectStatus = (label, r, status) => (r.status === status ? ok(label) : bad(label, `HTTP ${r.status}`))
const expectBody = (label, r, text, present = true) => (r.body.includes(text) === present ? ok(label) : bad(label, `${present ? 'no contiene' : 'contiene'} "${text}"`))

console.log('Dominios:', URLS)

const login = (base, email) => get(base, '/api/auth/login', null, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'smoke-test-invalid' }),
})

console.log('── Enrutamiento')
await expectRedirect('portal Dismant /admin → panel central', await get(URLS.dismant, '/admin/dashboard'), URLS.admin, '/admin/dashboard')
await expectRedirect('panel central sin sesión → login', await get(URLS.admin, '/admin/dashboard'), URLS.admin, '/login')
await expectRedirect('panel central no sirve el portal de miembros', await get(URLS.admin, '/dashboard'), URLS.admin, '/login')
await expectRedirect('raíz del portal → login', await get(URLS.lauti, '/'), URLS.lauti, '/login')
await expectRedirect('raíz del portal con sesión → su inicio', await get(URLS.lauti, '/', S.memberLauti), URLS.lauti, '/dashboard')
await expectRedirect('sesión Dismant en portal Lauti → login', await get(URLS.lauti, '/dashboard', S.memberDismant), URLS.lauti, '/login')
await expectRedirect('sesión Lauti en portal Dismant → login', await get(URLS.dismant, '/dashboard', S.memberLauti), URLS.dismant, '/login')
await expectRedirect('staff en portal de miembros → login', await get(URLS.dismant, '/dashboard', S.owner), URLS.dismant, '/login')
await expectRedirect('miembro en panel central → login', await get(URLS.admin, '/admin/dashboard', S.memberLauti), URLS.admin, '/login')
expectStatus('API cliente con sesión de otra empresa → 401', await get(URLS.lauti, '/api/client/catalog', S.memberDismant), 401)
expectStatus('API cliente en panel central → 404', await get(URLS.admin, '/api/client/catalog', S.memberLauti), 404)

console.log('── Identidad por dominio')
const loginD = await get(URLS.dismant, '/login')
expectBody('login Dismant muestra su marca', loginD, 'Club Momentos Dismant')
expectBody('login Dismant no muestra Lauti', loginD, 'Club Momentos Lauti', false)
const loginL = await get(URLS.lauti, '/login')
expectBody('login Lauti muestra su marca', loginL, 'Club Momentos Lauti')
expectBody('login Lauti no muestra Dismant', loginL, 'Club Momentos Dismant', false)
expectBody('login panel central', await get(URLS.admin, '/login'), 'Panel de administración')

console.log('── Login por portal (credenciales inválidas, no inicia sesión)')
expectStatus('credenciales inválidas → 401 genérico', await login(URLS.dismant, 'no-existe-smoke@example.com'), 401)

if (URLS.hub) {
  console.log('── Página de inicio (entrada del proyecto)')
  const home = await get(URLS.hub, '/')
  expectStatus('la página de inicio carga', home, 200)
  expectBody('muestra la bienvenida', home, 'Bienvenido a tu programa de lealtad')
  expectBody('incluye el formulario de inicio de sesión', home, 'Correo electrónico')
  expectBody('empresas afiliadas: enlace a Dismant', home, 'https://dismant.com.mx/')
  expectBody('empresas afiliadas: enlace a Lauti', home, 'https://www.silauti.com.mx/')
  expectBody('no muestra "Elige tu club"', home, 'Elige tu club', false)
  await expectRedirect('otras rutas de la entrada → inicio', await get(URLS.hub, '/dashboard'), URLS.hub, '/')
  expectStatus('la entrada no expone la API del portal', await get(URLS.hub, '/api/client/catalog', S.memberLauti), 404)
  expectStatus('login en la entrada con credenciales inválidas → 401', await login(URLS.hub, 'no-existe-smoke@example.com'), 401)
  const badPass = await get(URLS.hub, '/api/auth/pass?token=pase-falso')
  await expectRedirect('pase inválido → login con aviso', badPass, null, '/login')
}

if (URLS.legacy) {
  console.log(`── Dominio anterior (redirects ${expectLegacyRedirects ? 'activos' : 'inactivos'})`)
  if (expectLegacyRedirects) {
    if (URLS.hub) await expectRedirect('sin sesión → página de inicio', await get(URLS.legacy, '/login'), URLS.hub, '/')
    await expectRedirect('miembro Lauti → su portal', await get(URLS.legacy, '/catalog', S.memberLauti), URLS.lauti, '/catalog')
    await expectRedirect('staff → panel central', await get(URLS.legacy, '/admin/members', S.owner), URLS.admin, '/admin/members')
  } else {
    expectStatus('dominio anterior sigue sirviendo el login', await get(URLS.legacy, '/login'), 200)
  }
}

console.log(`\nRESULTADO: ${pass} OK, ${fail} fallas`)
process.exit(fail ? 1 : 0)
