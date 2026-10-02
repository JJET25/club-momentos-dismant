-- Campos nuevos para captura manual/masiva de facturas (número de factura y pedido).
ALTER TABLE "invoices" ADD COLUMN "invoice_number" TEXT;
ALTER TABLE "invoices" ADD COLUMN "order_number" TEXT;

-- Las promociones ahora pueden ligarse a un premio del catálogo (reward_skus)
-- para jalar título/imagen/descripción de ahí en vez de capturarlos aparte.
ALTER TABLE "partner_promotions" ADD COLUMN "sku_id" TEXT;

ALTER TABLE "partner_promotions"
  ADD CONSTRAINT "partner_promotions_sku_id_fkey"
  FOREIGN KEY ("sku_id") REFERENCES "reward_skus"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
