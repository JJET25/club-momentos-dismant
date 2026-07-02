-- Permite suspender un aliado (deja de ser seleccionable en nuevas
-- promociones) sin borrarlo, preservando la trazabilidad de promociones
-- y SKUs de catálogo que ya lo referencian.
ALTER TABLE "partners" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
