#!/usr/bin/env bash
# Teste les migrations sur un Postgres local jetable (PGHOST, PGPORT, PGUSER, PGPASSWORD).
# Sort en erreur au premier contrôle qui échoue.
set -euo pipefail
cd "$(dirname "$0")/.."
psql -q -d postgres -c 'drop database if exists strata_test' -c 'create database strata_test' 2>/dev/null
migrations=()
for f in migrations/*.sql; do migrations+=(-f "$f"); done
psql -q -X -d strata_test -v ON_ERROR_STOP=1 \
  -f tests/stub_supabase.sql "${migrations[@]}" -f seed.sql -f tests/scenario.sql -f tests/conformite.sql 2>&1 \
  | grep -E "ERROR|ÉCHEC|OK :"
