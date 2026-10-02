-- ─────────────────────────────────────────────────────────────
-- Pases de un solo uso y límite de intentos de inicio de sesión
-- ─────────────────────────────────────────────────────────────
-- auth_passes: la página de inicio (y el cambio de empresa desde el perfil)
-- no comparte cookies con los portales. Para llevar a alguien ya
-- autenticado a otro dominio se emite un pase de un solo uso que el
-- dominio destino canjea por su propia sesión. Solo se guarda el hash del
-- pase; caduca en segundos y se marca como usado al canjearlo.
--
-- login_attempts: intentos fallidos de inicio de sesión por correo e IP,
-- para frenar ataques de fuerza bruta.

CREATE TABLE "auth_passes" (
  "id"         TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "member_id"  TEXT NOT NULL,
  "purpose"    TEXT NOT NULL,            -- login | switch | magic_link
  "next_path"  TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_passes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_passes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "auth_passes_token_hash_key" ON "auth_passes"("token_hash");
CREATE INDEX "auth_passes_expires_at_idx" ON "auth_passes"("expires_at");
ALTER TABLE "auth_passes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "login_attempts" (
  "id"         TEXT NOT NULL,
  "key"        TEXT NOT NULL,            -- "email:<correo>" | "ip:<ip>"
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_attempts_key_created_at_idx" ON "login_attempts"("key", "created_at");
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;
