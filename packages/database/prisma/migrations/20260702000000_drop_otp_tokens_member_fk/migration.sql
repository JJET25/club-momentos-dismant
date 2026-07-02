-- El OTP se usa para verificar el correo de invitados ANTES de que exista su
-- registro de Member (flujo de registro nuevo). La FK exigía que el email ya
-- fuera miembro, por lo que el INSERT fallaba silenciosamente para todo
-- registro nuevo y la verificación de OTP siempre reportaba "código inválido
-- o expirado" aunque el código fuera correcto.

ALTER TABLE "otp_tokens" DROP CONSTRAINT IF EXISTS "otp_tokens_email_fkey";
