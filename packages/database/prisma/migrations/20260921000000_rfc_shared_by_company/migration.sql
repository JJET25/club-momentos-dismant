-- El RFC ahora es único por empresa, no por miembro: varios usuarios de la
-- misma empresa pueden registrarse compartiendo el mismo RFC.
-- Se quita el unique constraint y se reemplaza por un índice normal para
-- mantener el rendimiento de las búsquedas/joins existentes por rfc.

DROP INDEX "members_rfc_key";

CREATE INDEX "members_rfc_idx" ON "members"("rfc");
