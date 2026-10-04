#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Reconstruye desde cero la base de datos LOCAL (Supabase en Docker):
#   1. supabase db reset --local (borra SOLO la base local)
#   2. aplica las migraciones de Prisma del repo, en orden
#   3. verifica que el resultado sea idéntico a schema.prisma
#   4. registra las migraciones como aplicadas (para `db:migrate` local)
#   5. carga las cuentas de prueba (seed.sql)
#
# Nunca toca producción: todo va al contenedor/puerto locales.
# Uso (desde la raíz del repo):  bash scripts/local-db/bootstrap.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTAINER="supabase_db_club-momentos-local"
LOCAL_URL="postgresql://postgres:postgres@127.0.0.1:55322/postgres"
MIGRATIONS="$ROOT/packages/database/prisma/migrations"
DB_PKG="$ROOT/packages/database"

psql_local() { docker exec -i -e PGOPTIONS="-c client_min_messages=warning" "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "✗ Supabase local no está corriendo. Ejecuta primero: supabase start" >&2
  exit 1
fi

echo "→ Reseteando base local…"
(cd "$ROOT" && supabase db reset --local >/dev/null)

echo "→ Aplicando migraciones…"
for dir in "$MIGRATIONS"/*/; do
  name="$(basename "$dir")"
  psql_local < "$dir/migration.sql"
  echo "  ✓ $name"
done

echo "→ Verificando contra schema.prisma…"
cd "$DB_PKG"
export DATABASE_URL="$LOCAL_URL" DIRECT_URL="$LOCAL_URL"
if ! npx prisma migrate diff --from-url "$LOCAL_URL" --to-schema-datamodel prisma/schema.prisma --exit-code >/dev/null; then
  echo "✗ La base reconstruida no coincide con schema.prisma. Revisa con:" >&2
  echo "  npx prisma migrate diff --from-url $LOCAL_URL --to-schema-datamodel prisma/schema.prisma --script" >&2
  exit 1
fi

echo "→ Registrando migraciones como aplicadas…"
for dir in "$MIGRATIONS"/*/; do
  npx prisma migrate resolve --applied "$(basename "$dir")" >/dev/null
done

echo "→ Cargando cuentas de prueba…"
# La contraseña de las cuentas QA vive fuera del repo (.env.local, en .gitignore)
QA_ENV="$ROOT/scripts/local-db/.env.local"
if [ ! -f "$QA_ENV" ]; then
  echo "✗ Falta $QA_ENV — cópialo de .env.local.example y define QA_PASSWORD" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; . "$QA_ENV"; set +a
if [ -z "${QA_PASSWORD:-}" ]; then
  echo "✗ QA_PASSWORD está vacío en $QA_ENV" >&2
  exit 1
fi
PW_HASH="$(QA_PASSWORD="$QA_PASSWORD" node -e "console.log(require('bcryptjs').hashSync(process.env.QA_PASSWORD, 12))")"
psql_local -v pw_hash="$PW_HASH" < "$ROOT/scripts/local-db/seed.sql"

echo "→ Creando bucket de storage local…"
echo "INSERT INTO storage.buckets (id, name, public) VALUES ('club-momentos', 'club-momentos', false) ON CONFLICT (id) DO NOTHING;" | psql_local

echo "✓ Base local lista ($LOCAL_URL)"
