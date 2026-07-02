# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ¿Qué es este proyecto?

Plataforma web de lealtad B2B multi-marca ("Club Momentos"), usada actualmente por **Dismant** y **Lauti** como affiliates. Los miembros acumulan puntos a partir de facturas (CFDI) validadas ante el SAT y los canjean por premios en un catálogo filtrado por zona geográfica.

**Multi-affiliate / branding dinámico:** No es mono-marca. Cada `Member` e `Invitation` tiene un campo `affiliate` (`dismant` | `lauti`, default `dismant`). `apps/web/lib/brand.ts` mapea el affiliate a nombre/inicial de marca vía `getBrand(affiliate)`; se usa en emails (`lib/resend.ts`, remitente dinámico `RESEND_FROM_EMAIL_DISMANT`/`RESEND_FROM_EMAIL_LAUTI`), PDFs de estado de cuenta, páginas de registro/welcome/invitaciones. Al agregar features nuevas que muestren nombre de marca o envíen correos, usar `getBrand()` en vez de hardcodear "Dismant". No asumir un solo tenant/RFC — aunque `DISMANT_RFC` sigue siendo la validación CFDI vigente (ver nota abajo).

**Documentación completa en `/docs/`:**
- `docs/Plan_Tecnico.md` — arquitectura, módulos, modelo de datos, flujo CFDI, RBAC, roadmap
- `docs/cloud.md` — infraestructura cloud, servicios, CI/CD, variables de entorno
- `docs/stories.md` — backlog completo de historias de usuario (41 historias, 10 épicas)

---

## Stack

```
Frontend:  Next.js 15 (App Router) + TypeScript + TailwindCSS + shadcn/ui
Auth:      Magic Link / OTP por email (jose + Resend)
DB:        PostgreSQL en Supabase (Prisma ORM)
Storage:   Cloudflare R2
Email:     Resend
Push:      Firebase Cloud Messaging
CFDI:      Facturapi
```

## Estructura del proyecto

```
apps/web/
├── app/
│   ├── (auth)/          → login, register, verify (rutas públicas)
│   ├── (client)/        → portal del cliente con sidebar
│   ├── (admin)/         → panel de administración con sidebar oscuro
│   └── api/             → API Routes de Next.js en app/api/{recurso}/route.ts
├── lib/
│   ├── auth.ts          → JWT, OTP, sesiones (httpOnly cookie)
│   ├── supabase.ts      → clientes de Supabase (public/admin/server)
│   ├── r2.ts            → upload/download a Cloudflare R2
│   ├── resend.ts        → envío de emails con plantillas
│   └── utils.ts         → helpers (RFC, CFDI, puntos, fechas)
├── middleware.ts         → RBAC + protección de rutas automática
└── components/
    ├── ui/              → componentes base (shadcn/ui)
    ├── client/          → componentes del portal cliente
    └── admin/           → componentes del panel admin

packages/
├── database/
│   └── prisma/schema.prisma  → schema completo de PostgreSQL
└── types/
    └── src/index.ts          → tipos TypeScript compartidos (@dismant/types)
```

## Comandos principales

```bash
# Desde la raíz del monorepo
npm run dev          # Inicia todos los apps en paralelo con Turborepo
npm run build        # Build de producción
npm run lint         # Lint en todo el monorepo
npm run type-check   # Verificación de TypeScript
npm run format       # Formatea con Prettier (ts, tsx, md, json)

# Correr solo la app web
cd apps/web && npm run dev

# Base de datos (desde packages/database/)
cd packages/database
npm run db:generate  # Genera el cliente de Prisma
npm run db:migrate   # Crea y aplica migraciones
npm run db:studio    # Abre Prisma Studio en el navegador
```

## Variables de entorno

El archivo `.env.example` en la raíz contiene todas las variables con comentarios.

**Setup inicial:**
1. Copia `.env.example` → `apps/web/.env.local` para las variables de Next.js
2. Copia también las variables de Prisma (`DATABASE_URL`, `DIRECT_URL`) a `packages/database/.env`
   - `DATABASE_URL` — conexión pooled de Supabase (puerto 6543)
   - `DIRECT_URL` — conexión directa de Supabase (puerto 5432, requerida por Prisma Migrate)

Variables críticas para arrancar:
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — base de datos
- `SUPABASE_SERVICE_ROLE_KEY` — operaciones de servidor (nunca exponer en cliente)
- `JWT_SECRET` — firma de sesiones (genera con: `openssl rand -base64 64`)
- `DISMANT_RFC` — RFC oficial de Dismant, usado para validar facturas CFDI

## Arquitectura clave

### Autenticación y sesiones

Las sesiones son JWT HS256 firmados con `JWT_SECRET`, guardados en una httpOnly cookie llamada `session`. El middleware (`apps/web/middleware.ts`) verifica el JWT en cada request e inyecta `x-user-id` y `x-user-role` como headers para que los Server Components los lean sin acceder a la cookie directamente.

### Doble uso de Supabase vs. Prisma

El proyecto usa **ambos** simultáneamente:
- **Supabase JS client** (`lib/supabase.ts`) — para operaciones directas en tablas simples (OTP tokens, RLS, tiempo real). Hay tres clientes: público (browser), admin (service role, solo servidor) y server (SSR con cookies).
- **Prisma ORM** (`packages/database`) — para queries complejas con relaciones, migraciones y type safety en el resto de las operaciones de negocio.

### Ledger de puntos (invariante crítico)

El ledger en `ledger_entries` y la tabla `audit_log` son **append-only** — solo INSERT, nunca UPDATE ni DELETE. Supabase tiene políticas de Row Level Security que lo refuerzan a nivel de base de datos. Cada punto tiene trazabilidad completa hasta la factura que lo originó. El `balance_after` se calcula al momento del INSERT y nunca se recalcula.

### Flujo de facturas CFDI

Subida de XML → extracción de datos → validaciones internas (RFC emisor == Dismant RFC, RFC receptor == RFC del miembro, UUID no duplicado, antigüedad ≤ 90 días) → validación SAT via Facturapi → almacenamiento en R2 → registro en `invoices` con `status = 'pending'` → aprobación (auto o manual) → INSERT en `ledger_entries` → notificación + registro en `audit_log`.

### Geolocalización del catálogo

Los premios y promociones tienen `geo_type = 'national' | 'local'` y arrays `geo_states`/`geo_cities`. El API filtra por la ubicación almacenada en `members.location_state` y `members.location_city` al cargar el catálogo.

## Roles del sistema

| Rol | Acceso |
|---|---|
| `owner` | Todo, incluyendo reportes financieros y gestión de roles |
| `admin` | Gestión operativa completa |
| `employee` | Validar facturas, consultar clientes, asignar premios |
| `member` | Portal del cliente (catálogo, canjes, facturas, estado de cuenta) |

El middleware redirige automáticamente: los no-miembros intentando rutas `/dashboard`, `/catalog`, etc. van a `/admin/dashboard`; los miembros intentando `/admin/*` van a `/dashboard`.

## Convenciones de código

- TypeScript estricto (`strict: true`) en todos los archivos
- Nombres de archivos: `kebab-case` para carpetas, `PascalCase` para componentes
- Server Components por defecto; `'use client'` solo cuando se necesite interactividad
- Tipos compartidos importados desde `@dismant/types`; cliente de Prisma desde `@dismant/database`

## Estado actual del desarrollo

**Completado (TT-001):**
- Monorepo con Turborepo + Next.js 15 + TailwindCSS + shadcn/ui
- Middleware de RBAC, layouts de cliente y admin
- Librerías: auth, supabase, r2, resend, utils
- Schema completo de Prisma y tipos TypeScript compartidos

**Siguiente paso (TT-002 + TT-003):**
- Configurar Supabase (crear proyecto, llenar .env.local)
- Correr primera migración de Prisma
- Implementar US-001: Registro de nuevo miembro
- Implementar US-002: Verificación por OTP
- Implementar US-005: Login con Magic Link

> **Nota:** `otp_tokens` (tabla usada para verificar el correo de invitados) **no tiene FK hacia `members`** — a propósito. El OTP se genera y verifica antes de que exista el registro de `Member` (flujo de registro nuevo vía invitación). Una FK `otp_tokens.email -> members.email` causó que todo insert de OTP para no-miembros fallara en silencio durante semanas (corregido 2026-07-02, migración `20260702000000_drop_otp_tokens_member_fk`). Si se vuelve a tocar este modelo, no reintroducir esa relación.
