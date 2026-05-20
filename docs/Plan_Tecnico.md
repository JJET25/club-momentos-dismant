# Club Momentos Dismant — Plan Técnico de Ejecución
**Versión:** 2.0  
**Fecha:** Mayo 2026  
**Estado:** Listo para desarrollo

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Supuestos y Decisiones de Diseño](#2-supuestos-y-decisiones-de-diseño)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Stack Tecnológico](#4-stack-tecnológico)
5. [Módulos del Sistema](#5-módulos-del-sistema)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Flujo de Facturas CFDI](#7-flujo-de-facturas-cfdi)
8. [Sistema de Notificaciones](#8-sistema-de-notificaciones)
9. [Sistema de Geolocalización](#9-sistema-de-geolocalización)
10. [Control de Acceso (RBAC)](#10-control-de-acceso-rbac)
11. [Seguridad](#11-seguridad)
12. [Roadmap de Implementación](#12-roadmap-de-implementación)
13. [Riesgos y Mitigaciones](#13-riesgos-y-mitigaciones)

---

## 1. Resumen Ejecutivo

### Visión del Producto

**Club Momentos Dismant** es una plataforma web de lealtad B2B diseñada para retener y recompensar a los clientes empresariales de Dismant. Los miembros acumulan puntos a partir de facturas (CFDI) validadas ante el SAT y los canjean por premios físicos y digitales disponibles en un catálogo filtrado por zona geográfica.

### Propuesta de Valor

| Para el cliente | Para Dismant |
|---|---|
| Recompensa tangible por compras ya realizadas | Incremento en frecuencia de compra y ticket promedio |
| Transparencia total del origen de cada punto | Datos de consumo por cliente y región |
| Catálogo de premios relevante a su zona | Canal directo de comunicación con el cliente |
| Estado de cuenta detallado con trazabilidad fiscal | Reportes de ROI del programa de lealtad |

### OKRs del MVP (primeros 6 meses)

- **O1:** Activar al menos el 60% de los clientes activos de Dismant en la plataforma.
  - KR1: 200 miembros registrados en los primeros 90 días.
  - KR2: 80% de los miembros activos han subido al menos una factura.
- **O2:** Establecer un ciclo de canje operativo.
  - KR1: Tasa de redención superior al 30% de puntos emitidos.
  - KR2: Calificación promedio de premios ≥ 4.0 estrellas.
- **O3:** Cero incidentes de seguridad o fraude en el ledger.
  - KR1: 100% de facturas validadas contra el SAT antes de acreditar puntos.
  - KR2: Auditoría completa de cada operación disponible para el Dueño.

---

## 2. Supuestos y Decisiones de Diseño

### Supuestos Validados

- Los clientes de Dismant son empresas con RFC registrado y emiten/reciben CFDI.
- El catálogo de premios varía por región (no todos los premios están disponibles en todo el país).
- El programa opera únicamente en México.
- La plataforma es web-first; los clientes acceden principalmente desde navegadores de escritorio y móvil.

### Decisiones de Diseño Clave

| Decisión | Elección | Justificación |
|---|---|---|
| Autenticación | Magic Link / OTP por email | Gratuito, sin dependencia de WhatsApp API |
| Notificaciones | Email + Web Push + In-app | Costo cero, sin fricción para el usuario |
| Validación CFDI | Proveedor tercero (Facturapi) | Confiable en producción vs. SAT directo |
| Puntos | Ledger append-only | Auditoría perfecta, no editable |
| Frontend | Next.js App Router | SSR + SSG + API Routes en un solo proyecto |
| Base de datos | PostgreSQL (Supabase) | Gratuito hasta 50k usuarios, auth incluida |
| Storage | Cloudflare R2 | 10 GB gratis, sin egress fees |

---

## 3. Arquitectura del Sistema

### Diagrama de Flujo de Datos

```
[Cliente / Admin]
       │
       ▼
[Next.js Frontend] ──── [Vercel CDN]
       │
       ├──► [Next.js API Routes / NestJS API]
       │              │
       │    ┌─────────┼──────────────┐
       │    ▼         ▼              ▼
       │ [PostgreSQL] [Cloudflare R2] [Firebase FCM]
       │  (Supabase)  (Archivos)     (Push Notif.)
       │
       ├──► [Facturapi / SAT] (Validación CFDI)
       │
       └──► [Resend] (Email: OTP, notificaciones)
```

### Componentes Principales

**Frontend (Next.js):** Renderiza el portal del cliente y el panel de administración. Usa Server Components para SEO y Client Components para interactividad. Se despliega en Vercel.

**API (NestJS o Next.js API Routes):** Capa de negocio. Maneja autenticación, validación de facturas, operaciones de puntos, canjes y reportes. Stateless — escala horizontalmente.

**Base de Datos (PostgreSQL en Supabase):** Fuente de verdad. El ledger de puntos es append-only (INSERT únicamente, nunca UPDATE/DELETE en registros de movimientos).

**Storage (Cloudflare R2):** Almacena XMLs de facturas, imágenes de premios, banners de promociones y PDFs de estados de cuenta.

**Servicios Externos:**
- **Facturapi:** Validación de CFDI contra el SAT.
- **Resend:** Envío de emails transaccionales (OTP, estados de cuenta, alertas).
- **Firebase FCM:** Notificaciones push en navegador.

---

## 4. Stack Tecnológico

### Frontend

```
Framework:     Next.js 14+ (App Router)
Lenguaje:      TypeScript
Estilos:       TailwindCSS
Componentes:   shadcn/ui
Estado:        Zustand (cliente) + React Query (server state)
Forms:         React Hook Form + Zod
Auth cliente:  next-auth / Supabase Auth
```

### Backend

```
Framework:     NestJS (o Next.js API Routes para MVP)
Lenguaje:      TypeScript
ORM:           Prisma
Validación:    class-validator + class-transformer
Queue:         BullMQ (Redis) — para procesamiento de facturas
```

### Base de Datos

```
Motor:         PostgreSQL 15+
Host:          Supabase (gratuito hasta 50k usuarios)
Migraciones:   Prisma Migrate
Backups:       Automáticos en Supabase (diario)
```

### Infraestructura

```
Frontend:      Vercel (gratis en hobby, $20/mes en pro)
Backend:       Railway o Render ($5-20/mes en producción)
DB:            Supabase (gratis → $25/mes en Pro)
Storage:       Cloudflare R2 (gratis hasta 10 GB)
Push:          Firebase Cloud Messaging (gratis)
Email:         Resend (3,000/mes gratis)
CFDI:          Facturapi (~$0.50-1 MXN por consulta)
```

---

## 5. Módulos del Sistema

### Módulo 1 — Autenticación y Onboarding

**Descripción:** Control de acceso sin contraseña. Registro auto-gestionado por el cliente.

**Flujo de Registro (4 pasos):**

1. **Datos Personales:** Nombre completo, correo electrónico, empresa, RFC, código de invitación (opcional).
2. **Verificación OTP:** El sistema envía un código de 6 dígitos al correo. El código expira en 10 minutos. El usuario puede solicitar reenvío después de 60 segundos.
3. **Configuración de Perfil:** Estado y ciudad de residencia (determina catálogo visible), aceptación de T&C y Aviso de Privacidad.
4. **Bienvenida:** Confirmación visual de registro. Se acreditan automáticamente los puntos de bono de bienvenida (configurable, por defecto 100 pts).

**Flujo de Login:**
El usuario ingresa su correo → recibe Magic Link por email → hace clic → sesión activa por 7 días. No hay contraseñas que olvidar.

**Reglas de negocio:**
- Un RFC solo puede estar registrado en una cuenta.
- El código de invitación es opcional en MVP; puede volverse obligatorio en producción.
- Las sesiones expiran después de 30 días de inactividad.

---

### Módulo 2 — Dashboard del Cliente

**Descripción:** Pantalla de inicio del portal del cliente con visión general de su cuenta.

**Elementos:**

- **Card Hero de Puntos:** Saldo actual en grande, puntos por vencer (próximos 30 días) con alerta visual si hay puntos próximos a expirar.
- **KPIs rápidos:** Puntos ganados (mes actual), puntos canjeados (histórico), número de facturas validadas.
- **Actividad Reciente:** Últimos 5 movimientos del ledger con ícono por tipo (factura, canje, bono).
- **Promociones de Zona:** Hasta 3 promociones activas de aliados disponibles en la zona del cliente.
- **Banner de Alerta:** Aparece si el cliente tiene puntos que vencen en menos de 30 días.

---

### Módulo 3 — Catálogo de Premios con Geolocalización

**Descripción:** Listado de premios canjeables filtrado automáticamente por la ubicación del cliente.

**Tipos de cobertura de un premio:**
- **Nacional:** Visible y canjeable para todos los clientes.
- **Local:** Solo visible para clientes en los estados/ciudades configurados para ese SKU.

**Elementos de la vista catálogo:**
- Filtros rápidos: Mi zona / Nacionales / Todos.
- Búsqueda por nombre o categoría.
- Tarjeta de premio: imagen, nombre, descripción breve, costo en puntos, stock disponible, etiqueta de zona, calificación promedio (estrellas) con número de reseñas.
- Los premios fuera de zona se muestran con un mensaje claro: "No disponible en tu región."

**Flujo de Canje:**
1. Cliente selecciona premio.
2. Modal de detalle: descripción completa, vigencia, instrucciones del aliado, stock, costo en puntos.
3. Modal de confirmación: "¿Confirmar canje? Tendrás X puntos restantes después de esta operación."
4. Sistema verifica saldo suficiente y stock disponible.
5. Se genera el voucher (código QR o código alfanumérico) y se descuentan los puntos del ledger.
6. Pantalla de voucher con instrucciones de uso.
7. Notificación por email y push: "¡Tu canje fue exitoso! Aquí está tu voucher."

---

### Módulo 4 — Sistema de Ratings y Reseñas

**Descripción:** Los clientes califican los premios canjeados. El sistema incentiva las reseñas con puntos extra.

**Flujo:**
1. Después de un canje, el sistema espera 24 horas y luego envía una notificación: "¿Cómo fue tu experiencia con [Premio]?"
2. El cliente accede a "Mis Canjes" y ve el botón "Calificar" activo.
3. Formulario de calificación: 1-5 estrellas (obligatorio) + comentario de texto (opcional, mínimo 20 caracteres para aplicar al incentivo).
4. Si el cliente deja comentario escrito: se acreditan automáticamente **+5 puntos de bonificación** con registro en el ledger indicando origen "Bono por reseña".
5. La reseña aparece visible en la página del premio para otros usuarios (nombre del cliente puede ser anónimo: "Cliente de Monterrey").

**Reglas:**
- Solo se puede calificar un premio que haya sido canjeado.
- Solo se puede enviar una calificación por canje.
- El bono de puntos por reseña solo aplica si el comentario tiene al menos 20 caracteres.

---

### Módulo 5 — Trazabilidad de Puntos (Estado de Cuenta)

**Descripción:** Historial completo de todos los movimientos del ledger con trazabilidad fiscal.

**Vista del ledger:** Cada fila es un movimiento con los siguientes datos:

| Campo | Descripción |
|---|---|
| Fecha de movimiento | Cuándo se registró en el sistema |
| Tipo | Factura / Canje / Bono bienvenida / Bono reseña / Ajuste |
| Descripción | "Factura XXXX-XXXX-XXXX-XXXX" o "Canje: Premio Y" |
| Factura de origen | UUID del CFDI (solo en movimientos de tipo Factura) |
| Fecha de pago | Fecha en que Dismant registró el pago de la factura |
| Fecha de generación | Fecha en que se acreditaron los puntos |
| Estatus de validación | Validada / Pendiente / Rechazada |
| Monto base | Monto de la factura en MXN (solo tipo Factura) |
| Operador | Quién validó el movimiento |
| Puntos | +N o -N |
| Saldo acumulado | Saldo después de este movimiento |

**Filtros disponibles:** Por tipo de movimiento, por rango de fechas, por estatus.

**Exportación:** Botón de descarga del estado de cuenta en PDF (mensual o rango personalizado).

---

### Módulo 6 — Promociones de Aliados

**Descripción:** Empresas socias publican anuncios y promociones visibles para los clientes dentro del portal.

**Flujo de publicación (vista Aliado/Admin):**
1. El aliado o el administrador crea una promoción: título, descripción, imagen, vigencia, zonas de aplicación, URL de destino (opcional).
2. La promoción entra en estatus "En revisión".
3. El Administrador o Dueño la aprueba o rechaza desde el panel de administración.
4. Al aprobarse, la promoción entra en estatus "Activa" y es visible para los clientes según su cobertura geográfica.
5. Al vencer la fecha de fin, el sistema la pasa automáticamente a "Vencida".

**Vista cliente:**
- Banner destacado: la promoción más reciente o marcada como "featured" ocupa un banner en el dashboard y en la sección de promociones.
- Grid de tarjetas: imagen, nombre del aliado (con badge "Verificado"), zona de aplicación, vigencia, botón "Ver más".

---

### Módulo 7 — Panel de Administración

**Descripción:** Interfaz para Dueño, Administrador y Empleado para gestionar la operación del programa.

**Secciones:**

**7.1 Dashboard Operativo**
- Total de miembros activos / nuevos este mes.
- Total de puntos emitidos (histórico) y en circulación (activos).
- Total de puntos canjeados (histórico).
- Conteo de "Premios Ejercidos" (canjes con retroalimentación enviada).
- Gráfica de puntos emitidos vs. canjeados por mes.
- Top 5 premios más canjeados.

**7.2 Gestión de Miembros**
- Tabla paginada de todos los miembros: nombre, empresa, RFC, ciudad, puntos activos, último acceso.
- Vista de detalle de un miembro: su ledger completo, sus canjes, sus datos, botón de edición manual de puntos (requiere rol Admin o Dueño y genera registro en auditoría).
- Carga masiva de puntos por CSV: sube archivo → previsualiza → confirma → el sistema genera registros en el ledger por cada fila.

**7.3 Gestión de Inventario**
- CRUD de premios (SKUs): nombre, descripción, imagen, costo en puntos, stock, cobertura geográfica.
- Carga masiva de códigos digitales por SKU (archivo CSV de códigos; el sistema los asigna en orden FIFO al canjear).
- Alerta automática cuando el stock de un SKU baja del umbral configurado.

**7.4 Gestión de Facturas**
- Cola de facturas pendientes de aprobación manual.
- Vista de detalle de cada factura: todos los datos del CFDI + resultado de la validación del SAT.
- Botón de aprobar / rechazar con campo de comentario.
- Historial de facturas procesadas con filtros.

**7.5 Gestión de Promociones**
- Cola de promociones en revisión.
- Vista de detalle: preview del banner, datos del aliado, zonas de cobertura.
- Botón de aprobar / rechazar.
- Historial de promociones activas, programadas y vencidas.

**7.6 Reportes**
- Flujo de clientes: entrantes vs. activos por mes.
- Distribución del ledger: puntos emitidos, en circulación, canjeados, expirados.
- Top premios: más canjeados + mejor calificados (con rating promedio).
- Exportación a Excel y PDF.

**7.7 Auditoría**
- Registro inmutable de todas las operaciones sensibles: creación de puntos, canjes, aprobación de facturas, ajustes manuales, cambios de rol.
- Filtros por: miembro, operador, tipo de evento, rango de fechas.
- No editable bajo ningún rol, incluyendo el Dueño.

**7.8 Configuración del Sistema**
- Regla de puntos: X puntos por cada $Y MXN de factura.
- Días de expiración de puntos (default: 180 días).
- Puntos de bienvenida para nuevos miembros.
- Bono de puntos por reseña.
- Umbral de alerta de stock por SKU.
- Configuración de roles y permisos.

---

## 6. Modelo de Datos

### Tablas Principales

```sql
-- Miembros del club
CREATE TABLE members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  rfc           TEXT UNIQUE NOT NULL,
  location_state TEXT NOT NULL,         -- Estado (ej. "Nuevo León")
  location_city  TEXT NOT NULL,         -- Ciudad (ej. "Monterrey")
  invitation_code TEXT,
  status        TEXT DEFAULT 'active',  -- active | suspended
  role_id       UUID REFERENCES roles(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Ledger de puntos (append-only — NUNCA se actualiza ni elimina)
CREATE TABLE ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id) NOT NULL,
  type            TEXT NOT NULL,  -- invoice | redemption | welcome_bonus | review_bonus | adjustment
  points          INTEGER NOT NULL,  -- positivo o negativo
  balance_after   INTEGER NOT NULL,  -- saldo acumulado después de este movimiento
  description     TEXT,
  invoice_id      UUID REFERENCES invoices(id),
  redemption_id   UUID REFERENCES redemptions(id),
  operator_id     UUID REFERENCES members(id),  -- quién ejecutó la operación
  expires_at      TIMESTAMPTZ,  -- fecha de expiración de estos puntos
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Facturas CFDI
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id) NOT NULL,
  uuid_cfdi       TEXT UNIQUE NOT NULL,  -- UUID del SAT (folio fiscal)
  rfc_emisor      TEXT NOT NULL,
  rfc_receptor    TEXT NOT NULL,
  total_mxn       NUMERIC(12,2) NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL,  -- fecha de emisión del CFDI
  paid_at         TIMESTAMPTZ,           -- fecha de pago registrada
  points_generated INTEGER,
  status          TEXT DEFAULT 'pending', -- pending | approved | rejected | cancelled
  sat_status      TEXT,                  -- vigente | cancelada | no_encontrada
  rejection_reason TEXT,
  approved_by     UUID REFERENCES members(id),
  approved_at     TIMESTAMPTZ,
  xml_storage_key TEXT,                  -- path en Cloudflare R2
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- SKUs de premios
CREATE TABLE reward_skus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  points_cost     INTEGER NOT NULL,
  stock           INTEGER DEFAULT 0,
  stock_alert_threshold INTEGER DEFAULT 10,
  geo_type        TEXT DEFAULT 'national', -- national | local
  geo_states      TEXT[],  -- array de estados si geo_type = 'local'
  geo_cities      TEXT[],  -- array de ciudades si geo_type = 'local'
  is_digital      BOOLEAN DEFAULT false,
  status          TEXT DEFAULT 'active', -- active | paused | discontinued
  category        TEXT,
  partner_id      UUID REFERENCES partners(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Códigos digitales por SKU (asignación FIFO)
CREATE TABLE digital_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id      UUID REFERENCES reward_skus(id) NOT NULL,
  code        TEXT NOT NULL,
  assigned_to UUID REFERENCES redemptions(id),
  assigned_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Canjes
CREATE TABLE redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id) NOT NULL,
  sku_id          UUID REFERENCES reward_skus(id) NOT NULL,
  points_spent    INTEGER NOT NULL,
  voucher_code    TEXT,
  status          TEXT DEFAULT 'active', -- active | used | expired
  review_id       UUID REFERENCES reviews(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Reseñas de premios canjeados
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id) NOT NULL,
  redemption_id   UUID REFERENCES redemptions(id) UNIQUE NOT NULL,
  sku_id          UUID REFERENCES reward_skus(id) NOT NULL,
  rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  bonus_awarded   BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Aliados / Socios
CREATE TABLE partners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  logo_url    TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Promociones de aliados
CREATE TABLE partner_promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID REFERENCES partners(id) NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  destination_url TEXT,
  geo_type        TEXT DEFAULT 'national', -- national | local
  geo_states      TEXT[],
  geo_cities      TEXT[],
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_until     TIMESTAMPTZ NOT NULL,
  status          TEXT DEFAULT 'draft', -- draft | in_review | approved | active | expired | rejected
  featured        BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES members(id),
  approved_by     UUID REFERENCES members(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Roles del sistema
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,  -- owner | admin | employee | member
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Permisos por rol
CREATE TABLE role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     UUID REFERENCES roles(id),
  permission  TEXT NOT NULL  -- load_points | approve_invoice | manage_catalog | view_reports | etc.
);

-- Auditoría (append-only)
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES members(id),
  action      TEXT NOT NULL,  -- ej. "invoice.approved", "points.manual_adjustment"
  target_type TEXT,           -- "invoice" | "member" | "redemption" | etc.
  target_id   UUID,
  metadata    JSONB,           -- datos adicionales del evento
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. Flujo de Facturas CFDI

### Descripción General

Cada punto en el sistema nace de una factura validada. Este es el flujo completo de una factura desde que el cliente la sube hasta que los puntos quedan en su cuenta.

### Paso a Paso

```
1. CAPTURA
   El cliente sube el archivo XML de su CFDI en el portal.
   El sistema extrae automáticamente: UUID, RFC emisor,
   RFC receptor, fecha de emisión y monto total.

2. VALIDACIONES INTERNAS (instantáneas)
   a. ¿El RFC emisor coincide con el RFC de Dismant? → Si no: rechazar.
   b. ¿El RFC receptor coincide con el RFC del miembro? → Si no: rechazar.
   c. ¿El UUID ya existe en la tabla invoices? → Si sí: rechazar (duplicado).
   d. ¿La fecha de emisión está dentro del período permitido?
      (Configurable, default: no mayor a 90 días) → Si no: rechazar.

3. VALIDACIÓN EXTERNA (SAT via Facturapi)
   El sistema envía a Facturapi: UUID + RFC emisor + RFC receptor + Total.
   Facturapi consulta el webservice del SAT y responde:
   - "Vigente"      → Continuar al paso 4.
   - "Cancelada"    → Rechazar con mensaje: "La factura fue cancelada en el SAT."
   - "No encontrada"→ Rechazar con mensaje: "No se encontró esta factura en el SAT."

4. ALMACENAMIENTO
   El XML se guarda en Cloudflare R2 con la clave: invoices/{member_id}/{uuid_cfdi}.xml
   Se crea el registro en la tabla invoices con status = 'pending'.

5. APROBACIÓN
   Opción A (Auto-aprobación): Si todas las validaciones pasan y el RFC coincide
   perfectamente, el sistema aprueba automáticamente.
   Opción B (Manual): El administrador revisa la factura en la cola y aprueba o rechaza.

6. ACREDITACIÓN DE PUNTOS
   Al aprobarse, el sistema calcula:
     puntos = floor(total_mxn / regla_configurada)
     Ejemplo: $3,500 MXN ÷ $100 = 35 puntos.

   Se crea un registro en ledger_entries:
   {
     member_id, type: "invoice", points: +35,
     balance_after: saldo_anterior + 35,
     invoice_id, expires_at: now() + 180 días,
     operator_id, created_at
   }

7. NOTIFICACIÓN
   Email + Push al cliente: "Tu factura [UUID] fue validada.
   Se acreditaron 35 puntos. Saldo actual: X puntos."

8. AUDITORÍA
   Se registra en audit_log: actor, acción "invoice.approved",
   factura, operador, timestamp.
```

### Estados de una Factura

```
pending → approved → (puntos acreditados)
        → rejected → (sin movimiento en ledger)

Si el SAT la cancela después de aprobada:
approved → cancelled → (se crea entrada negativa en ledger)
```

---

## 8. Sistema de Notificaciones

### Canales y Casos de Uso

| Evento | Email | Push (FCM) | In-app |
|---|---|---|---|
| OTP de acceso | ✅ | ❌ | ❌ |
| Factura aprobada | ✅ | ✅ | ✅ |
| Factura rechazada | ✅ | ✅ | ✅ |
| Canje exitoso | ✅ | ✅ | ✅ |
| Puntos por vencer (30 días antes) | ✅ | ✅ | ✅ |
| Solicitud de reseña (24h post-canje) | ✅ | ✅ | ✅ |
| Nueva promoción en tu zona | ❌ | ✅ | ✅ |
| Bono de reseña acreditado | ❌ | ✅ | ✅ |
| Estado de cuenta mensual | ✅ | ❌ | ❌ |

### Plantillas de Email (Resend)

- `otp-login`: Código de 6 dígitos para acceso.
- `invoice-approved`: Confirmación de factura con detalle de puntos acreditados.
- `invoice-rejected`: Rechazo con razón específica.
- `redemption-success`: Voucher y código QR.
- `points-expiring`: Alerta de puntos próximos a vencer.
- `review-request`: Invitación a calificar un premio.
- `monthly-statement`: Estado de cuenta mensual en PDF adjunto.

### Web Push (Firebase FCM)

El cliente activa las notificaciones push al hacer login por primera vez (prompt del navegador). El token FCM se almacena en la tabla `members` y se actualiza en cada sesión. Los pushes se envían desde el backend mediante el SDK de Firebase Admin.

---

## 9. Sistema de Geolocalización

### Configuración de Ubicación del Cliente

Al registrarse, el cliente selecciona su estado de México y luego su ciudad. Esta información se almacena en `members.location_state` y `members.location_city`. El cliente puede actualizar su ubicación desde su perfil.

### Filtrado del Catálogo

Al cargar el catálogo, el API aplica el siguiente filtro:

```sql
SELECT * FROM reward_skus
WHERE status = 'active'
AND (
  geo_type = 'national'
  OR (
    geo_type = 'local'
    AND location_state_del_cliente = ANY(geo_states)
  )
)
ORDER BY points_cost ASC;
```

Los premios que no aplican a la zona del cliente se pueden mostrar como "No disponible en tu región" o simplemente ocultarse. Esta configuración es ajustable desde el panel de administración.

### Configuración de Cobertura de un Premio

Al crear o editar un SKU, el administrador elige:
- **Nacional:** El premio aparece para todos los clientes.
- **Local:** Selecciona los estados (y opcionalmente ciudades) donde aplica.

El mismo sistema aplica para las promociones de aliados.

---

## 10. Control de Acceso (RBAC)

### Roles Definidos

| Rol | Descripción |
|---|---|
| **Dueño** | Acceso total. Ve reportes financieros. Puede gestionar roles. |
| **Administrador** | Gestión operativa completa. No ve reportes financieros del negocio. |
| **Empleado** | Operaciones básicas: validar facturas, asignar premios y consultar clientes. |
| **Miembro** | Cliente del club. Solo ve su propio portal. |

### Matriz de Permisos

| Funcionalidad | Dueño | Admin | Empleado | Miembro |
|---|---|---|---|---|
| Ver dashboard operativo | ✅ | ✅ | ✅ | ❌ |
| Ver reportes financieros | ✅ | ❌ | ❌ | ❌ |
| Gestionar miembros | ✅ | ✅ | Solo lectura | ❌ |
| Cargar puntos (individual) | ✅ | ✅ | Con aprobación | ❌ |
| Cargar puntos (CSV masivo) | ✅ | ✅ | ❌ | ❌ |
| Aprobar facturas | ✅ | ✅ | ✅ | ❌ |
| Rechazar facturas | ✅ | ✅ | ❌ | ❌ |
| Gestionar catálogo (CRUD) | ✅ | ✅ | ❌ | ❌ |
| Aprobar promociones | ✅ | ✅ | ❌ | ❌ |
| Ver auditoría completa | ✅ | ✅ | ❌ | ❌ |
| Ajuste manual de puntos | ✅ | ✅ | ❌ | ❌ |
| Gestionar roles | ✅ | ❌ | ❌ | ❌ |
| Ver su propio ledger | ✅ | ✅ | ✅ | ✅ |
| Canjear premios | ❌ | ❌ | ❌ | ✅ |
| Subir facturas | ❌ | ❌ | ❌ | ✅ |
| Ver catálogo | ❌ | ❌ | ❌ | ✅ |

---

## 11. Seguridad

### Autenticación

- Sesiones con JWT firmado (HS256) almacenado en httpOnly cookie.
- Expiración de sesión: 7 días con renovación automática en cada request.
- OTP de un solo uso con expiración de 10 minutos.
- Rate limiting en endpoints de auth: máximo 5 intentos por IP por 15 minutos.

### Protección del Ledger

- Las tablas `ledger_entries` y `audit_log` tienen políticas de Row Level Security en Supabase que permiten únicamente INSERT. Ningún rol puede ejecutar UPDATE o DELETE sobre ellas.
- Toda modificación a puntos genera obligatoriamente un registro en `audit_log`.

### Anti-Fraude en Facturas

- Un UUID de CFDI solo puede existir una vez en la tabla `invoices` (UNIQUE constraint).
- El RFC receptor de la factura debe coincidir con el RFC del miembro autenticado.
- El RFC emisor debe coincidir con el RFC de Dismant (configurado como variable de entorno).
- Las facturas con fecha de emisión mayor a 90 días son rechazadas automáticamente.

### Datos Personales (LFPDPPP)

- El portal incluye Aviso de Privacidad y T&C con checkbox de aceptación obligatoria al registrarse.
- El formulario de solicitud ARCO (Acceso, Rectificación, Cancelación, Oposición) está disponible en el perfil del cliente.
- Los datos del RFC y correo se almacenan encriptados en reposo.

---

## 12. Roadmap de Implementación

### Fase 0 — Configuración y Diseño (Semanas 1–2)

- [ ] Repositorio en GitHub con estructura monorepo (apps/web, apps/api).
- [ ] Configuración de ambientes: local, staging, producción.
- [ ] Sistema de diseño en Figma: componentes base, paleta de colores, tipografía.
- [ ] Esquema de base de datos completo y primera migración con Prisma.
- [ ] Cuenta de Resend configurada con dominio verificado.
- [ ] Cuenta de Facturapi configurada en modo sandbox.
- [ ] Proyecto de Firebase Cloud Messaging creado.
- [ ] Bucket de Cloudflare R2 creado con políticas de acceso.

### Fase 1 — MVP Cerrado (Semanas 3–8)

**Sprint 1 (sem 3–4): Auth y Onboarding**
- Flujo de registro de 4 pasos.
- Magic Link y OTP por email.
- Middleware de autenticación y RBAC básico.

**Sprint 2 (sem 5–6): Factura y Ledger**
- Subida de XML y extracción de datos.
- Validación contra Facturapi (modo sandbox).
- Creación de registros en `invoices` y `ledger_entries`.
- Vista de estado de cuenta del cliente.

**Sprint 3 (sem 7–8): Catálogo y Canje**
- CRUD de premios en panel admin.
- Catálogo con filtro por geolocalización.
- Flujo de canje con generación de voucher.
- Descuento de puntos en ledger.

### Fase 2 — Core Completo (Semanas 9–14)

**Sprint 4 (sem 9–10): Ratings y Notificaciones**
- Sistema de reseñas con bono de puntos.
- Integración de Firebase FCM (push notifications).
- Plantillas de email para todos los eventos.

**Sprint 5 (sem 11–12): Panel Admin**
- Dashboard operativo con KPIs.
- Gestión de miembros con carga masiva CSV.
- Cola de aprobación de facturas y promociones.
- Auditoría completa.

**Sprint 6 (sem 13–14): Geo y Promociones**
- Módulo de geolocalización completo.
- Módulo de promociones de aliados.
- Reportes exportables (Excel y PDF).

### Fase 3 — Testing y Hardening (Semanas 15–16)

- Pruebas de integración end-to-end (Playwright).
- Pruebas de carga (k6).
- Auditoría de seguridad: OWASP Top 10.
- UAT con usuarios reales de Dismant.
- Corrección de bugs encontrados.

### Fase 4 — Lanzamiento y Growth (Semana 17+)

- Despliegue en producción.
- Onboarding del equipo de Dismant.
- Migración de datos históricos de clientes (si aplica).
- Monitoreo activo durante las primeras 2 semanas.
- Iteración basada en feedback de usuarios reales.

---

## 13. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| SAT devuelve falsos negativos en validación | Media | Alto | Flujo de aprobación manual como respaldo |
| Facturapi tiene downtime | Baja | Alto | Cola con reintentos automáticos (BullMQ) |
| Cliente sube factura de otro emisor | Alta | Medio | Validación estricta de RFC emisor |
| Abuso del bono por reseña | Media | Bajo | Límite de 1 bono por canje, mínimo 20 caracteres |
| Crecimiento de base de datos del ledger | Baja | Medio | Índices en member_id + created_at; archivado anual |
| Puntos expirados generan conflicto | Media | Alto | Proceso batch nocturno que marca expirados sin borrarlos |
| Fraude en canje (voucher compartido) | Media | Medio | Voucher de un solo uso, marcado como "usado" al presentarse |
