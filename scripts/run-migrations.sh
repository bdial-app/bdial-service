#!/usr/bin/env bash
# ============================================================
# Tijarah — Run all SQL migrations & seeds in correct order
#
# Usage:
#   npm run db:migrate            # uses DIRECT_URL from .env
#   npm run db:migrate -- --dry   # preview which files will run
#
# IMPORTANT: Uses DIRECT_URL (port 5432) NOT DATABASE_URL (PgBouncer 6543)
# because DDL, triggers, and CREATE EXTENSION require a direct connection.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Load .env ──────────────────────────────────────────────
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# ── Determine connection URL ───────────────────────────────
DB_URL="${DIRECT_URL:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo -e "${RED}ERROR: Neither DIRECT_URL nor DATABASE_URL is set.${NC}"
  echo "Set DIRECT_URL in .env (direct Postgres connection, not PgBouncer)."
  exit 1
fi

# Warn if using PgBouncer URL
if echo "$DB_URL" | grep -q "6543"; then
  echo -e "${YELLOW}WARNING: URL appears to use PgBouncer (port 6543).${NC}"
  echo -e "${YELLOW}DDL/triggers may fail. Set DIRECT_URL (port 5432) in .env.${NC}"
  echo ""
fi

# ── Migration files in execution order ─────────────────────
# Each entry: relative path from project root
SQL_FILES=(
  # 1. Search infrastructure (extensions, indexes, columns)
  "src/scripts/setup-search-indexes.sql"

  # 2. Schema migrations
  "migration-reviews-and-providers.sql"
  "migration-add-pause-archive.sql"
  "migration-reports.sql"
  "migration-bug-reports.sql"
  "migration-provider-disable-delete.sql"
  "migration-search-keywords.sql"
  "migration-admin-controls.sql"

  # 3. Search vectors (triggers, weighted tsvector, synonyms table)
  "migration-search-vectors.sql"

  # 4. Seed data
  "seed.sql"
  "seed-categories-keywords.sql"
  "seed-search-synonyms.sql"
  "seed-explore.sql"
  "seed-home.sql"
  "seed-uuid-remap.sql"

  # 5. Admin user
  "create-admin.sql"
)

# ── Dry run mode ───────────────────────────────────────────
if [[ "${1:-}" == "--dry" ]]; then
  echo -e "${CYAN}=== DRY RUN — Files that would be executed ===${NC}"
  echo ""
  idx=1
  for file in "${SQL_FILES[@]}"; do
    full_path="$PROJECT_DIR/$file"
    if [[ -f "$full_path" ]]; then
      echo -e "  ${GREEN}[$idx]${NC} $file"
    else
      echo -e "  ${YELLOW}[$idx]${NC} $file ${YELLOW}(SKIPPED — not found)${NC}"
    fi
    ((idx++))
  done
  echo ""
  echo -e "${CYAN}Connection:${NC} ${DB_URL%%@*}@***"
  exit 0
fi

# ── Execute migrations ─────────────────────────────────────
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Tijarah — Database Migration Runner            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Determine executor: psql or node fallback ──────────────
USE_NODE=false
if ! command -v psql &> /dev/null; then
  if command -v node &> /dev/null; then
    echo -e "${YELLOW}psql not found — using node pg fallback${NC}"
    echo ""
    USE_NODE=true
  else
    echo -e "${RED}ERROR: Neither psql nor node found.${NC}"
    echo "  Install psql:  brew install libpq && brew link --force libpq"
    echo "  Install node:  https://nodejs.org"
    exit 1
  fi
fi

# ── Node executor function ─────────────────────────────────
run_sql_via_node() {
  local sql_file="$1"
  local db_url="$2"
  > /tmp/tijarah_migration_err.log  # clear previous errors
  RUN_DB_URL="$db_url" RUN_SQL_FILE="$sql_file" node -e "
const pg = require('pg');
const fs = require('fs');
const client = new pg.Client({ connectionString: process.env.RUN_DB_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(async () => {
  const sql = fs.readFileSync(process.env.RUN_SQL_FILE, 'utf8');
  await client.query(sql);
  await client.end();
}).catch(async e => {
  await client.end().catch(function(){});
  require('fs').writeFileSync('/tmp/tijarah_migration_err.log', e.message);
});
" 2>/dev/null || true
}

TOTAL=0
SKIPPED=0
SUCCESS=0
FAILED=0

for file in "${SQL_FILES[@]}"; do
  full_path="$PROJECT_DIR/$file"
  ((TOTAL++))

  if [[ ! -f "$full_path" ]]; then
    echo -e "  ${YELLOW}⊘${NC} $file ${YELLOW}(skipped — not found)${NC}"
    ((SKIPPED++))
    continue
  fi

  echo -ne "  ${CYAN}▶${NC} $file ... "

  if [[ "$USE_NODE" == "true" ]]; then
    run_sql_via_node "$full_path" "$DB_URL" || true
    # Read exit code via error log presence
    if [[ -s /tmp/tijarah_migration_err.log ]]; then
      err_msg=$(cat /tmp/tijarah_migration_err.log | head -3)
      # Ignore idempotent errors
      if echo "$err_msg" | grep -qiE 'already exists|does not exist|duplicate|nothing to do|no changes'; then
        echo -e "${GREEN}✓${NC} (already applied)"
        ((SUCCESS++))
      else
        echo -e "${RED}✗${NC}"
        echo -e "    ${RED}${err_msg}${NC}"
        ((FAILED++))
      fi
    else
      echo -e "${GREEN}✓${NC}"
      ((SUCCESS++))
    fi
  else
    if psql "$DB_URL" -f "$full_path" -v ON_ERROR_STOP=1 --quiet 2>/tmp/tijarah_migration_err.log; then
      echo -e "${GREEN}✓${NC}"
      ((SUCCESS++))
    else
      echo -e "${RED}✗${NC}"
      echo -e "    ${RED}$(cat /tmp/tijarah_migration_err.log | head -5)${NC}"
      ((FAILED++))
    fi
  fi
done

echo ""
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo -e "  Total: $TOTAL  ${GREEN}Success: $SUCCESS${NC}  ${YELLOW}Skipped: $SKIPPED${NC}  ${RED}Failed: $FAILED${NC}"
echo -e "${CYAN}────────────────────────────────────────────────${NC}"

if [[ $FAILED -gt 0 ]]; then
  echo -e "${YELLOW}Some migrations failed. Check errors above.${NC}"
  echo -e "${YELLOW}Most are idempotent — re-run after fixing issues.${NC}"
  exit 1
fi

echo -e "${GREEN}All migrations completed successfully!${NC}"
