# Guía de Setup — Club Momentos Dismant

> Última actualización: Mayo 2026

Este documento tiene dos partes:
1. **Qué me necesitas proporcionar** — credenciales y datos para que pueda completar e integrar cada servicio.
2. **Paso a paso para correr y probar el proyecto localmente** — desde cero hasta tener la app funcionando.

---

## Parte 1 — Qué necesito que me proporciones

### Nivel de urgencia por servicio

| # | Servicio | Sin él... | Obligatorio |
|---|---|---|---|
| 1 | **Supabase** | La app no arranca (no hay DB) | Sí |
| 2 | **JWT\_SECRET** | La app no arranca (no hay sesiones) | Sí |
| 3 | **Resend** | Los OTPs salen en consola del servidor (aceptable en dev) | No (pero sí en staging) |
| 4 | **Cloudflare R2** | Los uploads de XML e imágenes fallan | No (pero sí para pruebas de facturas) |
| 5 | **Facturapi** | Las facturas no se validan ante el SAT | No (pero sí para probar el flujo completo) |
| 6 | **Upstash Redis** | Los workers BullMQ no inician, validación SAT no ocurre | No (pero sí para el flujo de facturas real) |
| 7 | **Firebase** | No hay push notifications | No |
| 8 | **Vercel** | Los GitHub Actions de deploy no funcionan | Solo para CI/CD |
| 9 | **RFC de Dismant** | Las facturas siempre son rechazadas | Sí para CFDI |

---

### 1. Supabase (obligatorio)

**Dónde:** [supabase.com](https://supabase.com) → Sign up gratis → New project

**Qué crear:**
- Un proyecto llamado `dismant-staging` (región: US East o la más cercana a México).

**Qué necesito de ti:**

Una vez creado el proyecto, ve a **Settings → API** y cópiame estos 4 valores:

| Variable | Dónde encontrarla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" en Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "anon public" en Settings → API → Project API keys |
| `SUPABASE_SERVICE_ROLE_KEY` | "service\_role" en Settings → API → Project API keys |

Luego ve a **Settings → Database → Connection string** y en el tab **URI** cópiame:

| Variable | Dónde | Nota |
|---|---|---|
| `DATABASE_URL` | Tab "Transaction pooler" | Cambia `[YOUR-PASSWORD]` por tu contraseña real. Puerto: 6543 |
| `DIRECT_URL` | Tab "Session pooler" | Puerto: 5432. Requerido por Prisma Migrate |

> **Importante:** Cuando copies los strings de conexión de Supabase, verifica que tengan `?pgbouncer=true` al final del `DATABASE_URL` y que el `DIRECT_URL` **no** lo tenga.

---

### 2. JWT\_SECRET (obligatorio)

No necesitas ningún servicio externo. Solo ejecuta este comando en tu terminal y compárteme el resultado:

```bash
openssl rand -base64 64
```

Genera un string de 64 caracteres aleatorios. Ese es tu `JWT_SECRET`.

---

### 3. Resend (recomendado para staging, opcional en local)

**Dónde:** [resend.com](https://resend.com) → Sign up gratis

**Plan gratuito:** 3,000 emails/mes. Más que suficiente para pruebas.

**Sin Resend configurado:** Los códigos OTP y los Magic Links aparecen en la consola del servidor de Next.js (logs del `npm run dev`). Funciona para desarrollo local.

**Qué necesito de ti:**

1. Ir a **API Keys** → Create API key.
2. (Opcional pero recomendado) Verificar tu dominio en **Domains** → Add domain.

| Variable | Dónde |
|---|---|
| `RESEND_API_KEY` | API Keys → el key que creaste (empieza con `re_`) |
| `RESEND_FROM_EMAIL` | El email desde el que envía (ej. `noreply@clubmomentos.com.mx`) |
| `RESEND_FROM_NAME` | Nombre visible (ej. `Club Momentos Dismant`) |

> **Si no tienes dominio propio aún:** Usa `onboarding@resend.dev` como `RESEND_FROM_EMAIL` para pruebas (Resend lo permite sin verificar dominio).

---

### 4. Cloudflare R2 (para probar uploads de XML e imágenes)

**Dónde:** [cloudflare.com](https://dash.cloudflare.com) → R2 Object Storage (requiere tarjeta de crédito para activar, pero el tier gratuito es 10GB)

**Qué crear:**
- Un bucket llamado `dismant-staging`.
- En el bucket: activar "Public access" si quieres que las imágenes de premios sean públicas (recomendado para las imágenes del catálogo).

**Qué necesito de ti:**

1. Ir a **R2 → Manage R2 API Tokens** → Create API token.
   - Permiso: "Object Read & Write"
   - Bucket: especificar `dismant-staging`

| Variable | Dónde |
|---|---|
| `R2_ACCOUNT_ID` | Settings → My Profile → Account ID |
| `R2_ACCESS_KEY_ID` | El token que creaste → Access Key ID |
| `R2_SECRET_ACCESS_KEY` | El token que creaste → Secret Access Key |
| `R2_BUCKET_NAME` | `dismant-staging` |
| `R2_PUBLIC_URL` | (Opcional) URL pública del bucket si activaste acceso público |

---

### 5. Facturapi — Validación CFDI (para probar facturas con el SAT)

**Dónde:** [facturapi.io](https://www.facturapi.io) → Registro gratuito

**Sandbox:** Las consultas en sandbox son gratuitas e ilimitadas.

**Qué necesito de ti:**

1. Ir a **API Keys** → copiar la clave de Sandbox (empieza con `sk_test_`).
2. El **RFC oficial de Dismant** (el RFC real con el que Dismant emite facturas a sus clientes).

| Variable | Dónde |
|---|---|
| `FACTURAPI_SECRET_KEY` | API Keys → Sandbox → `sk_test_...` |
| `DISMANT_RFC` | El RFC oficial de Dismant (ej. `DIS010101AAA`) |

---

### 6. Upstash Redis — Colas BullMQ (para el worker de validación de facturas)

**Dónde:** [upstash.com](https://upstash.com) → Create account → Redis → Create database

**Plan gratuito:** 10,000 comandos/día. Suficiente para pruebas.

**Qué crear:** Una base de datos Redis en la región más cercana (US-East-1 o similar).

**Qué necesito de ti:**

Una vez creado, en el dashboard del database:

| Variable | Dónde |
|---|---|
| `UPSTASH_REDIS_URL` | Pestaña "REST API" → URL (empieza con `https://`) |
| `UPSTASH_REDIS_TOKEN` | Pestaña "REST API" → Token |
| `UPSTASH_REDIS_HOST` | Pestaña "Details" → Endpoint (sin `https://`) |
| `UPSTASH_REDIS_PASSWORD` | Pestaña "Details" → Password |

---

### 7. Firebase — Push Notifications (opcional en MVP inicial)

**Dónde:** [console.firebase.google.com](https://console.firebase.google.com) → Crear proyecto

**Qué activar:** Cloud Messaging (FCM)

**Qué necesito de ti:**

**Credenciales del cliente** — en Project Settings → General → Your apps → Web app:

| Variable | Dónde |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Config del web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Config del web app |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Config del web app |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Config del web app |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Config del web app |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Project Settings → Cloud Messaging → Web configuration → Web Push certificates → Generate key pair |

**Credenciales del servidor** — en Project Settings → Service accounts → Generate new private key (descarga el JSON):

| Variable | Dónde en el JSON |
|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | Campo `"project_id"` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Campo `"client_email"` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Campo `"private_key"` (incluir con las `\n` tal cual) |

---

### 8. Vercel — Para CI/CD (solo si quieres activar los GitHub Actions de deploy)

**Dónde:** [vercel.com](https://vercel.com) → Import project → conectar el repo de GitHub

**Qué necesito de ti:**

1. Crear el proyecto en Vercel conectando el repositorio.
2. Ir a [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create token.
3. En el proyecto de Vercel, ir a Settings → General → copiar el "Project ID".
4. En el team/cuenta de Vercel, ir a Settings → General → copiar el "Team ID" (o tu ID personal).

| Secret de GitHub | Dónde |
|---|---|
| `VERCEL_TOKEN` | Account → Tokens |
| `VERCEL_ORG_ID` | Team Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Project Settings → General → Project ID |

---

### 9. RFC oficial de Dismant

Solo necesito el RFC real de Dismant. Este valor va en `DISMANT_RFC`. El sistema lo usa para validar que las facturas que suben los clientes fueron emitidas por Dismant (verifica que el RFC emisor del CFDI coincida con este valor).

---

## Parte 2 — Paso a paso para correr y probar el proyecto

### Requisitos previos

Verifica que tengas instalado:

```bash
node --version   # Debe ser >= 20.0.0
npm --version    # Debe ser >= 10.0.0
git --version    # Cualquier versión reciente
```

---

### Paso 1 — Clonar e instalar

```bash
# Desde la raíz del proyecto
npm install
```

Esto instala las dependencias de todos los workspaces del monorepo (apps/web + packages/).

---

### Paso 2 — Configurar variables de entorno

```bash
# Copia el template
cp .env.example apps/web/.env.local
```

Abre `apps/web/.env.local` y llena los valores. **Mínimo indispensable para que la app arranque:**

```bash
# ── OBLIGATORIAS ──────────────────────────────────────
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=<el-resultado-de-openssl-rand--base64-64>

NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── OPCIONALES (la app arranca sin ellas, con funcionalidad limitada) ──
RESEND_API_KEY=                  # Si vacío: OTPs y magic links salen en consola
R2_ACCOUNT_ID=                   # Si vacío: uploads de archivos fallan
FACTURAPI_SECRET_KEY=            # Si vacío: validación SAT falla silenciosamente
UPSTASH_REDIS_HOST=              # Si vacío: worker no inicia
DISMANT_RFC=XAXX010101000        # Valor de prueba para sandbox

# ── REGLAS DE NEGOCIO (puedes dejar los defaults) ──────
POINTS_PER_AMOUNT=100
POINTS_EXPIRY_DAYS=180
WELCOME_BONUS_POINTS=100
REVIEW_BONUS_POINTS=5
INVOICE_MAX_AGE_DAYS=90
REVIEW_MIN_COMMENT_LENGTH=20
INVOICE_AUTO_APPROVE=false
```

---

### Paso 3 — Configurar la base de datos

Crea el archivo `packages/database/.env` con:

```bash
# Copia exactamente estos dos valores de Supabase → Settings → Database → Connection string
DATABASE_URL="postgresql://postgres.XXXX:[TU-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.XXXX:[TU-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

> **Diferencia clave:** `DATABASE_URL` usa el puerto `6543` (pooler para runtime), `DIRECT_URL` usa el puerto `5432` (directo para migraciones). Si los intercambias, las migraciones fallarán.

---

### Paso 4 — Generar el cliente Prisma

```bash
# Desde la raíz del monorepo
npm run db:generate
```

Esto genera el cliente TypeScript de Prisma en `packages/database/node_modules/.prisma/`.

---

### Paso 5 — Aplicar las migraciones

```bash
cd packages/database
npm run db:migrate
```

Esto crea todas las tablas en tu proyecto de Supabase. Si es la primera vez, verás 4 migraciones aplicarse:
- `20260519000000_init` — tablas principales
- `20260519000001_invitations` — sistema de invitaciones
- `20260520000000_notifications` — centro de notificaciones in-app
- `20260520000001_ledger_immutable` — triggers de protección del ledger

Puedes verificar las tablas en el **Supabase Studio → Table Editor**.

```bash
# Volver a la raíz
cd ../..
```

---

### Paso 6 — Cargar datos de prueba (seed)

El archivo `packages/database/prisma/seed.sql` tiene todo lo necesario para empezar a probar. Ejecútalo en **Supabase → SQL Editor → New query** (copia y pega todo el contenido del archivo).

El seed crea:
- 4 roles: `owner`, `admin`, `employee`, `member`
- 1 usuario owner/admin: `admin@dismant.com` (cámbialo a tu email real)
- 1 invitación de prueba con token `TEST-INVITE-LOCAL-2026` para `miembro@test.com`
- 5 premios de prueba en el catálogo

> **Importante:** Antes de correr el seed, edita la línea del usuario admin en `seed.sql` y cambia `admin@dismant.com` por tu correo real. Eso te permitirá hacer login como owner.

---

### Paso 7 — Levantar la app

```bash
# Desde la raíz del monorepo
npm run dev
```

Esto levanta:
- **Next.js** en `http://localhost:3000`

En otra terminal (opcional, para probar el flujo completo de facturas):

```bash
cd apps/web
npm run workers:dev
```

Esto levanta los workers BullMQ (requiere Upstash configurado).

---

### Paso 8 — Probar los flujos principales

#### Flujo 1: Login como Admin (Owner)

1. Ve a `http://localhost:3000/login`
2. Ingresa `admin@dismant.com` (o el email que pusiste en el seed)
3. Haz clic en "Enviar enlace de acceso"
4. **Si no tienes Resend:** Revisa la consola donde corre `npm run dev`. Verás:
   ```
   [DEV] Magic Link para admin@dismant.com: http://localhost:3000/api/auth/verify-magic-link?token=...
   ```
5. Abre esa URL en el navegador. Serás redirigido al panel de admin.

---

#### Flujo 2: Registrar un nuevo miembro (Flujo de onboarding)

La app usa registro por invitación. El seed ya creó una invitación de prueba.

1. Ve a `http://localhost:3000/register?invite=TEST-INVITE-LOCAL-2026`
2. En el formulario, usa el email `miembro@test.com` (es el email al que está vinculada la invitación).
3. Llena los demás campos (nombre, empresa, RFC de prueba, estado, ciudad).
4. Acepta términos y haz clic en "Siguiente".
5. Se enviará un OTP al email. **Si no tienes Resend:** revisa la consola del servidor:
   ```
   [DEV] OTP para miembro@test.com: 123456
   ```
6. Ingresa el código en el formulario. Serás redirigido al dashboard del cliente.

> **Para registrar más miembros en el futuro:** Desde el panel admin (`/admin/invitations`), crea invitaciones nuevas.

---

#### Flujo 3: Portal del cliente

Con la sesión del miembro activa:

1. **Dashboard** (`/dashboard`) — ver saldo de puntos (100 pts de bienvenida).
2. **Catálogo** (`/catalog`) — ver los 5 premios del seed.
3. **Canjear un premio** — selecciona un premio y confirma el canje. Aparece el voucher.
4. **Mis canjes** (`/redemptions`) — ver el historial de canjes.
5. **Estado de cuenta** (`/statement`) — ver todos los movimientos del ledger.
6. **Facturas** (`/invoices`) — subir un XML de CFDI (requiere R2 + Facturapi para el flujo completo).

---

#### Flujo 4: Subir una factura XML

Para este flujo necesitas R2 y Facturapi configurados.

**En sandbox de Facturapi:** Puedes usar cualquier UUID con el formato correcto y el RFC del sandbox. Sin embargo, la validación ante el SAT en sandbox siempre devuelve `vigente` para cualquier UUID con formato válido.

1. Ingresa como miembro.
2. Ve a `/invoices` → "Subir factura XML".
3. Arrastra un archivo XML de CFDI real (o usa un XML de prueba con el RFC de Dismant como emisor y el RFC del miembro como receptor).
4. El sistema extrae los datos del XML y los valida localmente.
5. La factura queda en estado "Pendiente" y aparece en la cola del admin.

**Para aprobar la factura:**
1. Ingresa como admin.
2. Ve a `/admin/invoices` → busca la factura → "Aprobar".
3. Los puntos se acreditan automáticamente en el ledger del miembro.

---

#### Flujo 5: Panel de administración

Con la sesión del owner activa:

| Sección | URL | Qué probar |
|---|---|---|
| Dashboard admin | `/admin/dashboard` | KPIs del programa |
| Miembros | `/admin/members` | Buscar miembro, ver detalle, agregar puntos |
| Facturas | `/admin/invoices` | Cola de aprobación |
| Catálogo | `/admin/catalog` | Crear/editar premios |
| Reportes | `/admin/reports` | Gráficas de actividad |
| Auditoría | `/admin/audit` | Log de operaciones |
| Invitaciones | `/admin/invitations` | Crear invitaciones para nuevos miembros |

---

### Paso 9 — Configurar GitHub Actions (para CI/CD)

Una vez que tengas el proyecto en GitHub y los secretos de Vercel:

1. Ve a tu repositorio en GitHub → **Settings → Secrets and variables → Actions**
2. Agrega los siguientes secretos (tab "Secrets"):

```
VERCEL_TOKEN          → token de Vercel
VERCEL_ORG_ID         → Team ID de Vercel
VERCEL_PROJECT_ID     → Project ID de Vercel
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
```

3. (Opcional) Para activar el deploy de workers a Railway, agrega en el tab "Variables":
   ```
   RAILWAY_ENABLED = true
   ```
   Y en Secrets:
   ```
   RAILWAY_TOKEN → token de Railway
   ```

**Verificar que CI funciona:**

```bash
git push origin testing
```

Ve a la pestaña **Actions** en GitHub. Deberías ver el workflow `Deploy to Staging` ejecutándose.

Los PRs también dispararán el workflow `CI` automáticamente.

---

### Resumen de lo que necesito de ti

Organizado por prioridad:

#### Para empezar a probar hoy (mínimo)
- [ ] **Supabase:** URL del proyecto, Anon Key, Service Role Key, DATABASE\_URL y DIRECT\_URL
- [ ] **JWT\_SECRET:** resultado de `openssl rand -base64 64`

#### Para tener la app completa funcionando
- [ ] **Resend:** API Key y email de envío
- [ ] **Cloudflare R2:** Account ID, Access Key, Secret Key, nombre del bucket
- [ ] **Facturapi:** Secret Key de sandbox (`sk_test_...`)
- [ ] **Upstash:** REST URL, Token, Host, Password
- [ ] **RFC de Dismant:** el RFC oficial con el que se emiten las facturas

#### Para CI/CD con GitHub Actions
- [ ] **Vercel:** Token, Org ID, Project ID
- [ ] Las variables `NEXT_PUBLIC_FIREBASE_*` y `NEXT_PUBLIC_SUPABASE_*` como secretos de GitHub

#### Para push notifications (puede esperar)
- [ ] Credenciales completas de Firebase (cliente + admin SDK)
