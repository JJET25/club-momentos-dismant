# Club Momentos Dismant — Backlog de Historias de Usuario
**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Metodología de priorización:** MoSCoW (Must / Should / Could / Won't for now)

---

## Tabla de Contenidos

- [Épica 1 — Autenticación y Onboarding](#épica-1--autenticación-y-onboarding)
- [Épica 2 — Portal del Cliente](#épica-2--portal-del-cliente)
- [Épica 3 — Facturas y Puntos (CFDI)](#épica-3--facturas-y-puntos-cfdi)
- [Épica 4 — Catálogo y Canjes](#épica-4--catálogo-y-canjes)
- [Épica 5 — Ratings y Reseñas](#épica-5--ratings-y-reseñas)
- [Épica 6 — Geolocalización](#épica-6--geolocalización)
- [Épica 7 — Promociones de Aliados](#épica-7--promociones-de-aliados)
- [Épica 8 — Panel de Administración](#épica-8--panel-de-administración)
- [Épica 9 — Notificaciones](#épica-9--notificaciones)
- [Épica 10 — RBAC y Seguridad](#épica-10--rbac-y-seguridad)
- [Tareas Técnicas Transversales](#tareas-técnicas-transversales)
- [Resumen de Prioridades](#resumen-de-prioridades)

---

## Leyenda

| Símbolo | Significado |
|---|---|
| 🔴 Must | Indispensable para el MVP. Sin esto no hay producto. |
| 🟡 Should | Importante. Se incluye en el primer ciclo si hay tiempo. |
| 🟢 Could | Deseable. Se agenda en el siguiente ciclo. |
| ⚪ Won't | Fuera de alcance por ahora. Se documenta para no olvidar. |
| SP | Story Points (1 = trivial, 2 = medio día, 3 = un día, 5 = dos días, 8 = una semana) |

---

## Épica 1 — Autenticación y Onboarding

**Objetivo:** Un usuario nuevo puede registrarse por sí mismo y acceder al sistema de forma segura sin necesidad de un administrador.

---

### US-001 — Registro de nuevo miembro (auto-registro)
**Prioridad:** 🔴 Must | **SP:** 5

**Como** cliente nuevo de Dismant,  
**quiero** poder registrarme en el portal por mí mismo,  
**para** acceder al programa de lealtad sin depender del administrador.

**Criterios de aceptación:**
- El formulario solicita: nombre completo, correo electrónico, nombre de empresa y RFC.
- El campo de código de invitación es visible pero opcional.
- El RFC se valida con formato correcto (persona física y moral).
- Si el RFC ya existe en el sistema, se muestra el error: "Este RFC ya tiene una cuenta registrada."
- Si el correo ya existe, se muestra: "Ya existe una cuenta con este correo. ¿Olvidaste cómo ingresar?"
- El registro es en 4 pasos con barra de progreso visible.

**Dependencias:** US-002 (verificación OTP)

---

### US-002 — Verificación por OTP de 6 dígitos
**Prioridad:** 🔴 Must | **SP:** 3

**Como** usuario recién registrado,  
**quiero** verificar mi correo con un código de 6 dígitos,  
**para** confirmar que el correo es mío antes de acceder.

**Criterios de aceptación:**
- El sistema envía un código de 6 dígitos al correo indicado.
- El código expira en 10 minutos. Si expira, se muestra mensaje claro.
- El usuario puede solicitar reenvío después de 60 segundos (con cuenta regresiva visible).
- Máximo 5 intentos fallidos por IP en 15 minutos; después se bloquea con mensaje.
- Al ingresar el código correcto, avanza al paso 3 automáticamente.
- El código es de un solo uso: ingresarlo dos veces devuelve error "Código ya utilizado."

---

### US-003 — Configuración de perfil en el onboarding
**Prioridad:** 🔴 Must | **SP:** 3

**Como** usuario verificando su cuenta,  
**quiero** seleccionar mi estado y ciudad, y aceptar los términos,  
**para** que el sistema me muestre el catálogo de premios correcto desde el primer día.

**Criterios de aceptación:**
- El selector de estado muestra los 32 estados de México en orden alfabético.
- Al seleccionar un estado, el selector de ciudad se carga con las ciudades de ese estado.
- El checkbox de Términos y Condiciones es obligatorio (no puede avanzar sin marcarlo).
- El checkbox del Aviso de Privacidad es obligatorio.
- Los T&C y Aviso de Privacidad son links que abren un modal con el texto completo.
- El botón de "Finalizar registro" está deshabilitado hasta que ambos checkboxes estén marcados.

---

### US-004 — Pantalla de bienvenida con puntos de bono
**Prioridad:** 🔴 Must | **SP:** 2

**Como** usuario que acaba de completar su registro,  
**quiero** ver una pantalla de bienvenida con mis puntos iniciales,  
**para** entender inmediatamente el valor del programa.

**Criterios de aceptación:**
- Se muestra la pantalla de bienvenida solo una vez (al completar el registro).
- Se acreditan automáticamente los puntos de bienvenida configurados (default: 100 pts).
- La pantalla muestra: nombre del usuario, puntos acreditados, y un CTA a "Ver catálogo".
- En el ledger queda registrado el movimiento de tipo "welcome_bonus".

---

### US-005 — Login con Magic Link
**Prioridad:** 🔴 Must | **SP:** 3

**Como** miembro registrado,  
**quiero** ingresar al portal introduciendo mi correo y recibiendo un enlace de acceso,  
**para** no tener que recordar una contraseña.

**Criterios de aceptación:**
- La pantalla de login tiene solo un campo: correo electrónico.
- Al enviar, el sistema muestra: "Te enviamos un enlace a [correo]. Revisa tu bandeja."
- El Magic Link expira en 15 minutos.
- Si el correo no está registrado, se muestra: "No encontramos una cuenta con este correo."
- Al hacer clic en el link, el sistema inicia la sesión y redirige al dashboard.
- La sesión dura 7 días. Si expira, redirige al login con mensaje: "Tu sesión expiró."

---

### US-006 — Cierre de sesión
**Prioridad:** 🔴 Must | **SP:** 1

**Como** usuario autenticado,  
**quiero** poder cerrar mi sesión desde cualquier pantalla,  
**para** proteger mi cuenta si uso un equipo compartido.

**Criterios de aceptación:**
- El botón de "Cerrar sesión" está disponible en el menú del perfil en el navbar.
- Al cerrar sesión, se invalida el token y se redirige al login.
- Después de cerrar sesión, el botón de "atrás" del navegador no regresa al dashboard.

---

## Épica 2 — Portal del Cliente

**Objetivo:** El cliente tiene una pantalla de inicio útil y completa que refleja el estado de su cuenta.

---

### US-007 — Dashboard con resumen de puntos
**Prioridad:** 🔴 Must | **SP:** 3

**Como** miembro del club,  
**quiero** ver mi saldo de puntos y un resumen de mi actividad al entrar al portal,  
**para** saber en todo momento cuántos puntos tengo disponibles.

**Criterios de aceptación:**
- La pantalla muestra el saldo de puntos disponibles en un elemento visual destacado.
- Muestra KPIs rápidos: puntos ganados este mes, puntos canjeados (histórico), facturas validadas.
- Muestra los últimos 5 movimientos del ledger con fecha, tipo e ícono diferenciador.
- Si hay puntos que vencen en los próximos 30 días, aparece una alerta con el monto y la fecha.
- El dashboard carga en menos de 2 segundos.

---

### US-008 — Perfil del usuario
**Prioridad:** 🟡 Should | **SP:** 3

**Como** miembro del club,  
**quiero** ver y editar mis datos de perfil,  
**para** mantener mi información actualizada.

**Criterios de aceptación:**
- El usuario puede ver: nombre, correo, empresa, RFC, estado y ciudad.
- Puede editar: nombre, estado y ciudad.
- El correo y el RFC no son editables (son llaves de identidad).
- Hay un link para acceder al formulario de Solicitud ARCO.
- Los cambios se guardan con confirmación visual ("Perfil actualizado").

---

### US-009 — Formulario de solicitud ARCO
**Prioridad:** 🟡 Should | **SP:** 2

**Como** miembro del club,  
**quiero** poder ejercer mis derechos de Acceso, Rectificación, Cancelación u Oposición sobre mis datos,  
**para** cumplir con la LFPDPPP.

**Criterios de aceptación:**
- El formulario tiene: tipo de derecho (ARCO), descripción del caso, y correo de contacto.
- Al enviar, el usuario recibe un correo de confirmación con número de folio.
- El equipo de Dismant recibe una notificación interna de la solicitud.
- El sistema responde en un plazo máximo de 20 días hábiles (dato informativo en la pantalla).

---

## Épica 3 — Facturas y Puntos (CFDI)

**Objetivo:** El cliente puede subir sus facturas y obtener puntos de forma trazable y segura.

---

### US-010 — Subida de factura XML
**Prioridad:** 🔴 Must | **SP:** 5

**Como** miembro del club,  
**quiero** subir el archivo XML de mi factura de Dismant,  
**para** que el sistema extraiga los datos automáticamente y valide mis puntos.

**Criterios de aceptación:**
- La zona de carga acepta drag & drop o selección de archivo.
- Solo acepta archivos `.xml`. Si se sube otro tipo, muestra error: "Solo se aceptan archivos XML de CFDI."
- El sistema extrae automáticamente: UUID, RFC emisor, RFC receptor, fecha y monto total.
- Si el RFC receptor no coincide con el RFC del miembro, rechaza con: "Esta factura no está a tu nombre."
- Si el RFC emisor no es el de Dismant, rechaza con: "Esta factura no fue emitida por Dismant."
- Si el UUID ya existe, rechaza con: "Esta factura ya fue registrada anteriormente."
- Si la factura tiene más de 90 días de antigüedad, rechaza con: "Esta factura está fuera del período permitido."
- El archivo XML se guarda en Cloudflare R2 independientemente del resultado.
- La factura válida queda en estatus "Pendiente" y aparece en la cola del admin.

---

### US-011 — Ingreso manual de UUID de factura
**Prioridad:** 🟡 Should | **SP:** 3

**Como** miembro del club que no tiene el XML a la mano,  
**quiero** ingresar el Folio Fiscal (UUID) de mi factura manualmente,  
**para** registrarla sin necesidad del archivo.

**Criterios de aceptación:**
- El campo acepta UUIDs con el formato estándar: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`.
- Al ingresar el UUID, el sistema consulta a Facturapi para obtener los datos de la factura.
- Si Facturapi no encuentra el UUID, muestra: "No se encontró esta factura en el SAT."
- El flujo de validación es idéntico al de la subida de XML a partir de este punto.

---

### US-012 — Vista de facturas subidas
**Prioridad:** 🔴 Must | **SP:** 3

**Como** miembro del club,  
**quiero** ver el historial de todas las facturas que he registrado,  
**para** saber cuáles fueron aprobadas y cuáles están pendientes o rechazadas.

**Criterios de aceptación:**
- La tabla muestra: UUID (primeros 8 chars + "..."), fecha de subida, monto, estatus, puntos generados.
- El estatus tiene colores: Pendiente (amarillo), Aprobada (verde), Rechazada (rojo).
- Al hacer clic en una fila, se abre el detalle completo de la factura.
- Hay filtros por estatus y por rango de fechas.
- Las facturas se ordenan por fecha descendente (más reciente primero).

---

### US-013 — Estado de cuenta con trazabilidad completa
**Prioridad:** 🔴 Must | **SP:** 5

**Como** miembro del club,  
**quiero** ver el historial detallado de todos mis movimientos de puntos,  
**para** saber exactamente de dónde viene cada punto y a dónde fue.

**Criterios de aceptación:**
- Cada movimiento muestra: fecha, tipo, descripción, puntos (+/-), saldo acumulado.
- Los movimientos de tipo "Factura" muestran al expandirse: UUID del CFDI, fecha de pago, monto base, estatus de validación SAT, operador que aprobó.
- Los movimientos de tipo "Canje" muestran: nombre del premio, código de voucher.
- Los movimientos de tipo "Bono" muestran: razón del bono (bienvenida, reseña).
- Hay filtros por tipo de movimiento y por rango de fechas.
- El saldo acumulado en cada fila es correcto y coincide con el saldo actual al llegar a la fila más reciente.

---

### US-014 — Descarga de estado de cuenta en PDF
**Prioridad:** 🟡 Should | **SP:** 5

**Como** miembro del club,  
**quiero** descargar mi estado de cuenta en PDF,  
**para** tener un registro formal de mis puntos para mis archivos.

**Criterios de aceptación:**
- El usuario puede elegir entre: "Mes actual", "Mes anterior" o "Rango personalizado."
- El PDF incluye: datos del miembro (nombre, RFC, empresa), período, tabla de movimientos, saldo inicial, saldo final.
- El PDF tiene el logo y nombre de "Club Momentos Dismant."
- El PDF se genera en menos de 5 segundos.
- El archivo se descarga con nombre: `estado-cuenta-{RFC}-{YYYY-MM}.pdf`.

---

## Épica 4 — Catálogo y Canjes

**Objetivo:** El cliente puede explorar premios disponibles en su zona y canjearlos con sus puntos.

---

### US-015 — Ver catálogo de premios
**Prioridad:** 🔴 Must | **SP:** 3

**Como** miembro del club,  
**quiero** ver el catálogo de premios disponibles para mi zona,  
**para** saber qué puedo canjear con mis puntos.

**Criterios de aceptación:**
- Solo aparecen premios con `status = 'active'` y con cobertura para la zona del cliente.
- Cada tarjeta muestra: imagen, nombre, costo en puntos, stock disponible, calificación promedio.
- Si el cliente no tiene suficientes puntos para un premio, la tarjeta lo indica visualmente pero sigue siendo visible.
- Hay filtros por categoría y orden por: menor costo, mayor calificación, más canjeado.
- Si el catálogo está vacío, se muestra un estado vacío con mensaje amigable.
- El catálogo carga en menos de 2 segundos con imágenes optimizadas (lazy load).

---

### US-016 — Detalle de un premio
**Prioridad:** 🔴 Must | **SP:** 2

**Como** miembro del club,  
**quiero** ver el detalle completo de un premio antes de canjearlo,  
**para** tomar una decisión informada.

**Criterios de aceptación:**
- El modal/página muestra: imagen ampliada, nombre, descripción completa, costo en puntos, stock actual, instrucciones de uso, vigencia del voucher, zona de aplicación, calificación promedio y reseñas de otros usuarios.
- Si el stock es 0, el botón de canje está deshabilitado con mensaje: "Sin stock disponible."
- Si el cliente no tiene puntos suficientes, el botón muestra: "Necesitas X puntos más."

---

### US-017 — Flujo de canje de un premio
**Prioridad:** 🔴 Must | **SP:** 5

**Como** miembro del club,  
**quiero** canjear un premio con mis puntos,  
**para** obtener el beneficio que escogí.

**Criterios de aceptación:**
- Al hacer clic en "Canjear", aparece un modal de confirmación con: nombre del premio, costo en puntos, puntos que le quedarán después del canje ("Saldo restante: X puntos").
- El usuario debe hacer clic en "Confirmar canje" (no solo cerrar el modal).
- El sistema verifica en tiempo real que el saldo sea suficiente y el stock esté disponible antes de procesar.
- Si otro usuario canjeó el último stock entre la visualización y la confirmación, se muestra: "Lo sentimos, este premio se agotó. Tu saldo no fue afectado."
- Al confirmar, se descuentan los puntos del ledger y se reduce el stock en 1.
- Se genera un registro de `redemption` y se asigna un voucher (código alfanumérico o QR).
- El usuario ve la pantalla del voucher inmediatamente.
- Se envía notificación por email y push con el voucher.

---

### US-018 — Vista de mis canjes
**Prioridad:** 🔴 Must | **SP:** 3

**Como** miembro del club,  
**quiero** ver el historial de todos mis canjes,  
**para** acceder a mis vouchers y saber qué premios he recibido.

**Criterios de aceptación:**
- La lista muestra: imagen del premio, nombre, fecha de canje, estatus del voucher (Activo / Usado / Expirado), botón "Ver voucher."
- Al hacer clic en "Ver voucher," se muestra el código QR / alfanumérico con instrucciones.
- Los canjes pendientes de calificar muestran el botón "Calificar" de forma destacada.

---

## Épica 5 — Ratings y Reseñas

**Objetivo:** Los clientes califican los premios canjeados, generando contenido útil para otros miembros e incentivos para el cliente que reseña.

---

### US-019 — Calificar un premio canjeado
**Prioridad:** 🟡 Should | **SP:** 3

**Como** miembro que canjeó un premio,  
**quiero** calificarlo con estrellas y dejar un comentario,  
**para** ayudar a otros miembros a tomar mejores decisiones.

**Criterios de aceptación:**
- El botón "Calificar" aparece en "Mis Canjes" solo si el canje no ha sido calificado.
- El formulario tiene: selector de 1–5 estrellas (obligatorio) y campo de comentario (opcional).
- Si el comentario tiene al menos 20 caracteres, se muestra el aviso: "¡Recibirás 5 puntos extra por tu reseña!"
- Al enviar la calificación, si el comentario tiene ≥20 caracteres, se acreditan automáticamente +5 puntos.
- El movimiento en el ledger indica: tipo "review_bonus", descripción "Bono por reseña: [nombre del premio]".
- Solo se puede calificar una vez por canje. El botón desaparece tras calificar.

---

### US-020 — Ver reseñas de un premio en el catálogo
**Prioridad:** 🟡 Should | **SP:** 2

**Como** miembro del club,  
**quiero** ver las reseñas de otros usuarios sobre un premio,  
**para** tomar una decisión de canje más informada.

**Criterios de aceptación:**
- En el detalle del premio se muestra: calificación promedio (número + estrellas), número total de reseñas, lista de las últimas 5 reseñas.
- Cada reseña muestra: estrellas, comentario (si lo hay), y el autor en formato anónimo: "Cliente de [ciudad]".
- Si hay más de 5 reseñas, hay un botón "Ver todas las reseñas."
- Los premios sin reseñas muestran: "Sé el primero en calificar este premio."

---

## Épica 6 — Geolocalización

**Objetivo:** El catálogo de premios y las promociones se filtran automáticamente según la ubicación del cliente.

---

### US-021 — Selección de ubicación en el registro
**Prioridad:** 🔴 Must | **SP:** 2

**Como** usuario en proceso de registro,  
**quiero** seleccionar mi estado y ciudad,  
**para** ver solo los premios que puedo usar en mi zona.

*(Incluida en US-003 — Configuración de perfil. Se registra aquí para trazabilidad.)*

**Criterios de aceptación:**
- Ver US-003. El selector de estado/ciudad en el paso 3 del onboarding satisface esta historia.

---

### US-022 — Actualizar ubicación desde el perfil
**Prioridad:** 🟡 Should | **SP:** 2

**Como** miembro del club que se mudó o viaja con frecuencia,  
**quiero** actualizar mi estado y ciudad desde mi perfil,  
**para** que el catálogo refleje mi ubicación actual.

**Criterios de aceptación:**
- En la sección de perfil, el usuario puede cambiar su estado y ciudad.
- Al guardar el cambio, el catálogo se actualiza inmediatamente con los premios de la nueva zona.
- El cambio de ubicación queda registrado en el historial del miembro (visible para el admin).

---

### US-023 — Configurar cobertura geográfica de un premio (Admin)
**Prioridad:** 🔴 Must | **SP:** 3

**Como** administrador,  
**quiero** definir si un premio es nacional o solo disponible en ciertos estados/ciudades,  
**para** que los clientes solo vean premios que pueden usar en su zona.

**Criterios de aceptación:**
- Al crear o editar un SKU, hay un selector de tipo de cobertura: "Nacional" o "Local."
- Si elige "Local," aparece un selector multiselección de estados de México.
- Opcionalmente puede seleccionar ciudades específicas dentro de los estados seleccionados.
- Los cambios en la cobertura de un SKU surten efecto de inmediato en el catálogo.

---

## Épica 7 — Promociones de Aliados

**Objetivo:** Las empresas aliadas pueden publicar promociones que los clientes ven dentro del portal, segmentadas por zona.

---

### US-024 — Ver promociones de aliados
**Prioridad:** 🟡 Should | **SP:** 3

**Como** miembro del club,  
**quiero** ver las promociones de empresas aliadas disponibles en mi zona,  
**para** aprovechar ofertas adicionales a mis canjes de puntos.

**Criterios de aceptación:**
- La sección de Promociones muestra solo promociones con estatus "activa" y cobertura para la zona del cliente.
- El banner principal muestra la promoción marcada como "featured."
- El grid de tarjetas muestra: imagen, nombre del aliado (con badge "Verificado"), zona, vigencia.
- Al hacer clic, el usuario ve el detalle completo y (si existe) el botón de "Ver más" que lleva a la URL del aliado.
- Las promociones vencidas no aparecen.

---

### US-025 — Gestión de promociones (Admin)
**Prioridad:** 🟡 Should | **SP:** 5

**Como** administrador,  
**quiero** revisar, aprobar y gestionar las promociones de aliados,  
**para** controlar qué contenido ven los clientes en el portal.

**Criterios de aceptación:**
- El panel de admin tiene una sección "Promociones" con dos tabs: "En revisión" y "Activas/Historial."
- En "En revisión," cada tarjeta tiene botones de "Aprobar" y "Rechazar."
- Al rechazar, se pide una razón (campo de texto obligatorio). La razón se guarda y puede enviarse al aliado.
- Al aprobar, la promoción pasa a "Activa" si la fecha de inicio ya llegó, o a "Programada" si es futura.
- El admin puede crear promociones directamente (sin pasar por el flujo de revisión).
- El admin puede marcar cualquier promoción activa como "featured" (banner principal).
- El proceso de aprobación queda registrado en el audit_log.

---

## Épica 8 — Panel de Administración

**Objetivo:** El equipo de Dismant tiene todas las herramientas para operar el programa de lealtad desde el panel de administración.

---

### US-026 — Dashboard operativo del admin
**Prioridad:** 🔴 Must | **SP:** 5

**Como** administrador,  
**quiero** ver los KPIs principales del programa en una pantalla,  
**para** tener visibilidad del estado del programa sin revisar reportes individuales.

**Criterios de aceptación:**
- KPIs mostrados: total de miembros activos, nuevos miembros este mes, puntos en circulación, puntos canjeados (histórico), premios ejercidos (con reseña).
- Gráfica de puntos emitidos vs. canjeados por mes (últimos 6 meses).
- Top 5 premios más canjeados del mes.
- Los KPIs se actualizan en tiempo real (o con un botón de "Actualizar").

---

### US-027 — Gestión de miembros
**Prioridad:** 🔴 Must | **SP:** 5

**Como** administrador,  
**quiero** ver la lista de todos los miembros y acceder al detalle de cada uno,  
**para** poder gestionar las cuentas y resolver dudas o problemas de los clientes.

**Criterios de aceptación:**
- La tabla muestra: nombre, empresa, RFC, ciudad, puntos activos, facturas registradas, último acceso.
- Hay búsqueda por nombre, RFC o empresa.
- Al hacer clic en un miembro, se abre su vista de detalle: datos personales, ledger completo, historial de canjes.
- El admin puede suspender o reactivar una cuenta (con campo de razón).
- La suspensión/reactivación queda en audit_log.

---

### US-028 — Carga manual de puntos (individual)
**Prioridad:** 🔴 Must | **SP:** 3

**Como** administrador,  
**quiero** poder acreditar puntos a un miembro específico manualmente,  
**para** corregir errores o aplicar bonos especiales.

**Criterios de aceptación:**
- Desde la vista de detalle de un miembro, el admin puede hacer clic en "Agregar puntos."
- El formulario pide: cantidad de puntos y razón del ajuste (campo obligatorio).
- El movimiento se registra en el ledger con tipo "adjustment" y la razón capturada.
- El evento queda en audit_log con el ID del admin que lo realizó.
- El empleado no puede hacer ajustes manuales sin aprobación del admin.

---

### US-029 — Carga masiva de puntos por CSV
**Prioridad:** 🟡 Should | **SP:** 5

**Como** administrador,  
**quiero** subir un CSV con múltiples miembros y sus puntos correspondientes,  
**para** procesar liquidaciones de lote sin hacerlo uno por uno.

**Criterios de aceptación:**
- El sistema provee una plantilla CSV descargable con las columnas requeridas: `rfc`, `puntos`, `razon`.
- Al subir el CSV, el sistema muestra una previsualización con las filas detectadas y posibles errores (RFC no encontrado, puntos inválidos).
- El admin confirma la operación para que los puntos se acrediten.
- Los RFCs no encontrados se saltan y se listan en un reporte de errores.
- Cada fila aprobada genera un registro individual en el ledger.
- El proceso completo queda en audit_log con referencia al archivo CSV.

---

### US-030 — Cola de aprobación de facturas
**Prioridad:** 🔴 Must | **SP:** 5

**Como** administrador,  
**quiero** revisar las facturas pendientes de aprobación y aprobarlas o rechazarlas,  
**para** controlar cuándo se acreditan los puntos a los miembros.

**Criterios de aceptación:**
- La cola muestra facturas en orden de antigüedad (más antigua primero).
- Cada fila muestra: nombre del miembro, UUID (abreviado), monto, fecha de subida, resultado de la validación SAT.
- Al abrir el detalle, se muestran todos los datos del CFDI y el resultado completo de Facturapi.
- El admin puede aprobar (puntos se acreditan) o rechazar (con razón obligatoria).
- Al rechazar, el miembro recibe una notificación por email con la razón.
- La decisión queda en audit_log.

---

### US-031 — Gestión de catálogo de premios (CRUD)
**Prioridad:** 🔴 Must | **SP:** 5

**Como** administrador,  
**quiero** crear, editar y administrar los premios del catálogo,  
**para** mantener el catálogo actualizado y atractivo.

**Criterios de aceptación:**
- El admin puede crear un SKU con: nombre, descripción, imagen (upload a R2), costo en puntos, stock inicial, categoría, cobertura geográfica, tipo (físico/digital).
- El admin puede editar cualquier campo de un SKU existente.
- El admin puede pausar un SKU (deja de aparecer en el catálogo sin borrarlo).
- El admin puede reactivar un SKU pausado.
- Al editar el stock, el cambio queda registrado en audit_log.
- La imagen se redimensiona automáticamente a un formato estándar al subirse.

---

### US-032 — Carga masiva de códigos digitales
**Prioridad:** 🟡 Should | **SP:** 3

**Como** administrador,  
**quiero** subir un CSV de códigos para premios digitales,  
**para** que el sistema los asigne automáticamente en el orden correcto al canjear.

**Criterios de aceptación:**
- El CSV solo requiere una columna: `codigo`.
- Al subir el CSV, el sistema muestra cuántos códigos se van a importar y el stock actual del SKU.
- Los códigos nuevos se agregan al inventario existente (no reemplazan los anteriores).
- Al procesarse un canje de ese SKU, el sistema asigna el código más antiguo sin asignar (FIFO).
- Si el sistema detecta que el stock llega a 0, envía una alerta al admin.

---

### US-033 — Reportes operativos
**Prioridad:** 🟡 Should | **SP:** 5

**Como** dueño o administrador,  
**quiero** generar reportes de las métricas del programa,  
**para** tomar decisiones basadas en datos.

**Criterios de aceptación:**
- Reporte 1 — Flujo de clientes: miembros nuevos vs. activos por mes, tasa de activación.
- Reporte 2 — Ledger de puntos: puntos emitidos, en circulación, canjeados y expirados.
- Reporte 3 — Top premios: más canjeados + calificación promedio + tasa de reseña.
- Cada reporte tiene filtros de fecha.
- Cada reporte tiene botón de exportar a Excel (.xlsx) y PDF.
- Los reportes financieros (ganancias, costo de puntos) solo son visibles para el rol Dueño.

---

### US-034 — Visor de auditoría
**Prioridad:** 🟡 Should | **SP:** 3

**Como** dueño o administrador,  
**quiero** revisar el log completo de operaciones sensibles del sistema,  
**para** detectar irregularidades y tener trazabilidad total.

**Criterios de aceptación:**
- El visor muestra: timestamp, actor (nombre del operador), acción, recurso afectado y datos del evento.
- Hay filtros por: actor, tipo de acción, rango de fechas.
- No hay ningún botón de editar o eliminar en este módulo bajo ningún rol.
- El visor es accesible solo para roles Dueño y Administrador.

---

## Épica 9 — Notificaciones

**Objetivo:** Los usuarios reciben comunicaciones oportunas por email, push y dentro de la app sobre eventos relevantes.

---

### US-035 — Notificación de factura aprobada
**Prioridad:** 🔴 Must | **SP:** 2

**Como** miembro del club,  
**quiero** recibir una notificación cuando mi factura sea aprobada,  
**para** saber que mis puntos fueron acreditados sin tener que entrar al portal.

**Criterios de aceptación:**
- Se envía email con: nombre del miembro, UUID de la factura, monto, puntos acreditados, saldo total.
- Se envía push notification con: "Tu factura fue validada. +X puntos acreditados."
- El evento aparece en el centro de notificaciones in-app.

---

### US-036 — Notificación de puntos por vencer
**Prioridad:** 🟡 Should | **SP:** 3

**Como** miembro del club,  
**quiero** recibir una alerta cuando mis puntos estén próximos a vencer,  
**para** canjearlos antes de perderlos.

**Criterios de aceptación:**
- El sistema ejecuta un proceso batch diario que detecta puntos que vencen en los próximos 30 días.
- Se envía email y push al miembro afectado: "Tienes X puntos que vencen el [fecha]. ¡Úsalos!"
- La alerta solo se envía una vez por lote de puntos próximo a vencer (no todos los días).
- El dashboard del cliente muestra la alerta visual mientras hay puntos próximos a vencer.

---

### US-037 — Solicitud de reseña 24h post-canje
**Prioridad:** 🟡 Should | **SP:** 3

**Como** miembro que realizó un canje,  
**quiero** recibir una invitación a calificar el premio 24 horas después,  
**para** no olvidar hacerlo y aprovechar los puntos de bonificación.

**Criterios de aceptación:**
- El sistema agenda un job 24 horas después del canje para enviar la solicitud.
- Se envía email: "¿Cómo fue tu experiencia con [Premio]? Califica y gana 5 puntos."
- Se envía push: "¡Califica tu canje de [Premio] y gana puntos extra!"
- Si el cliente califica antes de las 24 horas, el job se cancela.

---

### US-038 — Centro de notificaciones in-app
**Prioridad:** 🟡 Should | **SP:** 3

**Como** miembro del club,  
**quiero** ver todas mis notificaciones en un centro dentro del portal,  
**para** no perder ningún aviso aunque no haya revisado mi correo.

**Criterios de aceptación:**
- El ícono de campana en el navbar muestra un badge con el número de notificaciones no leídas.
- Al hacer clic, se despliega un panel con las últimas 20 notificaciones.
- Cada notificación tiene: ícono por tipo, texto descriptivo, timestamp relativo ("hace 2 horas").
- Al hacer clic en una notificación, se marca como leída y navega al recurso relacionado.
- Hay un botón "Marcar todas como leídas."

---

## Épica 10 — RBAC y Seguridad

**Objetivo:** El sistema controla con precisión qué puede hacer cada rol, y protege la integridad del ledger y los datos de los usuarios.

---

### US-039 — Implementación de roles en el sistema
**Prioridad:** 🔴 Must | **SP:** 5

**Como** dueño del sistema,  
**quiero** que cada usuario tenga un rol asignado que controle sus accesos,  
**para** garantizar que nadie pueda hacer operaciones fuera de sus permisos.

**Criterios de aceptación:**
- Los roles son: Dueño, Administrador, Empleado y Miembro.
- Cada endpoint de la API verifica el rol del usuario autenticado antes de ejecutar.
- Las rutas del frontend se protegen con middleware de Next.js.
- Un Empleado que intente acceder a una ruta de Admin es redirigido con mensaje: "No tienes permisos para esta sección."
- El rol se incluye en el JWT de sesión y se verifica en cada request.

---

### US-040 — Gestión de roles desde el panel (Dueño)
**Prioridad:** 🟡 Should | **SP:** 3

**Como** dueño del sistema,  
**quiero** poder asignar y cambiar el rol de los usuarios internos (Admin/Empleado),  
**para** controlar qué puede hacer cada miembro del equipo.

**Criterios de aceptación:**
- Solo el rol Dueño puede cambiar roles de otros usuarios.
- El Dueño puede cambiar un Empleado a Admin y viceversa.
- El Dueño no puede cambiar su propio rol.
- El cambio de rol queda registrado en audit_log.

---

### US-041 — Ledger inmutable (protección técnica)
**Prioridad:** 🔴 Must | **SP:** 3

**Como** arquitecto del sistema,  
**quiero** garantizar que los registros del ledger y del audit_log nunca puedan ser modificados o eliminados,  
**para** garantizar la integridad financiera del programa.

**Criterios de aceptación:**
- Las tablas `ledger_entries` y `audit_log` tienen Row Level Security en Supabase que permite únicamente INSERT.
- No existe ningún endpoint en la API que haga UPDATE o DELETE sobre estas tablas.
- Los ajustes de puntos siempre se hacen con una nueva entrada en el ledger (nunca modificando una existente).
- Los tests de integración verifican que intentos de UPDATE/DELETE sobre el ledger devuelven error 403.

---

## Tareas Técnicas Transversales

Estas no son historias de usuario, sino tareas de ingeniería necesarias para que el sistema funcione correctamente.

---

### TT-001 — Setup del monorepo y estructura base
**Prioridad:** 🔴 Must | **SP:** 3

- Inicializar monorepo con Turborepo.
- Configurar `apps/web` con Next.js 14 + TypeScript + TailwindCSS + shadcn/ui.
- Configurar `packages/database` con Prisma + esquema completo.
- Configurar ESLint + Prettier compartido.
- Configurar alias de paths (`@/components`, `@/lib`, etc.).

---

### TT-002 — Setup de ambientes y CI/CD
**Prioridad:** 🔴 Must | **SP:** 3

- Configurar proyecto en Vercel (staging y producción).
- Configurar proyecto en Railway (API staging y producción).
- Configurar GitHub Actions para CI (lint + type-check + build en cada PR).
- Configurar GitHub Actions para deploy automático (main → staging, tag → producción).
- Documentar el proceso de deploy en README.

---

### TT-003 — Migraciones iniciales de base de datos
**Prioridad:** 🔴 Must | **SP:** 3

- Crear todas las tablas con Prisma Migrate (según el esquema en Plan_Tecnico.md).
- Crear índices de performance.
- Implementar Row Level Security en Supabase para ledger y audit_log.
- Crear datos semilla (seed) para desarrollo: 2 admins, 10 miembros de prueba, 5 SKUs de prueba.

---

### TT-004 — Integración con Facturapi (sandbox)
**Prioridad:** 🔴 Must | **SP:** 3

- Crear cuenta en Facturapi y obtener key de sandbox.
- Implementar el módulo de validación de CFDI usando el SDK de Facturapi para Node.js.
- Manejar los tres casos de respuesta: Vigente, Cancelada, No encontrada.
- Implementar reintentos automáticos con backoff exponencial (usando BullMQ) en caso de timeout.
- Escribir tests unitarios para los tres casos de respuesta.

---

### TT-005 — Integración con Cloudflare R2
**Prioridad:** 🔴 Must | **SP:** 2

- Crear bucket en Cloudflare R2 (staging y producción).
- Implementar el módulo de storage con AWS SDK v3.
- Funciones: `uploadFile`, `getSignedUrl`, `deleteFile`.
- Configurar CORS en el bucket para los dominios del portal.
- Escribir tests de integración para subida y descarga.

---

### TT-006 — Integración con Resend (email)
**Prioridad:** 🔴 Must | **SP:** 2

- Crear cuenta en Resend y verificar el dominio del remitente.
- Implementar plantillas con React Email para los 7 tipos de email.
- Crear el módulo de email en el backend con la lógica de envío.
- Escribir tests con el modo sandbox de Resend.

---

### TT-007 — Integración con Firebase FCM (push)
**Prioridad:** 🟡 Should | **SP:** 3

- Crear proyecto en Firebase y activar Cloud Messaging.
- Implementar el Service Worker en el frontend (`/public/firebase-messaging-sw.js`).
- Implementar el prompt de permiso al usuario en el primer login.
- Implementar la lógica de guardado y actualización del token FCM en la tabla `members`.
- Implementar el módulo de envío de push desde el backend con Firebase Admin SDK.

---

### TT-008 — Sistema de colas con Upstash + BullMQ
**Prioridad:** 🟡 Should | **SP:** 3

- Crear instancia de Redis en Upstash.
- Configurar BullMQ con la conexión de Upstash.
- Implementar las colas: `invoices`, `notifications`, `statements`.
- Implementar Workers para cada cola.
- Configurar el proceso batch nocturno para detección de puntos por vencer.

---

### TT-009 — Generación de PDFs (estados de cuenta)
**Prioridad:** 🟡 Should | **SP:** 3

- Evaluar librería de generación de PDF en Node.js (Puppeteer o @react-pdf/renderer).
- Implementar la plantilla del estado de cuenta mensual.
- Implementar el endpoint de descarga de PDF con los datos del ledger.
- Guardar el PDF generado en R2 para evitar regeneraciones frecuentes.

---

## Resumen de Prioridades

### 🔴 Must — Para el MVP (Fase 1 y 2)

| ID | Historia |
|---|---|
| US-001 | Registro de nuevo miembro |
| US-002 | Verificación por OTP |
| US-003 | Configuración de perfil |
| US-004 | Pantalla de bienvenida |
| US-005 | Login con Magic Link |
| US-006 | Cierre de sesión |
| US-007 | Dashboard del cliente |
| US-010 | Subida de factura XML |
| US-012 | Vista de facturas subidas |
| US-013 | Estado de cuenta con trazabilidad |
| US-015 | Ver catálogo de premios |
| US-016 | Detalle de un premio |
| US-017 | Flujo de canje |
| US-018 | Vista de mis canjes |
| US-021 | Selección de ubicación |
| US-023 | Cobertura geográfica (Admin) |
| US-026 | Dashboard admin |
| US-027 | Gestión de miembros |
| US-028 | Carga manual de puntos |
| US-030 | Cola de aprobación de facturas |
| US-031 | CRUD de catálogo |
| US-035 | Notificación de factura aprobada |
| US-039 | Roles en el sistema |
| US-041 | Ledger inmutable |
| TT-001 a TT-006 | Tareas técnicas base |

**Total Must: 25 historias + 6 tareas técnicas**

---

### 🟡 Should — Segundo ciclo (Fase 2 y 3)

US-008, US-009, US-011, US-014, US-019, US-020, US-022, US-024, US-025, US-029, US-032, US-033, US-034, US-036, US-037, US-038, US-040, TT-007, TT-008, TT-009

**Total Should: 17 historias + 3 tareas técnicas**

---

### Métricas de Estimación

| Prioridad | Historias | Story Points estimados | Tiempo estimado (1 dev) |
|---|---|---|---|
| 🔴 Must | 25 + 6 TT | ~95 SP | 10–12 semanas |
| 🟡 Should | 17 + 3 TT | ~65 SP | 7–8 semanas |
| **Total** | **51** | **~160 SP** | **17–20 semanas** |

> **Nota:** Las estimaciones asumen un equipo de 1 desarrollador full-stack senior. Con 2 desarrolladores trabajando en paralelo (frontend + backend), el MVP puede completarse en 6–8 semanas.
