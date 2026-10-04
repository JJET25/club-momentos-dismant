-- ─────────────────────────────────────────────────────────────
-- Configuración de cuenta (opcionales)
--  1. session_version: se incrementa al cambiar/restablecer la contraseña o
--     al pedir "cerrar sesión en otros dispositivos". El JWT lleva la
--     versión con la que se emitió (claim `sv`) y getSession() rechaza las
--     que ya no coinciden. Las sesiones previas (sin `sv`) cuentan como 0.
--  2. push_enabled: el miembro puede apagar las notificaciones push; si es
--     false no se registra token FCM ni se le envían pushes.
-- Aditiva: el código anterior ignora ambas columnas.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "members"
  ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "push_enabled"    BOOLEAN NOT NULL DEFAULT true;
