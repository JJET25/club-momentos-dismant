-- Fija el search_path de las funciones de trigger (aviso de seguridad de
-- Supabase "function_search_path_mutable"): con search_path vacío una
-- función no puede ser engañada creando objetos homónimos en otro schema.
-- Por eso las tablas se referencian calificadas con "public.".

CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries es inmutable: UPDATE y DELETE no están permitidos'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es inmutable: UPDATE y DELETE no están permitidos'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_promotion_affiliate()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  SELECT p."affiliate" INTO NEW."affiliate" FROM public."partners" p WHERE p."id" = NEW."partner_id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
