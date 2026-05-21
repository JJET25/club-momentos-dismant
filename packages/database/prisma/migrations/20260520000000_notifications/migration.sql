-- Tabla de notificaciones in-app
CREATE TABLE "notifications" (
    "id"         TEXT NOT NULL,
    "member_id"  TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
    "type"       TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "metadata"   JSONB,
    "read_at"    TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_member_id_created_at_idx" ON "notifications"("member_id", "created_at" DESC);
