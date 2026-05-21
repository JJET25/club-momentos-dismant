-- ─────────────────────────────────────────────────────────────
-- Ledger inmutable — triggers que bloquean UPDATE y DELETE
-- ─────────────────────────────────────────────────────────────
-- Los triggers operan ANTES de la acción y la cancelan con una
-- excepción. Esto aplica incluso al service role de Supabase,
-- que sí bypasea RLS pero NO bypasea los triggers.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries es inmutable: UPDATE y DELETE no están permitidos'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_no_update
  BEFORE UPDATE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER ledger_no_delete
  BEFORE DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es inmutable: UPDATE y DELETE no están permitidos'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_no_update
  BEFORE UPDATE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER audit_no_delete
  BEFORE DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- ─────────────────────────────────────────────────────────────
-- Refuerzo RLS: asegurar que no existe política de UPDATE/DELETE
-- (por si alguna migración anterior las hubiera creado)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ledger_update" ON "ledger_entries";
DROP POLICY IF EXISTS "ledger_delete" ON "ledger_entries";
DROP POLICY IF EXISTS "audit_update"  ON "audit_log";
DROP POLICY IF EXISTS "audit_delete"  ON "audit_log";
