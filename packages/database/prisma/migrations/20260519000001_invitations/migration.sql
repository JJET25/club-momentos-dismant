-- Tabla de invitaciones — acceso por invitación únicamente
CREATE TABLE "invitations" (
    "id"         TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    "token"      TEXT NOT NULL,
    "sent_by"    TEXT REFERENCES "members"("id") ON DELETE SET NULL,
    "used"       BOOLEAN NOT NULL DEFAULT false,
    "used_at"    TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
CREATE INDEX "invitations_email_idx" ON "invitations"("email");
