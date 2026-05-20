-- ─────────────────────────────────────────────────────────────
-- Migración inicial — Club Momentos Dismant
-- Ejecutar completo en Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "location_state" TEXT NOT NULL,
    "location_city" TEXT NOT NULL,
    "invitation_code" TEXT,
    "fcm_token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" TEXT,
    "invoice_id" TEXT,
    "redemption_id" TEXT,
    "operator_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "uuid_cfdi" TEXT NOT NULL,
    "rfc_emisor" TEXT NOT NULL,
    "rfc_receptor" TEXT NOT NULL,
    "total_mxn" DECIMAL(12,2) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "points_generated" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sat_status" TEXT,
    "rejection_reason" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "xml_storage_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_skus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "points_cost" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_alert_threshold" INTEGER NOT NULL DEFAULT 10,
    "geo_type" TEXT NOT NULL DEFAULT 'national',
    "geo_states" TEXT[],
    "geo_cities" TEXT[],
    "is_digital" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "category" TEXT,
    "partner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_codes" (
    "id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "assigned_to" TEXT,
    "assigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "points_spent" INTEGER NOT NULL,
    "voucher_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "redemption_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "bonus_awarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_promotions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "destination_url" TEXT,
    "geo_type" TEXT NOT NULL DEFAULT 'national',
    "geo_states" TEXT[],
    "geo_cities" TEXT[],
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX "role_permissions_role_id_permission_key" ON "role_permissions"("role_id", "permission");
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");
CREATE UNIQUE INDEX "members_rfc_key" ON "members"("rfc");
CREATE INDEX "otp_tokens_email_expires_at_idx" ON "otp_tokens"("email", "expires_at");
CREATE INDEX "ledger_entries_member_id_created_at_idx" ON "ledger_entries"("member_id", "created_at" DESC);
CREATE INDEX "ledger_entries_type_idx" ON "ledger_entries"("type");
CREATE INDEX "ledger_entries_expires_at_idx" ON "ledger_entries"("expires_at");
CREATE UNIQUE INDEX "invoices_uuid_cfdi_key" ON "invoices"("uuid_cfdi");
CREATE INDEX "invoices_member_id_status_idx" ON "invoices"("member_id", "status");
CREATE INDEX "invoices_uuid_cfdi_idx" ON "invoices"("uuid_cfdi");
CREATE INDEX "reward_skus_geo_type_status_idx" ON "reward_skus"("geo_type", "status");
CREATE INDEX "digital_codes_sku_id_assigned_to_idx" ON "digital_codes"("sku_id", "assigned_to");
CREATE INDEX "redemptions_member_id_idx" ON "redemptions"("member_id");
CREATE UNIQUE INDEX "reviews_redemption_id_key" ON "reviews"("redemption_id");
CREATE INDEX "reviews_sku_id_idx" ON "reviews"("sku_id");
CREATE INDEX "partner_promotions_status_valid_until_idx" ON "partner_promotions"("status", "valid_until");
CREATE INDEX "audit_log_actor_id_created_at_idx" ON "audit_log"("actor_id", "created_at" DESC);
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "otp_tokens" ADD CONSTRAINT "otp_tokens_email_fkey" FOREIGN KEY ("email") REFERENCES "members"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reward_skus" ADD CONSTRAINT "reward_skus_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_codes" ADD CONSTRAINT "digital_codes_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "reward_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_codes" ADD CONSTRAINT "digital_codes_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "redemptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "reward_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "reward_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_promotions" ADD CONSTRAINT "partner_promotions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_promotions" ADD CONSTRAINT "partner_promotions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partner_promotions" ADD CONSTRAINT "partner_promotions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- RLS — Ledger y Auditoría solo permiten INSERT
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_select" ON "ledger_entries" FOR SELECT USING (true);
CREATE POLICY "ledger_insert" ON "ledger_entries" FOR INSERT WITH CHECK (true);

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select" ON "audit_log" FOR SELECT USING (true);
CREATE POLICY "audit_insert" ON "audit_log" FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- Tabla de control de migraciones para Prisma
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36) NOT NULL,
    "checksum"              VARCHAR(64) NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────
-- Seed — Roles del sistema
-- ─────────────────────────────────────────────────────────────
INSERT INTO "roles" ("id", "name") VALUES
  (gen_random_uuid()::text, 'owner'),
  (gen_random_uuid()::text, 'admin'),
  (gen_random_uuid()::text, 'employee'),
  (gen_random_uuid()::text, 'member');
