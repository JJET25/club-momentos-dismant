# Plan de Trabajo — Club Momentos Dismant

**Última actualización:** Mayo 2026  
**Estado general:** Setup base completado (TT-001). Listo para iniciar desarrollo.

---

## Cómo trabajar en este documento

- Marca cada tarea con `[x]` conforme la termines.
- Al completar una historia de usuario completa, marca también el encabezado `[ ] US-XXX`.
- Cuando empieces a trabajar en algo, cámbialo de `[ ]` a `[~]` (en progreso).
- Las tareas técnicas dentro de cada historia son el desglose de implementación, no solo los criterios de aceptación.

---

## Cómo trabajar en el proyecto

### Setup inicial (una sola vez)

```bash
# 1. Instalar dependencias del monorepo
npm install

# 2. Configurar variables de entorno
cp .env.example apps/web/.env.local
# También crear packages/database/.env con:
# DATABASE_URL=postgresql://... (puerto 6543, pooled)
# DIRECT_URL=postgresql://... (puerto 5432, directo)

# 3. Generar cliente de Prisma y correr migración inicial
cd packages/database
npm run db:generate
npm run db:migrate

# 4. Levantar el proyecto
cd ../..
npm run dev
```

### Flujo de desarrollo

1. Trabaja directamente en `main` mientras seas el único dev, o crea una rama por historia (`feature/US-001-registro`).
2. Antes de cada sesión: `npm run type-check` para detectar errores de tipos.
3. Antes de hacer commit: `npm run lint` + `npm run format`.
4. Las API Routes van en `apps/web/app/api/{recurso}/route.ts`.
5. Los Server Components leen el usuario desde los headers `x-user-id` y `x-user-role` que inyecta el middleware — no necesitas leer la cookie manualmente.
6. El cliente de Prisma se importa desde `@dismant/database`; los tipos desde `@dismant/types`.

---

## Estado actual

| Tarea | Estado |
|---|---|
| TT-001 — Monorepo, Next.js, Prisma, middleware RBAC, librerías base | ✅ Completado |
| TT-002 — Setup de Supabase y variables de entorno | ✅ Completado |
| TT-003 — Primera migración + RLS + seed | ✅ Completado |

---

## Fase 0 — Configuración de Infraestructura

> Desbloquea todo lo demás. Sin esto no se puede desarrollar ni probar nada.

### [ ] TT-002 — Setup de Supabase y ambientes

- [ ] Crear proyecto en Supabase (staging)
- [ ] Copiar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` a `apps/web/.env.local`
- [ ] Copiar `DATABASE_URL` (puerto 6543) y `DIRECT_URL` (puerto 5432) a `packages/database/.env`
- [ ] Generar `JWT_SECRET` con `openssl rand -base64 64` y agregarlo al `.env.local`
- [ ] Configurar proyecto en Vercel conectado al repo (rama `main` → staging)
- [ ] Configurar GitHub Actions: lint + type-check + build en cada push

### [ ] TT-003 — Primera migración y datos semilla

- [ ] Correr `npm run db:migrate` desde `packages/database/` y verificar que todas las tablas se creen correctamente
- [ ] Activar Row Level Security en Supabase para `ledger_entries` (solo INSERT permitido)
- [ ] Activar Row Level Security en Supabase para `audit_log` (solo INSERT permitido)
- [ ] Crear script de seed en `packages/database/prisma/seed.ts`:
  - [ ] Insertar roles: `owner`, `admin`, `employee`, `member`
  - [ ] Insertar 1 usuario `owner` de prueba
  - [ ] Insertar 2 usuarios `admin` de prueba
  - [ ] Insertar 10 miembros de prueba con distintos estados/ciudades
  - [ ] Insertar 5 SKUs de prueba (mix nacional/local, físico/digital)
- [ ] Verificar que el seed corre con `npx prisma db seed`

---

## Fase 1 — MVP Cerrado (Sprints 1–3)

---

### Sprint 1 — Autenticación y Onboarding

---

#### [ ] TT-006 — Integración Resend (email)

- [ ] Crear cuenta en Resend y verificar dominio del remitente
- [ ] Agregar `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `RESEND_FROM_NAME` al `.env.local`
- [ ] Verificar que `apps/web/lib/resend.ts` se conecta correctamente
- [ ] Crear plantilla de email `otp-login` (código OTP de 6 dígitos)
- [ ] Crear plantilla de email `magic-link` (enlace de acceso)

---

#### [ ] US-001 — Registro de nuevo miembro

- [ ] Crear página `app/(auth)/register/page.tsx` con layout de 4 pasos y barra de progreso
- [ ] **Paso 1 — Datos personales:**
  - [ ] Campos: nombre completo, correo, empresa, RFC, código de invitación (opcional)
  - [ ] Validar formato de RFC (persona física: 13 chars, moral: 12 chars) con Zod
  - [ ] Verificar RFC único contra la DB antes de avanzar (API Route: `POST /api/auth/check-rfc`)
  - [ ] Verificar correo único contra la DB (API Route: `POST /api/auth/check-email`)
  - [ ] Mostrar errores inline: "Este RFC ya tiene una cuenta" / "Ya existe una cuenta con este correo"
- [ ] **Paso 2:** Disparar US-002 (OTP)
- [ ] **Paso 3:** Disparar US-003 (perfil)
- [ ] **Paso 4:** Disparar US-004 (bienvenida)

---

#### [ ] US-002 — Verificación por OTP

- [ ] Crear API Route `POST /api/auth/send-otp`:
  - [ ] Generar código de 6 dígitos aleatorio
  - [ ] Hashear con bcrypt antes de guardar en `otp_tokens` *(el código actual guarda en texto plano — hay un TODO pendiente)*
  - [ ] Guardar con expiración de 10 minutos
  - [ ] Enviar email con plantilla `otp-login` via Resend
  - [ ] Rate limiting: máximo 5 intentos por IP en 15 minutos (usar middleware o headers)
- [ ] Crear API Route `POST /api/auth/verify-otp`:
  - [ ] Verificar código contra el hash en DB
  - [ ] Verificar que no esté expirado y que `used = false`
  - [ ] Marcar como `used = true` al validar correctamente
  - [ ] Devolver error si el código fue ya utilizado o expiró
- [ ] Crear componente de UI del paso 2: input de 6 dígitos (un campo por dígito), cuenta regresiva de 60s para reenvío, mensaje de error por intento fallido

---

#### [ ] US-003 — Configuración de perfil en el onboarding

- [ ] Crear componente de paso 3 con:
  - [ ] Selector de estado (los 32 estados de `MEXICAN_STATES` de `@dismant/types`)
  - [ ] Selector de ciudad dependiente del estado seleccionado
  - [ ] Checkbox de Términos y Condiciones con modal de texto completo
  - [ ] Checkbox de Aviso de Privacidad con modal de texto completo
  - [ ] Botón "Finalizar registro" deshabilitado hasta que ambos checkboxes estén marcados
- [ ] Crear API Route `POST /api/auth/register`:
  - [ ] Crear registro en `members` con todos los datos recopilados en los 4 pasos
  - [ ] Asignar rol `member` por defecto
  - [ ] Llamar internamente a la lógica de bienvenida (US-004)
  - [ ] Crear sesión JWT y establecer cookie httpOnly

---

#### [ ] US-004 — Pantalla de bienvenida con puntos de bono

- [ ] Crear página `app/(auth)/welcome/page.tsx` (se muestra solo al completar registro)
- [ ] Al crear el miembro, insertar en `ledger_entries`:
  - [ ] `type: 'welcome_bonus'`
  - [ ] `points: WELCOME_BONUS_POINTS` (env var, default 100)
  - [ ] `balance_after: 100`
  - [ ] `description: 'Bono de bienvenida'`
- [ ] La pantalla de bienvenida muestra: nombre del usuario, puntos acreditados, botón CTA "Ver catálogo"

---

#### [ ] US-005 — Login con Magic Link

- [ ] Crear página `app/(auth)/login/page.tsx` (ya existe el stub) con campo de correo
- [ ] Crear API Route `POST /api/auth/magic-link`:
  - [ ] Verificar que el correo existe en `members`
  - [ ] Generar token JWT de un solo uso con expiración de 15 minutos
  - [ ] Enviar email con plantilla `magic-link`
  - [ ] Si el correo no existe, devolver: "No encontramos una cuenta con este correo"
- [ ] Crear API Route `GET /api/auth/verify-magic-link?token=...`:
  - [ ] Verificar el token JWT de un solo uso
  - [ ] Crear sesión de 7 días y establecer cookie `session`
  - [ ] Redirigir al dashboard del cliente
  - [ ] Si el token expiró, redirigir al login con mensaje "Tu enlace expiró. Solicita uno nuevo."

---

#### [ ] US-006 — Cierre de sesión

- [ ] Crear API Route `POST /api/auth/logout`:
  - [ ] Eliminar cookie `session` (usando `clearSessionCookie()` de `lib/auth.ts`)
  - [ ] Redirigir al login
- [ ] Agregar botón "Cerrar sesión" en el menú del navbar de ambos layouts (client y admin)
- [ ] Verificar que el botón de "atrás" del navegador no regrese al dashboard tras cerrar sesión (Cache-Control headers)

---

#### [ ] US-039 — RBAC base en el sistema

- [ ] Verificar que el middleware `apps/web/middleware.ts` cubre todas las rutas necesarias
- [ ] Agregar verificación de rol en cada API Route sensible (helper `requireRole(role, request)`)
- [ ] Implementar función helper para leer el usuario actual en Server Components desde los headers `x-user-id` / `x-user-role`
- [ ] Probar que un `member` que accede a `/admin/*` es redirigido a `/dashboard`
- [ ] Probar que un usuario no autenticado que accede a `/dashboard` es redirigido a `/login`

---

#### [ ] US-041 — Ledger inmutable (RLS en Supabase)

- [ ] Verificar en Supabase Dashboard que la tabla `ledger_entries` tiene RLS activada
- [ ] Crear política RLS: `INSERT` permitido para `service_role`, `SELECT` permitido para `authenticated`
- [ ] Crear política RLS para `audit_log` con las mismas reglas
- [ ] Verificar que ninguna API Route ejecuta `UPDATE` o `DELETE` sobre estas tablas
- [ ] Probar manualmente que un intento de UPDATE vía el cliente Supabase con `anon_key` devuelve error

---

### Sprint 2 — Facturas y Ledger

---

#### [ ] TT-004 — Integración Facturapi (sandbox)

- [ ] Crear cuenta en Facturapi y obtener `FACTURAPI_SECRET_KEY` (sandbox: `sk_test_...`)
- [ ] Agregar `FACTURAPI_SECRET_KEY` y `DISMANT_RFC` al `.env.local`
- [ ] Crear módulo `apps/web/lib/facturapi.ts`:
  - [ ] Función `validateCfdi(uuid, rfcEmisor, rfcReceptor, total)` que consulta Facturapi
  - [ ] Manejar los 3 casos: `vigente`, `cancelada`, `no_encontrada`
  - [ ] Manejo de timeout con retry (máximo 3 intentos, backoff 1s/2s/4s)
  - [ ] Retornar un `CfdiValidationResult` del tipo en `@dismant/types`

#### [ ] TT-005 — Integración Cloudflare R2

- [ ] Crear bucket en Cloudflare R2 (staging)
- [ ] Agregar variables R2 al `.env.local`
- [ ] Verificar que `apps/web/lib/r2.ts` funciona correctamente
- [ ] Probar subida de un archivo de prueba y recuperación con URL firmada

---

#### [ ] US-010 — Subida de factura XML

- [ ] Crear página `app/(client)/invoices/new/page.tsx` con zona de carga (drag & drop + botón)
- [ ] Crear función `parseXmlCfdi(xmlBuffer)` en `lib/utils.ts` que extraiga: UUID, RFC emisor, RFC receptor, fecha de emisión, total
- [ ] Crear API Route `POST /api/invoices`:
  - [ ] Validar que el archivo es XML
  - [ ] Parsear el XML y extraer datos del CFDI
  - [ ] Validación 1: RFC emisor == `DISMANT_RFC` (env var)
  - [ ] Validación 2: RFC receptor == RFC del miembro autenticado
  - [ ] Validación 3: UUID no existe en `invoices` (UNIQUE constraint)
  - [ ] Validación 4: fecha de emisión dentro de los últimos `INVOICE_MAX_AGE_DAYS` días
  - [ ] Subir XML a R2 con clave `invoices/{member_id}/{uuid_cfdi}.xml`
  - [ ] Llamar a Facturapi para validar contra el SAT
  - [ ] Crear registro en `invoices` con `status = 'pending'` y el resultado del SAT
  - [ ] Registrar en `audit_log`: `action: 'invoice.submitted'`
- [ ] Mostrar resultado en UI: éxito con "Factura recibida. Será revisada por el equipo." o error con el mensaje específico

---

#### [ ] US-012 — Vista de facturas subidas

- [ ] Crear página `app/(client)/invoices/page.tsx`
- [ ] Crear API Route `GET /api/invoices` que devuelva las facturas del miembro autenticado con paginación
- [ ] Tabla con columnas: UUID abreviado, fecha, monto, estatus (con colores), puntos generados
- [ ] Filtros: por estatus, por rango de fechas
- [ ] Al hacer clic en una fila → modal o página de detalle con todos los datos del CFDI

---

#### [ ] US-013 — Estado de cuenta con trazabilidad

- [ ] Crear página `app/(client)/statement/page.tsx`
- [ ] Crear API Route `GET /api/ledger?memberId=...&type=...&from=...&to=...`
- [ ] Tabla con columnas: fecha, tipo (con ícono), descripción, puntos (+/-), saldo acumulado
- [ ] Al expandir una fila de tipo `invoice`: mostrar UUID, fecha de pago, monto, estatus SAT, operador
- [ ] Al expandir una fila de tipo `redemption`: mostrar nombre del premio, código de voucher
- [ ] Filtros: por tipo de movimiento, por rango de fechas

---

#### [ ] US-035 — Notificación de factura aprobada

- [ ] Crear plantilla de email `invoice-approved` en Resend con: nombre, UUID, monto, puntos acreditados, saldo total
- [ ] Crear plantilla de email `invoice-rejected` con: nombre, UUID, razón del rechazo
- [ ] En el flujo de aprobación de factura (US-030), llamar al módulo de email tras aprobar o rechazar

---

### Sprint 3 — Catálogo, Canjes y Panel Admin

---

#### [ ] US-007 — Dashboard del cliente

- [ ] Completar página `app/(client)/dashboard/page.tsx` (ya existe el stub)
- [ ] Crear API Route `GET /api/members/me/summary` que devuelva:
  - [ ] Saldo de puntos actual (última entrada del ledger del miembro)
  - [ ] Puntos ganados este mes
  - [ ] Puntos canjeados (histórico)
  - [ ] Facturas validadas (conteo)
  - [ ] Últimos 5 movimientos del ledger
  - [ ] Puntos que vencen en los próximos 30 días (suma de `ledger_entries` donde `expires_at <= now() + 30 días`)
- [ ] Mostrar alerta visual si hay puntos por vencer
- [ ] Asegurarse de que la página carga en < 2 segundos (verificar con DevTools)

---

#### [ ] US-015 — Ver catálogo de premios

- [ ] Crear página `app/(client)/catalog/page.tsx`
- [ ] Crear API Route `GET /api/catalog?state=...&city=...&category=...`:
  - [ ] Filtrar por `status = 'active'`
  - [ ] Filtrar por geolocalización: `geo_type = 'national'` O (`geo_type = 'local'` Y estado del miembro en `geo_states`)
  - [ ] Ordenar por: menor costo, mayor calificación, más canjeado
- [ ] Grid de tarjetas: imagen (lazy load), nombre, costo en puntos, stock, calificación promedio
- [ ] Indicar visualmente si el cliente no tiene suficientes puntos para un premio

---

#### [ ] US-016 — Detalle de un premio

- [ ] Crear página o modal `app/(client)/catalog/[skuId]/page.tsx`
- [ ] Crear API Route `GET /api/catalog/:skuId`
- [ ] Mostrar: imagen, descripción completa, costo, stock, instrucciones, zona, calificación promedio y reseñas
- [ ] Deshabilitar botón de canje si `stock = 0` o si el miembro no tiene puntos suficientes

---

#### [ ] US-017 — Flujo de canje

- [ ] Crear API Route `POST /api/redemptions`:
  - [ ] Verificar saldo suficiente del miembro
  - [ ] Verificar stock > 0 del SKU (con lock para evitar race condition)
  - [ ] Reducir `stock` del SKU en 1
  - [ ] Si el SKU es digital, asignar el código más antiguo de `digital_codes` (FIFO)
  - [ ] Generar voucher (código alfanumérico de 8 chars o UUID corto)
  - [ ] Crear registro en `redemptions`
  - [ ] Insertar en `ledger_entries`: `type: 'redemption'`, `points: -puntos_del_sku`
  - [ ] Registrar en `audit_log`
- [ ] Modal de confirmación: nombre del premio, costo, saldo restante tras el canje
- [ ] Pantalla de voucher inmediata tras confirmar: código QR y/o alfanumérico + instrucciones
- [ ] Manejar el caso de "stock agotado entre visualización y confirmación"

---

#### [ ] US-018 — Vista de mis canjes

- [ ] Crear página `app/(client)/redemptions/page.tsx`
- [ ] Crear API Route `GET /api/redemptions` que devuelva los canjes del miembro
- [ ] Lista: imagen del premio, nombre, fecha, estatus del voucher, botón "Ver voucher"
- [ ] Modal de voucher: código QR generado en cliente + código alfanumérico + instrucciones
- [ ] Destacar el botón "Calificar" en canjes sin reseña

---

#### [ ] US-021 — Selección de ubicación (cubierta por US-003)

- [ ] Verificar que los datos `location_state` y `location_city` se guardan correctamente en `members` al completar el registro
- [ ] Verificar que el catálogo filtra correctamente desde el primer acceso post-registro

---

#### [ ] US-023 — Cobertura geográfica de premios (Admin)

- [ ] En el formulario de creación/edición de SKU (US-031), agregar:
  - [ ] Radio buttons: "Nacional" / "Local"
  - [ ] Si "Local": multiselect de estados de México
  - [ ] Opcionalmente: selector de ciudades por estado seleccionado
- [ ] Verificar que los cambios surten efecto de inmediato en el catálogo del cliente

---

#### [ ] US-026 — Dashboard operativo del admin

- [ ] Completar página `app/(admin)/dashboard/page.tsx` (ya existe el stub)
- [ ] Crear API Route `GET /api/admin/dashboard/summary` (requiere rol admin/owner/employee)
- [ ] KPIs: total miembros activos, nuevos este mes, puntos en circulación, puntos canjeados, premios con reseña
- [ ] Gráfica de puntos emitidos vs. canjeados por mes (últimos 6 meses) — usar Recharts (ya instalado)
- [ ] Top 5 premios más canjeados del mes

---

#### [ ] US-027 — Gestión de miembros (Admin)

- [ ] Crear página `app/(admin)/members/page.tsx`
- [ ] Crear API Route `GET /api/admin/members?q=...` con paginación y búsqueda por nombre/RFC/empresa
- [ ] Tabla: nombre, empresa, RFC, ciudad, puntos activos, facturas registradas, último acceso
- [ ] Página de detalle `app/(admin)/members/[memberId]/page.tsx`: datos, ledger completo, historial de canjes
- [ ] Botones de suspender / reactivar cuenta con campo de razón obligatoria
- [ ] Registrar suspensión/reactivación en `audit_log`

---

#### [ ] US-028 — Carga manual de puntos (Admin)

- [ ] En la vista de detalle del miembro, agregar botón "Agregar puntos" (solo roles admin/owner)
- [ ] Formulario: cantidad de puntos + razón del ajuste (obligatoria)
- [ ] Crear API Route `POST /api/admin/members/:memberId/adjust-points`:
  - [ ] Insertar en `ledger_entries`: `type: 'adjustment'`, con la razón en `description`
  - [ ] Registrar en `audit_log`: `action: 'points.manual_adjustment'`

---

#### [ ] US-030 — Cola de aprobación de facturas (Admin)

- [ ] Crear página `app/(admin)/invoices/page.tsx`
- [ ] Crear API Route `GET /api/admin/invoices?status=pending` (orden: más antigua primero)
- [ ] Vista de detalle de factura: datos del CFDI + resultado de Facturapi + XML descargable desde R2
- [ ] Crear API Route `PATCH /api/admin/invoices/:id/approve`:
  - [ ] Cambiar `status` de la factura a `approved`
  - [ ] Calcular puntos: `floor(total_mxn / POINTS_PER_AMOUNT)`
  - [ ] Insertar en `ledger_entries`: `type: 'invoice'`, con `expires_at = now() + POINTS_EXPIRY_DAYS`
  - [ ] Registrar en `audit_log`
  - [ ] Enviar email de notificación al miembro (plantilla `invoice-approved`)
- [ ] Crear API Route `PATCH /api/admin/invoices/:id/reject`:
  - [ ] Cambiar `status` a `rejected`, guardar `rejection_reason`
  - [ ] Registrar en `audit_log`
  - [ ] Enviar email con la razón al miembro

---

#### [ ] US-031 — CRUD de catálogo de premios (Admin)

- [ ] Crear página `app/(admin)/catalog/page.tsx` con listado de SKUs
- [ ] Formulario de creación/edición con: nombre, descripción, imagen (upload a R2), costo en puntos, stock, categoría, tipo (físico/digital), cobertura geográfica (US-023)
- [ ] Crear API Routes: `POST /api/admin/catalog`, `PUT /api/admin/catalog/:id`, `PATCH /api/admin/catalog/:id/status`
- [ ] Opción de pausar/reactivar SKU (cambia `status` a `paused` / `active`)
- [ ] Registrar cambios de stock en `audit_log`
- [ ] Upload de imagen a R2 y almacenar URL en `image_url`

---

## Fase 2 — Core Completo (Sprints 4–6)

---

### Sprint 4 — Ratings y Notificaciones

---

#### [ ] US-019 — Calificar un premio canjeado

- [ ] En "Mis Canjes" (US-018), mostrar botón "Calificar" en canjes sin reseña
- [ ] Formulario: selector de 1–5 estrellas + campo de comentario opcional
- [ ] Mostrar aviso "+5 puntos extra" cuando el comentario alcanza 20 caracteres
- [ ] Crear API Route `POST /api/redemptions/:id/review`:
  - [ ] Verificar que el canje pertenece al miembro autenticado
  - [ ] Verificar que no existe una reseña previa para ese `redemption_id`
  - [ ] Crear registro en `reviews`
  - [ ] Si `comment.length >= REVIEW_MIN_COMMENT_LENGTH`: insertar en `ledger_entries` `type: 'review_bonus'`, `points: +REVIEW_BONUS_POINTS` y marcar `bonus_awarded = true` en la reseña

---

#### [ ] US-020 — Ver reseñas de un premio en el catálogo

- [ ] En el detalle del SKU (US-016), agregar sección de reseñas
- [ ] Crear API Route `GET /api/catalog/:skuId/reviews?limit=5`
- [ ] Mostrar: calificación promedio, total de reseñas, últimas 5 (autor anónimo: "Cliente de [ciudad]")
- [ ] Botón "Ver todas" si hay más de 5

---

#### [ ] TT-007 — Integración Firebase FCM (push)

- [ ] Crear proyecto en Firebase y activar Cloud Messaging
- [ ] Agregar variables `NEXT_PUBLIC_FIREBASE_*` y `FIREBASE_ADMIN_*` al `.env.local`
- [ ] Crear `public/firebase-messaging-sw.js` (Service Worker)
- [ ] Crear módulo `apps/web/lib/firebase.ts` (cliente) y `apps/web/lib/firebase-admin.ts` (servidor)
- [ ] Implementar prompt de permisos de push al primer login del miembro
- [ ] Guardar/actualizar `fcm_token` en `members` al activar las notificaciones
- [ ] Crear función `sendPushNotification(fcmToken, title, body)` en el módulo admin

---

#### [ ] US-035 — Notificaciones push (extensión)

- [ ] Usar FCM para enviar push en los eventos: factura aprobada, factura rechazada, canje exitoso

---

#### [ ] US-036 — Notificación de puntos por vencer

- [ ] Crear proceso batch que corra diariamente (puede ser un endpoint protegido llamado por cron externo o un GitHub Action scheduled)
- [ ] Lógica: buscar en `ledger_entries` puntos con `expires_at` entre hoy y 30 días, agrupar por miembro
- [ ] Por cada miembro afectado: enviar email con plantilla `points-expiring` + push FCM
- [ ] Guardar en un campo o tabla que ya se notificó (evitar notificar todos los días)

---

#### [ ] US-037 — Solicitud de reseña 24h post-canje

- [ ] Implementar con TT-008 (BullMQ) o un cron simple
- [ ] Al crear un canje (US-017), agendar un job para 24 horas después
- [ ] El job envía email `review-request` + push FCM si el canje aún no tiene reseña
- [ ] Si hay reseña previa, cancelar el job sin enviar

---

#### [ ] TT-008 — Colas con Upstash + BullMQ

- [ ] Crear instancia Redis en Upstash y agregar `UPSTASH_REDIS_URL` y `UPSTASH_REDIS_TOKEN`
- [ ] Configurar BullMQ con la conexión de Upstash
- [ ] Implementar colas: `invoice-validation`, `notifications`, `review-requests`
- [ ] Implementar Workers para cada cola
- [ ] Configurar el cron de puntos por vencer como job recurrente en BullMQ

---

#### [ ] US-038 — Centro de notificaciones in-app

- [ ] Crear tabla `notifications` en Prisma (si no existe): `memberId`, `type`, `message`, `link`, `read`, `createdAt`
- [ ] Crear API Route `GET /api/notifications` y `PATCH /api/notifications/read-all`
- [ ] Componente de campana en el navbar con badge de no leídas
- [ ] Panel desplegable con las últimas 20 notificaciones (ícono por tipo, timestamp relativo)
- [ ] Al hacer clic: marcar como leída y navegar al recurso

---

### Sprint 5 — Panel Admin completo

---

#### [ ] US-029 — Carga masiva de puntos por CSV

- [ ] Crear página `app/(admin)/members/bulk-points/page.tsx`
- [ ] Crear plantilla CSV descargable con columnas: `rfc`, `puntos`, `razon`
- [ ] Upload de CSV → previsualización (filas detectadas, errores: RFC no encontrado, puntos inválidos)
- [ ] Al confirmar: crear entradas en `ledger_entries` por cada fila válida, saltar las inválidas
- [ ] Generar reporte de errores tras el proceso
- [ ] Registrar operación completa en `audit_log` con referencia al archivo

---

#### [ ] US-032 — Carga masiva de códigos digitales

- [ ] En el detalle del SKU digital, agregar sección "Cargar códigos"
- [ ] Crear API Route `POST /api/admin/catalog/:skuId/digital-codes`
- [ ] Procesar CSV con columna `codigo` y crear registros en `digital_codes`
- [ ] Mostrar cuántos códigos se importarán y el stock actual antes de confirmar
- [ ] Alerta automática al admin cuando el stock de cualquier SKU baje del umbral configurado

---

#### [ ] US-033 — Reportes operativos

- [ ] Crear sección `app/(admin)/reports/page.tsx`
- [ ] Reporte 1 — Flujo de clientes: miembros nuevos vs. activos por mes, tasa de activación
- [ ] Reporte 2 — Ledger: puntos emitidos, en circulación, canjeados, expirados
- [ ] Reporte 3 — Top premios: más canjeados + rating promedio + tasa de reseña
- [ ] Filtros de fecha por reporte
- [ ] Exportar a Excel con `xlsx` o similar
- [ ] Exportar a PDF (ver TT-009)
- [ ] Reportes financieros visibles solo para rol `owner`

---

#### [ ] US-034 — Visor de auditoría

- [ ] Crear página `app/(admin)/audit/page.tsx` (solo roles `owner` y `admin`)
- [ ] Crear API Route `GET /api/admin/audit?actor=...&action=...&from=...&to=...`
- [ ] Tabla: timestamp, actor, acción, tipo de recurso, datos del evento (JSON expandible)
- [ ] Sin botones de editar o eliminar en ningún rol

---

#### [ ] US-040 — Gestión de roles desde el panel

- [ ] En la vista de detalle del miembro (solo rol `owner`): agregar selector de rol
- [ ] Crear API Route `PATCH /api/admin/members/:id/role` (solo permitido con rol `owner`)
- [ ] Validar que el Dueño no pueda cambiar su propio rol
- [ ] Registrar cambio en `audit_log`

---

### Sprint 6 — Geo avanzado, Promociones y PDFs

---

#### [ ] US-022 — Actualizar ubicación desde el perfil

- [ ] En la página de perfil del miembro, permitir editar `location_state` y `location_city`
- [ ] Crear API Route `PATCH /api/members/me/location`
- [ ] El catálogo se actualiza al guardar (la próxima carga del catálogo usa la nueva ubicación)
- [ ] Registrar el cambio de ubicación en el historial del miembro (campo en `audit_log`)

---

#### [ ] US-024 — Ver promociones de aliados

- [ ] Crear página `app/(client)/promotions/page.tsx`
- [ ] Crear API Route `GET /api/promotions` (filtra por zona y estatus `active`)
- [ ] Banner principal: la promoción con `featured = true`
- [ ] Grid de tarjetas: imagen, aliado (badge verificado), zona, vigencia, botón "Ver más"

---

#### [ ] US-025 — Gestión de promociones (Admin)

- [ ] Crear sección `app/(admin)/promotions/page.tsx` con tabs: "En revisión" / "Activas"
- [ ] Botones de aprobar / rechazar (con razón obligatoria al rechazar)
- [ ] Formulario de creación directa de promociones por el admin
- [ ] Marcar cualquier promoción activa como `featured`
- [ ] Registrar decisiones en `audit_log`

---

#### [ ] US-008 — Perfil del usuario

- [ ] Crear página `app/(client)/profile/page.tsx`
- [ ] Mostrar: nombre, correo (no editable), empresa (no editable), RFC (no editable), estado, ciudad
- [ ] Editar: nombre, estado (→ US-022), ciudad (→ US-022)
- [ ] Link a formulario ARCO (US-009)

---

#### [ ] US-009 — Formulario ARCO

- [ ] Crear sección dentro del perfil con formulario: tipo de derecho (ARCO), descripción, correo de contacto
- [ ] Al enviar: email de confirmación al usuario con folio + notificación interna al equipo de Dismant

---

#### [ ] US-011 — Ingreso manual de UUID de factura

- [ ] Agregar tab "Ingresar UUID" en la página de subir facturas
- [ ] Campo con validación de formato UUID estándar
- [ ] Consultar Facturapi con solo el UUID y continuar el mismo flujo que US-010

---

#### [ ] US-014 — Descarga de estado de cuenta en PDF

- [ ] Implementar con TT-009
- [ ] Selector en el estado de cuenta: "Mes actual" / "Mes anterior" / "Rango personalizado"
- [ ] Botón de descarga → llamar a `GET /api/members/me/statement/pdf?from=...&to=...`
- [ ] Nombre del archivo: `estado-cuenta-{RFC}-{YYYY-MM}.pdf`

---

#### [ ] TT-009 — Generación de PDFs

- [ ] Evaluar e instalar `@react-pdf/renderer` o Puppeteer
- [ ] Crear plantilla del estado de cuenta mensual con: logo, datos del miembro, período, tabla de movimientos, saldo inicial y final
- [ ] Endpoint de descarga con los datos del ledger filtrados por período
- [ ] Guardar el PDF en R2 para evitar regeneraciones (caché por miembro + período)

---

## Fase 3 — Testing y Hardening

- [ ] Instalar y configurar Playwright para tests E2E
- [ ] Escribir tests E2E para los flujos críticos:
  - [ ] Registro completo de un nuevo miembro
  - [ ] Login con Magic Link
  - [ ] Subida y aprobación de factura
  - [ ] Canje de un premio
- [ ] Auditoría de seguridad OWASP Top 10 (al menos: XSS, SQL injection via Prisma, CSRF, rate limiting)
- [ ] Verificar que no hay secretos (`SERVICE_ROLE_KEY`, `JWT_SECRET`) expuestos en el cliente
- [ ] Pruebas de carga básicas con k6 en los endpoints más usados
- [ ] UAT con usuarios reales del equipo de Dismant (al menos 2 rondas)
- [ ] Corrección de bugs identificados en UAT

---

## Fase 4 — Lanzamiento

- [ ] Configurar ambiente de producción en Vercel
- [ ] Configurar variables de entorno de producción (Supabase prod, R2 prod, Resend dominio prod, Facturapi `sk_live_`)
- [ ] Correr migraciones en producción
- [ ] Despliegue inicial
- [ ] Onboarding del equipo de Dismant (owner + admins)
- [ ] Migración de datos históricos de clientes (si aplica)
- [ ] Monitoreo activo durante las primeras 2 semanas

---

## Resumen de progreso

| Fase | Historias | SP | Estado |
|---|---|---|---|
| Fase 0 — Infra | TT-002, TT-003 | 6 | ⏳ Pendiente |
| Sprint 1 — Auth | US-001 a US-006, US-039, US-041, TT-006 | ~22 | ⏳ Pendiente |
| Sprint 2 — Facturas | US-010, US-012, US-013, US-035, TT-004, TT-005 | ~20 | ⏳ Pendiente |
| Sprint 3 — Catálogo/Admin | US-007, US-015 a US-018, US-021, US-023, US-026 a US-031 | ~38 | ⏳ Pendiente |
| Sprint 4 — Ratings/Notif. | US-019, US-020, US-036, US-037, US-038, TT-007, TT-008 | ~19 | ⏳ Pendiente |
| Sprint 5 — Admin completo | US-029, US-032, US-033, US-034, US-040 | ~19 | ⏳ Pendiente |
| Sprint 6 — Geo/Promos/PDF | US-008, US-009, US-011, US-014, US-022, US-024, US-025, TT-009 | ~25 | ⏳ Pendiente |
| Fase 3 — Testing | E2E, seguridad, carga, UAT | — | ⏳ Pendiente |
| Fase 4 — Launch | Deploy, onboarding | — | ⏳ Pendiente |

> **Por dónde empezar:** Fase 0 (TT-002 + TT-003) → Sprint 1 (auth) → Sprint 2 (facturas). Los sprints 1 y 2 son el núcleo del MVP y desbloquean el valor central del producto.
