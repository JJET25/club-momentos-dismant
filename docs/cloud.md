# Club Momentos Dismant — Arquitectura Cloud
**Versión:** 1.0  
**Fecha:** Mayo 2026

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Servicios y Proveedores](#2-servicios-y-proveedores)
3. [Ambientes](#3-ambientes)
4. [Estructura del Repositorio](#4-estructura-del-repositorio)
5. [Base de Datos](#5-base-de-datos)
6. [Almacenamiento de Archivos](#6-almacenamiento-de-archivos)
7. [Autenticación y Sesiones](#7-autenticación-y-sesiones)
8. [Sistema de Colas](#8-sistema-de-colas)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [Monitoreo y Logs](#11-monitoreo-y-logs)
12. [Costos Estimados](#12-costos-estimados)
13. [Checklist de Setup Inicial](#13-checklist-de-setup-inicial)

---

## 1. Visión General

La infraestructura de Club Momentos Dismant se basa en servicios gestionados (managed services) para reducir la carga operativa al mínimo. No se administran servidores directamente — cada capa usa el tier gratuito de su proveedor durante el MVP y escala automáticamente cuando el volumen lo justifique.

### Diagrama de Infraestructura

```
                          ┌─────────────────────────────┐
                          │         USUARIOS              │
                          │   (Clientes + Admins)         │
                          └──────────────┬────────────────┘
                                         │ HTTPS
                          ┌──────────────▼────────────────┐
                          │         Cloudflare             │
                          │   (DNS + CDN + SSL gratis)     │
                          └──────────────┬────────────────┘
                                         │
               ┌─────────────────────────┼──────────────────────┐
               │                         │                       │
   ┌───────────▼──────────┐  ┌──────────▼──────────┐           │
   │   Vercel (Frontend)   │  │  Railway (Backend)   │           │
   │   Next.js 14 App      │  │  NestJS API          │           │
   │   - SSR/SSG           │  │  - REST API          │           │
   │   - Edge Functions    │  │  - Webhooks          │           │
   └───────────────────────┘  └──────────┬───────────┘           │
                                          │                       │
              ┌───────────────────────────┼───────────────┐       │
              │                           │               │       │
   ┌──────────▼──────────┐  ┌────────────▼──────┐  ┌────▼────┐  │
   │  Supabase            │  │  Cloudflare R2    │  │  Redis  │  │
   │  - PostgreSQL 15     │  │  (File Storage)   │  │(Upstash)│  │
   │  - Auth              │  │  - XMLs CFDI      │  │  Queue  │  │
   │  - Realtime          │  │  - Imágenes       │  └─────────┘  │
   │  - Row Level Sec.    │  │  - PDFs           │               │
   └──────────────────────┘  └───────────────────┘               │
                                                                  │
              ┌───────────────────────────────────────────────────┘
              │            SERVICIOS EXTERNOS
              │
   ┌──────────▼──────────────────────────────────────────────────┐
   │  Resend (Email)  │  Firebase FCM (Push)  │  Facturapi (SAT) │
   └─────────────────────────────────────────────────────────────┘
```

---

## 2. Servicios y Proveedores

### Capa de Presentación

| Servicio | Proveedor | Plan | URL |
|---|---|---|---|
| Frontend hosting | Vercel | Hobby (gratis) / Pro ($20/mes) | vercel.com |
| CDN + DNS + SSL | Cloudflare | Free (gratis permanente) | cloudflare.com |
| Dominio | Namecheap | ~$200 MXN/año (.com.mx) | namecheap.com |

**Por qué Vercel para Next.js:** Vercel construyó Next.js — el soporte de Server Components, Edge Functions y despliegues automáticos está optimizado de origen. El plan Hobby es suficiente para el MVP; el plan Pro se activa solo si se necesitan más builds o equipos.

**Por qué Cloudflare gratis:** Cloudflare actúa como proxy entre el dominio y Vercel. Proporciona SSL automático, protección DDoS básica y caché de assets estáticos sin costo. Solo se configura el DNS apuntando los nameservers a Cloudflare.

---

### Capa de API y Lógica de Negocio

| Servicio | Proveedor | Plan | URL |
|---|---|---|---|
| Backend hosting | Railway | Starter ($5/mes) | railway.app |
| Cola de trabajos | Upstash (Redis) | Free (10k cmd/día) | upstash.com |

**Por qué Railway para NestJS:** Railway detecta automáticamente el proyecto Node.js, lo construye y lo despliega con un solo push. Tiene soporte nativo para variables de entorno, dominios automáticos y logs. El plan Starter cuesta $5/mes y es suficiente para producción de bajo volumen.

**Alternativa sin costo:** Para el MVP más pequeño, las API Routes de Next.js (desplegadas en Vercel) pueden reemplazar a NestJS completamente, reduciendo el costo de Railway a $0. Se migra a NestJS cuando la complejidad del backend lo justifique.

---

### Base de Datos

| Servicio | Proveedor | Plan | URL |
|---|---|---|---|
| PostgreSQL | Supabase | Free (hasta 50k usuarios) | supabase.com |
| Backups automáticos | Supabase | Incluido en Free | — |

**Por qué Supabase:** Incluye PostgreSQL gestionado, autenticación (para el magic link), Row Level Security nativo, Realtime (para actualizaciones en vivo del dashboard), backups diarios automáticos y una interfaz visual para administrar tablas. Todo en el tier gratuito hasta 50,000 usuarios activos mensuales.

---

### Almacenamiento

| Servicio | Proveedor | Plan | URL |
|---|---|---|---|
| File storage | Cloudflare R2 | Free (10 GB, 1M req/mes) | cloudflare.com/r2 |

**Por qué R2 y no S3:** R2 no cobra por egress (salida de datos), lo cual es la mayor sorpresa de costo en S3. Para almacenar XMLs de CFDI, imágenes de premios y PDFs de estados de cuenta, R2 es prácticamente gratuito en el volumen del MVP.

**Estructura de carpetas en R2:**
```
club-momentos-dismant/
├── invoices/
│   └── {member_id}/
│       └── {uuid_cfdi}.xml
├── rewards/
│   └── {sku_id}/
│       └── cover.webp
├── promotions/
│   └── {promotion_id}/
│       └── banner.webp
└── statements/
    └── {member_id}/
        └── {YYYY-MM}.pdf
```

---

### Comunicaciones

| Servicio | Proveedor | Plan | URL |
|---|---|---|---|
| Email transaccional | Resend | Free (3,000/mes) | resend.com |
| Push notifications | Firebase FCM | Free (sin límite) | firebase.google.com |

**Por qué Resend:** API de email moderna diseñada para desarrolladores. Tiene SDKs para Node.js y soporte nativo para plantillas React (React Email). Los 3,000 emails mensuales del plan gratuito cubren holgadamente el MVP. Si se supera, el plan siguiente cuesta $20/mes para 50,000 emails.

**Firebase FCM setup:**
1. Crear proyecto en Firebase Console.
2. Activar Cloud Messaging.
3. Agregar el Service Worker en el frontend (`/public/firebase-messaging-sw.js`).
4. Solicitar permiso al usuario en el primer login.
5. Guardar el token FCM en la tabla `members`.

---

### Servicios de Negocio

| Servicio | Proveedor | Plan | URL |
|---|---|---|---|
| Validación CFDI | Facturapi | Pay-per-use (~$1 MXN/consulta) | facturapi.io |

**Por qué Facturapi:** Es el estándar en México para consultar el webservice del SAT. Tiene SDK para Node.js, modo sandbox para pruebas, y documentación clara. El costo por consulta es mínimo para el volumen inicial.

**Alternativa gratuita (solo para equipos técnicos avanzados):** Integración directa con el webservice SOAP del SAT (`consultaStatus`). Requiere manejo de certificados y es inestable en producción. No recomendado para MVP.

---

## 3. Ambientes

### Tres ambientes estándar

```
LOCAL       → Desarrollo en máquina del desarrollador
STAGING     → Ambiente de pruebas idéntico a producción
PRODUCTION  → Ambiente real con datos reales
```

### Configuración por ambiente

| Recurso | Local | Staging | Production |
|---|---|---|---|
| Base de datos | Supabase (proyecto staging) | Supabase (proyecto staging) | Supabase (proyecto prod) |
| Frontend URL | http://localhost:3000 | staging.clubmomentos.com.mx | clubmomentos.com.mx |
| API URL | http://localhost:3001 | api-staging.clubmomentos.com.mx | api.clubmomentos.com.mx |
| Facturapi | Modo sandbox | Modo sandbox | Modo producción |
| Emails | Logs en consola | Resend (dominio de prueba) | Resend (dominio real) |
| Storage R2 | Bucket `dismant-staging` | Bucket `dismant-staging` | Bucket `dismant-prod` |

**Regla de oro:** Nunca usar datos de producción en staging. Nunca conectar el sandbox de Facturapi en producción.

---

## 4. Estructura del Repositorio

```
club-momentos-dismant/               # Monorepo
├── apps/
│   ├── web/                         # Next.js 14 (Frontend + API Routes del MVP)
│   │   ├── app/
│   │   │   ├── (auth)/              # Rutas de autenticación (login, register, otp)
│   │   │   ├── (client)/            # Portal del cliente
│   │   │   │   ├── dashboard/
│   │   │   │   ├── catalog/
│   │   │   │   ├── redemptions/
│   │   │   │   ├── statement/
│   │   │   │   └── promotions/
│   │   │   ├── (admin)/             # Panel de administración
│   │   │   │   ├── dashboard/
│   │   │   │   ├── members/
│   │   │   │   ├── invoices/
│   │   │   │   ├── catalog/
│   │   │   │   ├── promotions/
│   │   │   │   ├── reports/
│   │   │   │   └── audit/
│   │   │   └── api/                 # API Routes (solo para MVP)
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── client/              # Componentes del portal cliente
│   │   │   └── admin/               # Componentes del panel admin
│   │   ├── lib/
│   │   │   ├── supabase.ts          # Cliente de Supabase
│   │   │   ├── resend.ts            # Cliente de Resend
│   │   │   ├── r2.ts                # Cliente de Cloudflare R2
│   │   │   └── facturapi.ts         # Cliente de Facturapi
│   │   └── public/
│   │       └── firebase-messaging-sw.js
│   │
│   └── api/                         # NestJS (Fase 2+, cuando el backend crece)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── members/
│       │   │   ├── invoices/
│       │   │   ├── ledger/
│       │   │   ├── catalog/
│       │   │   ├── redemptions/
│       │   │   ├── promotions/
│       │   │   └── reports/
│       │   └── common/
│       │       ├── guards/          # Auth guards + RBAC guards
│       │       ├── decorators/
│       │       └── pipes/
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   ├── database/                    # Schema Prisma compartido
│   ├── types/                       # Tipos TypeScript compartidos
│   └── email-templates/             # Plantillas React Email
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Tests + lint en cada PR
│       └── deploy.yml               # Deploy a staging/prod
│
├── .env.example                     # Template de variables de entorno
├── turbo.json                       # Turborepo config
└── package.json                     # Workspace root
```

---

## 5. Base de Datos

### Conexión a Supabase

```typescript
// packages/database/src/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Solo en backend
)

// En el frontend usar SUPABASE_ANON_KEY (respeta Row Level Security)
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Row Level Security (RLS) — Políticas Críticas

```sql
-- ledger_entries: solo INSERT, nunca UPDATE/DELETE
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own ledger"
  ON ledger_entries FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Service role can insert ledger"
  ON ledger_entries FOR INSERT
  WITH CHECK (true);  -- Solo accesible con service_role_key

-- audit_log: solo INSERT
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      JOIN roles r ON m.role_id = r.id
      WHERE m.id = auth.uid()
      AND r.name IN ('owner', 'admin')
    )
  );
```

### Índices Importantes

```sql
-- Consultas frecuentes del ledger
CREATE INDEX idx_ledger_member_created ON ledger_entries(member_id, created_at DESC);
CREATE INDEX idx_ledger_type ON ledger_entries(type);
CREATE INDEX idx_ledger_expires ON ledger_entries(expires_at) WHERE expires_at IS NOT NULL;

-- Búsqueda de facturas por UUID CFDI
CREATE UNIQUE INDEX idx_invoices_uuid_cfdi ON invoices(uuid_cfdi);
CREATE INDEX idx_invoices_member_status ON invoices(member_id, status);

-- Catálogo con filtro geo
CREATE INDEX idx_skus_geo_type ON reward_skus(geo_type) WHERE status = 'active';

-- Auditoría por actor y fecha
CREATE INDEX idx_audit_actor_created ON audit_log(actor_id, created_at DESC);
```

---

## 6. Almacenamiento de Archivos

### Configuración de Cloudflare R2

```typescript
// lib/r2.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

// Subir un archivo
export async function uploadFile(key: string, body: Buffer, contentType: string) {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return key
}

// Generar URL firmada (acceso temporal de 1 hora)
export async function getSignedDownloadUrl(key: string) {
  return getSignedUrl(r2, new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }), { expiresIn: 3600 })
}
```

### Convenciones de Claves

```
invoices/{member_id}/{uuid_cfdi}.xml         → XMLs de facturas
rewards/{sku_id}/cover.webp                  → Imagen principal del premio
rewards/{sku_id}/gallery/{n}.webp            → Imágenes adicionales
promotions/{promotion_id}/banner.webp        → Banner de promoción
statements/{member_id}/{YYYY-MM}.pdf         → Estados de cuenta mensuales
```

---

## 7. Autenticación y Sesiones

### Flujo de Magic Link / OTP

```
1. Usuario ingresa email en /login
2. Backend genera código OTP de 6 dígitos (crypto.randomInt)
3. Se guarda hash del OTP en tabla otp_tokens con expiración 10min
4. Se envía email via Resend con el código
5. Usuario ingresa el código
6. Backend verifica hash, marca el token como usado
7. Se crea o actualiza el registro del miembro en members
8. Se genera JWT firmado con { sub: member_id, role: role_name, exp: 7d }
9. JWT se almacena en cookie httpOnly + Secure + SameSite=Strict
10. Redirect al dashboard correspondiente (cliente o admin)
```

### Tabla de tokens OTP

```sql
CREATE TABLE otp_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  code_hash  TEXT NOT NULL,   -- bcrypt hash del código de 6 dígitos
  used       BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_otp_email_expires ON otp_tokens(email, expires_at);
```

### Middleware de RBAC

```typescript
// middleware.ts (Next.js)
export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token) return NextResponse.redirect('/login')

  const payload = verifyJWT(token)
  const path = request.nextUrl.pathname

  // Rutas de admin solo para owner/admin/employee
  if (path.startsWith('/admin') && !['owner', 'admin', 'employee'].includes(payload.role)) {
    return NextResponse.redirect('/dashboard')
  }

  // Rutas de cliente solo para member
  if (path.startsWith('/dashboard') && payload.role !== 'member') {
    return NextResponse.redirect('/admin')
  }
}
```

---

## 8. Sistema de Colas

### Para qué se usa BullMQ / Upstash

Las operaciones que no deben bloquear el response HTTP se procesan en cola:

| Job | Descripción | Prioridad |
|---|---|---|
| `invoice.validate` | Consultar Facturapi tras subir XML | Alta |
| `invoice.process-points` | Calcular y acreditar puntos tras aprobación | Alta |
| `notification.email` | Enviar emails transaccionales | Media |
| `notification.push` | Enviar push via FCM | Media |
| `statement.generate` | Generar PDF de estado de cuenta mensual | Baja |
| `points.expire-check` | Proceso diario de puntos por vencer | Baja |

### Configuración con Upstash (Redis serverless)

```typescript
// lib/queue.ts
import { Queue, Worker } from 'bullmq'
import { Redis } from '@upstash/redis'

const connection = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export const invoiceQueue = new Queue('invoices', { connection })
export const notificationQueue = new Queue('notifications', { connection })

// Worker para procesar validaciones de factura
const invoiceWorker = new Worker('invoices', async (job) => {
  if (job.name === 'validate') {
    const { invoiceId } = job.data
    await validateInvoiceWithSAT(invoiceId)
  }
}, { connection })
```

---

## 9. CI/CD Pipeline

### GitHub Actions — `ci.yml`

Se ejecuta en cada Pull Request:

```yaml
name: CI
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
```

### GitHub Actions — `deploy.yml`

Se ejecuta al hacer merge a `main` (staging) o al crear un tag `v*.*.*` (producción):

```yaml
name: Deploy
on:
  push:
    branches: [main]        # → staging
  create:
    tags: ['v*.*.*']        # → production

jobs:
  deploy-vercel:
    # Vercel detecta automáticamente el push y despliega
    # Solo se configura el proyecto una vez en vercel.com

  deploy-railway:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railway-deploy@v1
        with:
          service: api
          environment: ${{ github.ref == 'refs/heads/main' && 'staging' || 'production' }}
```

### Flujo de trabajo del equipo

```
feature/xxx → (PR + CI) → main → auto-deploy a staging
                                        ↓
                              QA en staging
                                        ↓
                              git tag v1.2.0 → deploy a producción
```

---

## 10. Variables de Entorno

### `.env.example` (template para el equipo)

```bash
# ─── APLICACIÓN ────────────────────────────────────────────
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
JWT_SECRET=genera-un-string-random-de-64-chars-aqui

# ─── SUPABASE (Base de Datos) ──────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # Público (frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # Privado (solo backend)

# ─── CLOUDFLARE R2 (Storage) ───────────────────────────────
R2_ACCOUNT_ID=tu-account-id-de-cloudflare
R2_ACCESS_KEY_ID=tu-r2-access-key
R2_SECRET_ACCESS_KEY=tu-r2-secret-key
R2_BUCKET_NAME=dismant-staging               # o dismant-prod

# ─── RESEND (Email) ────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@clubmomentos.com.mx

# ─── FIREBASE (Push Notifications) ─────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=proyecto-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
FIREBASE_ADMIN_PROJECT_ID=proyecto-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# ─── FACTURAPI (Validación CFDI) ───────────────────────────
FACTURAPI_SECRET_KEY=sk_test_xxxx             # sandbox
# FACTURAPI_SECRET_KEY=sk_live_xxxx           # producción
DISMANT_RFC=XXXX######XXX                     # RFC de Dismant

# ─── UPSTASH REDIS (Colas) ─────────────────────────────────
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# ─── NEGOCIO ───────────────────────────────────────────────
POINTS_PER_AMOUNT=100                         # $100 MXN = 1 punto
POINTS_EXPIRY_DAYS=180                        # Puntos expiran en 180 días
WELCOME_BONUS_POINTS=100                      # Puntos de bienvenida
REVIEW_BONUS_POINTS=5                         # Puntos por dejar reseña
INVOICE_MAX_AGE_DAYS=90                       # Facturas de máximo 90 días
```

---

## 11. Monitoreo y Logs

### Herramientas (todas en tier gratuito)

| Herramienta | Para qué | Costo |
|---|---|---|
| Vercel Analytics | Métricas de rendimiento del frontend | Gratis |
| Railway Logs | Logs del backend en tiempo real | Incluido |
| Supabase Dashboard | Queries lentas, tamaño de tablas | Incluido |
| Sentry | Errores y excepciones en producción | Gratis (5k errores/mes) |

### Alertas Mínimas Necesarias

- Error rate > 1% en endpoints de validación de facturas → Alerta por email al equipo.
- Tiempo de respuesta de Facturapi > 5s → Log de advertencia.
- Stock de cualquier SKU < umbral configurado → Notificación al Admin.
- Tabla `ledger_entries` supera 100k filas → Alerta para planificar archivado.

### Configuración de Sentry

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,    // 10% de requests para performance
  beforeSend(event) {
    // No enviar PII (RFC, correo) en los reportes
    delete event.user?.email
    return event
  },
})
```

---

## 12. Costos Estimados

### MVP (primeros 6 meses, < 500 usuarios)

| Servicio | Costo mensual |
|---|---|
| Dominio .com.mx | ~$17 MXN/mes (pago anual) |
| Cloudflare (DNS + CDN) | $0 |
| Vercel Hobby (Frontend) | $0 |
| Railway Starter (Backend) | ~$100 MXN/mes |
| Supabase Free (DB) | $0 |
| Cloudflare R2 (Storage) | $0 |
| Resend Free (Email) | $0 |
| Firebase FCM (Push) | $0 |
| Upstash Free (Redis) | $0 |
| Facturapi (~50 facturas/mes) | ~$50 MXN/mes |
| Sentry Free | $0 |
| **TOTAL MVP** | **~$167 MXN/mes** |

### Escala (500–2,000 usuarios activos)

| Servicio | Costo mensual |
|---|---|
| Vercel Pro | ~$400 MXN/mes |
| Railway Pro | ~$200 MXN/mes |
| Supabase Pro | ~$500 MXN/mes |
| Resend (50k emails) | ~$400 MXN/mes |
| Facturapi (~500 facturas/mes) | ~$500 MXN/mes |
| **TOTAL ESCALA** | **~$2,000 MXN/mes** |

---

## 13. Checklist de Setup Inicial

### Antes de escribir la primera línea de código

- [ ] Crear organización en GitHub y repositorio privado.
- [ ] Configurar Turborepo con `apps/web` y `packages/database`.
- [ ] Crear proyecto en Supabase (staging) y copiar las keys.
- [ ] Ejecutar migraciones iniciales de Prisma en Supabase staging.
- [ ] Crear proyecto en Vercel y conectar el repositorio de GitHub.
- [ ] Crear proyecto en Railway y conectar el repositorio de GitHub.
- [ ] Configurar dominio en Namecheap y apuntar nameservers a Cloudflare.
- [ ] Crear bucket en Cloudflare R2 (`dismant-staging`).
- [ ] Crear cuenta en Resend y verificar el dominio del remitente.
- [ ] Crear proyecto en Firebase y activar Cloud Messaging.
- [ ] Crear cuenta en Facturapi y obtener key de sandbox.
- [ ] Crear cuenta en Upstash y crear instancia de Redis.
- [ ] Crear cuenta en Sentry y obtener DSN.
- [ ] Poblar `.env` local con todas las keys del checklist anterior.
- [ ] Configurar los secrets en GitHub Actions (`Settings → Secrets`).
- [ ] Verificar que el pipeline de CI pasa con un commit de prueba.
