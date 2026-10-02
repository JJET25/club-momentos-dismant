# Plan de Implementación — Facturas, Promociones y Branding Multi-Marca

**Fecha:** 2026-09-26 (actualizado tras primera pasada de implementación)
**Continúa la numeración de** `docs/stories.md` (hasta US-041 / TT-009).

## Estado de implementación (2026-09-26)

| Item | Estado |
|---|---|
| TT-010 — Conversión 1000:1 | ✅ Implementado (`POINTS_PER_AMOUNT`, `calculatePoints`) |
| TT-011 — RFC por affiliate | ✅ Código listo (`lib/scope.ts#getAffiliateRfc`); falta que nos den el **RFC real de Lauti** (`LAUTI_RFC` sigue sin valor) |
| US-042 — Form manual extendido | ✅ Implementado (número de factura, pedido, RFC afiliado, fecha de pago, autofill de puntos) |
| US-043 — Carga masiva Excel | ✅ Implementado (`/api/admin/invoices/bulk-import` + modal en el admin), usa `exceljs` (no `xlsx`, por CVEs conocidos en esa librería) |
| US-044 — Promoción ↔ catálogo | ✅ Implementado en creación y en edición (selector de SKU + autofill en ambos modales) |
| US-045 — Branding (colores/logos) | ⚠️ Parcial — ver detalle abajo |
| Migración de base de datos | ✅ `20260926000000_invoice_fields_and_promotion_sku` aplicada en Supabase (verificado 2026-10-01) |

**Branding — qué quedó y qué no:**
- ✅ `brand.ts` ahora tiene colores reales extraídos de los logos/sitios oficiales + logos de baja resolución (`apps/web/public/brand/{dismant,lauti}.png`, tomados de los sitios públicos como placeholder).
- ✅ Layouts de admin y de cliente: logo real + color `--primary` dinámico según el affiliate de la sesión (todo lo que ya usaba `bg-primary`/`text-primary` en la app hereda el color automáticamente).
- ✅ Página de registro y de bienvenida: hero con logo real y degradado de color por affiliate (ahí el affiliate se conoce por la invitación).
- ✅ Correos (`resend.ts`): ya no usan un azul fijo, cada correo transaccional usa el color del affiliate del destinatario.
- ⏸️ **Decisión tomada (2026-09-26):** `/login` (y varios controles secundarios de `/register`, como inputs y botones de "Términos") se quedan con la paleta azul fija de Tailwind (`brand-600`, etc.) por ahora. El dominio actual va a cambiarse por uno nuevo más adelante; una vez que ese dominio quede estable, se van a agregar subdominios por affiliate (ej. `dismant.<dominio-nuevo>` / `lauti.<dominio-nuevo>`) para el portal ya autenticado, y ese subdominio es lo que se usará para detectar el affiliate en páginas públicas como `/login`. No tiene caso construir la detección antes de tener el dominio definitivo.
- ❌ Logos reales en alta resolución — los que se usaron son los que están públicos en los sitios (baja resolución). Si tienen los archivos oficiales, reemplazan directamente `apps/web/public/brand/dismant.png` y `lauti.png`.

**Actualización 2026-09-26 (segunda pasada):** se hizo el resto del re-temado. Hallazgo importante: la mayoría de los componentes (sidebars, banners, botones `.btn-primary`, inputs `.input-field`, checkboxes, links de "Términos y Condiciones") no usaban `bg-primary`/`text-primary` sino una paleta Tailwind fija `brand-50..950` (definida antes como hex estáticos), así que el cambio de `--primary` por sí solo no los afectaba. Se resolvió así:
- `tailwind.config.ts`: la paleta `brand.50..950` ahora lee de variables CSS (`hsl(var(--brand-XXX) / <alpha-value>)`) en vez de hex fijos.
- `app/globals.css`: define el default de esas variables (idéntico al azul que ya existía, para que nada cambie donde no se sobreescriba — ej. `/login`).
- `lib/brand.ts`: cada affiliate ahora trae una escala de 11 tonos (50→950) generada a partir de su color primario (mismo hue/saturación, luminosidad variable), y un helper `getBrandCssVars(brand)` que regresa las variables listas para un `style` de React.
- Se aplicó `getBrandCssVars()` en los 4 puntos que ya conocían el affiliate (layout admin, layout cliente, registro, bienvenida) — como son variables CSS, se heredan automáticamente a *todos* los componentes hijos (sidebars, banners, botones) sin tocar esos archivos uno por uno.
- `/login` y el spinner de "Validando invitación..." de `/register` (paso previo a saber el affiliate) se quedan con el default genérico — consistente con la decisión ya tomada de esperar a los subdominios.

---

## 0. Resumen de lo que se va a construir

| # | Tema | Épica relacionada |
|---|---|---|
| 1 | Conversión de puntos: 1000 pesos = 1 punto (todos los affiliates) | Épica 3 |
| 2 | Captura manual de factura con campos nuevos + autofill de puntos | Épica 3 (extiende US-011/US-028) |
| 3 | Carga masiva de facturas por archivo Excel | Épica 3 (nueva, hermana de US-029) |
| 4 | Promociones ligadas al catálogo (`RewardSku`) en vez de contenido independiente | Épica 7 (extiende US-025) |
| 5 | Logo y colores por affiliate (Dismant / Lauti) | Nueva — Épica 11: Branding |
| 6 | Renombrar `lauti` → `scitech` en la URL | Pospuesto, lo hace el usuario directamente |

## 1. Fuera de alcance (confirmado con el usuario)

- "Ver factura de la página / quedar en 50,000" — tema aparte, no se toca.
- Ahorro para el retiro / finanzas personales — no es parte de este proyecto.

---

## 2. Facturas

### 2.1 Cambio de conversión de puntos (1000:1)

- Hoy: `calculatePoints(amountMXN, pointsPerAmount = 100)` en [utils.ts:67](apps/web/lib/utils.ts#L67).
- Cambio: default `100` → `1000`, aplica a **todos los affiliates** (confirmado).
- Falta revisar y actualizar todo texto de UI/correo que mencione la tasa actual, y cualquier lugar que llame `calculatePoints` con un override explícito.

### 2.2 Captura manual de factura — campos nuevos

Ya existe un endpoint de captura manual: [apps/web/app/api/admin/invoices/manual/route.ts](apps/web/app/api/admin/invoices/manual/route.ts). Hoy solo pide `memberId`, `points` (a mano), `totalMxn`, `folioReferencia`, `description`, `issuedAt`, crea la factura en `pending` y **no** calcula puntos automáticamente — un manager los acredita después vía `/verify`.

Mapeo de los campos que pediste contra el modelo `Invoice` actual ([schema.prisma:136](packages/database/prisma/schema.prisma#L136)):

| Campo pedido | ¿Existe ya? | Acción |
|---|---|---|
| Número de factura (clave) | No | **Nuevo campo** `invoiceNumber` (folioReferencia es un folio libre de documento físico, no la clave de factura — son cosas distintas) |
| RFC afiliado | Sí (`rfcEmisor`) | Hoy se llena siempre con `DISMANT_RFC` — ver gap en 2.4 |
| Empresa (nombre) | Sí, indirecto (`Member.companyName`) | Se muestra al elegir el miembro, no se vuelve a capturar |
| Miembro | Sí (`memberId`) | Selector con buscador (ya existe patrón en bulk-points) |
| Pedido | No | **Nuevo campo** `orderNumber` |
| Fecha de emisión | Sí (`issuedAt`) | — |
| Fecha de pago | Sí (`paidAt`) | Hoy no se captura en el form manual, solo existe en el modelo |
| Subtotal monto | Sí (`totalMxn`) | Ver pregunta abierta sobre subtotal vs. total |
| Puntos asignado | Sí (`pointsGenerated`) | Hoy se captura a mano — pasa a **autofill** `Math.floor(subtotal / 1000)`, editable por el staff antes de guardar |

**Cambios de schema (migración Prisma):**
```prisma
model Invoice {
  // ...
  invoiceNumber String? @map("invoice_number")
  orderNumber   String? @map("order_number")
}
```

**Cambios de UI/API:**
- Formulario manual agrega los 2 campos nuevos + fecha de pago.
- El campo de puntos se autocalcula en vivo al escribir el subtotal (`1000:1`), permitiendo edición manual antes de enviar (igual que hoy se permite editar `points`).
- La acreditación de puntos al ledger sigue el flujo actual de dos pasos (`verification_status: pending` → `/verify` acredita) — no se cambia ese invariante salvo que se indique lo contrario.

### 2.3 Carga masiva de facturas por Excel

Ya existe un patrón idéntico para esto: [apps/web/app/api/admin/members/bulk-points/route.ts](apps/web/app/api/admin/members/bulk-points/route.ts) — parseo → preview con errores por fila → confirmación → procesamiento → `audit_log`. Se replica esa misma arquitectura para facturas:

1. **Nueva dependencia**: no hay librería de Excel instalada (`xlsx`/`exceljs`); el bulk-points actual es CSV plano. Se necesita agregar `xlsx` (SheetJS) para leer `.xlsx`.
2. **Nuevo endpoint** `apps/web/app/api/admin/invoices/bulk-import/route.ts`, mismo rol (`SCOPED_MANAGER_ROLES` o `STAFF_ROLES`, a definir).
3. Columnas esperadas: los mismos 9 campos del formulario manual (número de factura, RFC afiliado, empresa, **identificador de miembro**, pedido, fecha emisión, fecha pago, subtotal, puntos — este último puede ir vacío y autocalcularse).
4. **Problema a resolver:** el RFC del miembro **no es único** — puede haber varios miembros con el mismo RFC de la misma empresa (comentario explícito en `schema.prisma:52`). El bulk-points actual ya se topa con esto y cuando hay RFC duplicado, marca la fila como error y pide asignación individual. Para facturas se recomienda pedir en el Excel una columna adicional inequívoca (ej. **email del miembro**) para evitar ese choque en catálogos grandes.
5. Cada fila válida crea un `Invoice` en `pending` (mismo invariante de dos pasos que la captura manual) — **no** se salta la revisión aunque la carga sea masiva, para no romper la trazabilidad del ledger. Si se prefiere auto-aprobar en la carga masiva, es una decisión explícita a tomar (ver preguntas abiertas).

### 2.4 Gap encontrado: RFC hardcodeado a Dismant

`rfcEmisor` se llena en 3 lugares con `process.env.DISMANT_RFC` sin importar el affiliate del miembro:
[manual/route.ts:57](apps/web/app/api/admin/invoices/manual/route.ts#L57), `client/invoices/route.ts`, `client/invoices/uuid/route.ts`.

Como ahora pides capturar explícitamente "RFC afiliado" por factura, esto ya no puede seguir hardcodeado a un solo RFC. Se propone un mapa análogo a `brand.ts`:

```ts
// lib/affiliate-rfc.ts
const AFFILIATE_RFC: Record<string, string> = {
  dismant: process.env.DISMANT_RFC!,
  lauti:   process.env.LAUTI_RFC!,
}
```
y usar `getAffiliateRfc(affiliate)` en los 3 lugares en vez de `DISMANT_RFC` fijo. Necesita `LAUTI_RFC` en `.env.example` (hoy no existe).

### Preguntas abiertas — Facturas

1. **Subtotal vs. total**: ¿"Subtotal monto" es antes de IVA y debe ser un campo nuevo distinto de `totalMxn`, o es simplemente el nombre que le das a `totalMxn`? Si llevan IVA por separado, se necesita un campo adicional.
2. **Excel — identificador de miembro**: ¿confirmas agregar una columna de email (o ID) en el Excel para no depender solo del RFC, dado que no es único?
3. **Auto-aprobación en carga masiva**: ¿las facturas cargadas por Excel deben quedar en `pending` esperando verificación manual (como hoy), o se acreditan los puntos de inmediato si el miembro existe? Recomiendo mantener `pending` por consistencia con el resto del sistema, pero es tu decisión.
4. **RFC de Lauti**: necesito el RFC oficial de Lauti para `LAUTI_RFC` en el `.env`.

---

## 3. Promociones ligadas al catálogo

Hoy `PartnerPromotion` ([schema.prisma:310](packages/database/prisma/schema.prisma#L310)) ya tiene `featured: Boolean` — **destacados ya existe**, no hay que construirlo. Lo que falta es la relación con `RewardSku`.

**Cambio de schema:**
```prisma
model PartnerPromotion {
  // ...
  skuId String? @map("sku_id")
  sku   RewardSku? @relation(fields: [skuId], references: [id])
}
```
- `skuId` opcional para no romper promociones existentes que no representan un premio puntual (ej. banners genéricos de un aliado).
- Al elegir un SKU en el form de creación ([apps/web/app/(admin)/admin/promotions/page.tsx](apps/web/app/(admin)/admin/promotions/page.tsx)), se autocompletan `title`, `description`, `image_url` desde el `RewardSku` y quedan de solo lectura (o editables si se quiere permitir override — a definir).
- La vista pública de promociones (`app/(client)/promotions`) sigue leyendo de `PartnerPromotion` igual que hoy; solo cambia el origen de los datos al momento de crear/editar.

### Pregunta abierta — Promociones

¿El admin debe poder **editar** el título/descripción/imagen después de jalarlos del catálogo (por si quiere un texto promocional distinto al del catálogo), o deben quedar bloqueados y sincronizados 1:1 con el SKU mientras la promoción exista?

---

## 4. Branding multi-marca (colores y logos)

Hallazgo importante: `brand.ts` dice explícitamente hoy que *"la paleta nunca varía por affiliate ... para mantener consistencia visual entre correos"* ([brand.ts:10-12](apps/web/lib/brand.ts#L10-L12)) y usa un azul único (`#2563eb`). Lo que pides revierte esa decisión de diseño a propósito — lo dejo documentado para que quede explícito el cambio de rumbo.

Además, hoy **no existen logos** (imagen) en el sistema — el branding actual es solo texto + una inicial de letra. Y los colores están hardcodeados como clases Tailwind literales (ej. `bg-[#0f172a]` en layouts), no como variables — cambiarlos por affiliate requiere introducir variables CSS por marca en vez de clases fijas.

### 4.1 Paleta propuesta (extraída de los sitios reales, para tu confirmación)

Descargué los logos oficiales y el CSS de ambos sitios para sacar los colores reales en vez de adivinar:

**Dismant** (de `logo_dismant.png` + `theme_css_vars.css` del sitio):
- Azul marino de marca (logo/texto): **`#12208C`** *(rango muestreado #001090–#001898)*
- Rojo/naranja de acento (la flama del logo, y coincide exacto con `--porto-secondary-color` del sitio): **`#DE291E`**
- Gris oscuro neutro usado en el sitio para UI (headers, texto oscuro): **`#282D3B`**

**Lauti** (de `logo2.png` + `elements.css`/inline styles del sitio):
- Azul de marca (degradado de puntos del logo): **`#1450D8`** *(rango muestreado #0048D8–#4068E0)*
- Azul marino oscuro de acento (extremo oscuro del degradado del logo, y coincide con un color usado en un heading del sitio, `#293e64`): **`#12205A`**

Estos valores vienen de muestreo de píxeles de los PNG oficiales — son una propuesta de partida, no un pantone exacto. Si tienes manual de marca o archivos vectoriales (SVG/AI) con los hex oficiales, mejor usarlos directamente.

### 4.2 Logos

Encontré los archivos que usan actualmente en sus sitios:
- Dismant: `logo_dismant.png` (principal), `logo_dismant_sticker.png` (ícono/versión compacta), `logo-footer.png`
- Lauti: `logo2.png` (principal), `logo-footer1.png`

Se necesita que me proporciones los archivos en buena resolución (o autorices que se usen directo de esas URLs) para subirlos a R2 o a `public/` y referenciarlos desde `getBrand()`.

### 4.3 Cambios técnicos propuestos

1. Extender `BRANDS` en `brand.ts` con `primary`, `accent`, `logoUrl` por affiliate en vez del `BRAND_BLUE` único.
2. Introducir variables CSS (`--brand-primary`, `--brand-accent`) inyectadas en el `<html>` o layout raíz según el affiliate de la sesión, y migrar las clases hardcodeadas (`bg-[#0f172a]`, etc.) en los 15 archivos que hoy usan `BRAND_BLUE`/`getBrand()` para leer de esas variables.
3. Correos (`resend.ts`) y PDFs de estado de cuenta no soportan CSS variables (son HTML inline / render estático) — ahí sí se resuelve el color en el servidor vía `getBrand(affiliate).primary` y se inyecta como valor literal en cada plantilla.
4. Página de login/registro y home cambian su franja de color/logo según el affiliate detectado (por subdominio, invitación o parámetro — hay que confirmar cómo se determina el affiliate en rutas públicas antes de que exista sesión).

### Pregunta abierta — Branding

¿Cómo se determina el affiliate en las páginas **públicas** (login, registro, home) donde todavía no hay sesión activa? Hoy el affiliate vive en `Member`/`Invitation`, pero una página de login sin contexto de invitación no sabe a qué marca pertenece. Opciones: subdominio (`lauti.clubmomentos...`), dominio propio por marca, o un selector manual. Esto determina bastante el esfuerzo de esta parte.

---

## 5. Scitech

Pospuesto — el usuario lo hace directamente (cambio cosmético de nombre de URL de `lauti` a `scitech`). No requiere trabajo de este plan.

---

## 6. Historias nuevas propuestas (continúan numeración de `docs/stories.md`)

| ID | Historia | Épica |
|---|---|---|
| TT-010 | Cambiar conversión de puntos a 1000:1 | Transversal |
| TT-011 | RFC configurable por affiliate (reemplaza `DISMANT_RFC` fijo) | Transversal |
| US-042 | Captura manual de factura con campos extendidos + autofill de puntos | Épica 3 |
| US-043 | Carga masiva de facturas por Excel | Épica 3 |
| US-044 | Promoción ligada a un premio del catálogo | Épica 7 |
| US-045 | Logo y colores por affiliate en toda la plataforma | Nueva Épica 11 — Branding |

## 7. Orden sugerido de implementación

1. TT-010 (conversión 1000:1) — cambio pequeño y aislado, base para todo lo de facturas.
2. TT-011 (RFC por affiliate) — desbloquea capturar "RFC afiliado" correctamente.
3. US-042 (form manual extendido) — reusa endpoint existente, bajo riesgo.
4. US-043 (Excel bulk) — reusa el patrón de `bulk-points`, mayor esfuerzo por el parseo y matching de miembros.
5. US-044 (promociones ↔ catálogo) — independiente de lo anterior, se puede hacer en paralelo.
6. US-045 (branding) — el más grande; conviene resolver primero las preguntas abiertas de la sección 4 antes de tocar código, porque define si es un cambio de CSS variables o algo más profundo (subdominios).
