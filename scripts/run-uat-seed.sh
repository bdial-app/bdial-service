#!/usr/bin/env bash
# ============================================================
# Tijarah — Run UAT seed data
#
# Usage:
#   npm run db:seed:uat            # uses DIRECT_URL from .env
#   npm run db:seed:uat -- --dry   # preview only (no DB changes)
#
# WARNING: Deletes ALL existing data before seeding (via 00-reset.sql).
#          Do NOT run against production.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
UAT_DIR="$PROJECT_DIR/uat-data"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

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
  echo -e "${YELLOW}DDL may fail. Set DIRECT_URL (port 5432) in .env.${NC}"
  echo ""
fi

# ── UAT seed files in execution order ─────────────────────
UAT_FILES=(
  "00-reset.sql"
  "01-users.sql"
  "02-categories.sql"
  "03-providers.sql"
  "04-products.sql"
  "05-photos.sql"
  "06-verifications.sql"
  "07-reviews.sql"
  "08-bookings.sql"
  "09-conversations.sql"
  "10-saved.sql"
  "11-explore.sql"
  "12-reports-warnings.sql"
  "13-system.sql"
  "14-analytics.sql"
  "15-notifications.sql"
)

# ── Dry run mode ───────────────────────────────────────────
if [[ "${1:-}" == "--dry" ]]; then
  echo -e "${CYAN}=== DRY RUN — Files that would be executed ===${NC}"
  echo ""
  idx=1
  for file in "${UAT_FILES[@]}"; do
    full_path="$UAT_DIR/$file"
    if [[ -f "$full_path" ]]; then
      echo -e "  ${GREEN}[$idx]${NC} $file"
    else
      echo -e "  ${YELLOW}[$idx]${NC} $file ${YELLOW}(SKIPPED — not found)${NC}"
    fi
    ((idx++))
  done
  echo ""
  echo -e "${CYAN}Connection:${NC} ${DB_URL%%@*}@***"
  echo ""
  echo -e "${YELLOW}WARNING: This will DELETE all existing data before seeding.${NC}"
  exit 0
fi

# ── Safety confirmation ────────────────────────────────────
echo -e "${RED}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   WARNING: This will DELETE all existing data!   ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Database: ${CYAN}${DB_URL%%@*}@***${NC}"
echo ""
read -rp "Type 'yes' to continue: " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi
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
    exit 1
  fi
fi

# ── Node executor function ─────────────────────────────────
run_sql_via_node() {
  local sql_file="$1"
  local db_url="$2"
  > /tmp/tijarah_uat_err.log
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
  require('fs').writeFileSync('/tmp/tijarah_uat_err.log', e.message);
});
" 2>/dev/null || true
}

# ── Execute seed files ─────────────────────────────────────
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Tijarah — UAT Seed Runner                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=0
SKIPPED=0
SUCCESS=0
FAILED=0

for file in "${UAT_FILES[@]}"; do
  full_path="$UAT_DIR/$file"
  ((TOTAL++))

  if [[ ! -f "$full_path" ]]; then
    echo -e "  ${YELLOW}⊘${NC} $file ${YELLOW}(skipped — not found)${NC}"
    ((SKIPPED++))
    continue
  fi

  echo -ne "  ${CYAN}▶${NC} $file ... "

  if [[ "$USE_NODE" == "true" ]]; then
    run_sql_via_node "$full_path" "$DB_URL" || true
    if [[ -s /tmp/tijarah_uat_err.log ]]; then
      err_msg=$(cat /tmp/tijarah_uat_err.log | head -3)
      echo -e "${RED}✗${NC}"
      echo -e "    ${RED}${err_msg}${NC}"
      ((FAILED++))
    else
      echo -e "${GREEN}✓${NC}"
      ((SUCCESS++))
    fi
  else
    if psql "$DB_URL" -f "$full_path" -v ON_ERROR_STOP=1 --quiet 2>/tmp/tijarah_uat_err.log; then
      echo -e "${GREEN}✓${NC}"
      ((SUCCESS++))
    else
      echo -e "${RED}✗${NC}"
      echo -e "    ${RED}$(cat /tmp/tijarah_uat_err.log | head -5)${NC}"
      ((FAILED++))
    fi
  fi
done

echo ""
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo -e "  Total: $TOTAL  ${GREEN}Success: $SUCCESS${NC}  ${YELLOW}Skipped: $SKIPPED${NC}  ${RED}Failed: $FAILED${NC}"
echo -e "${CYAN}────────────────────────────────────────────────${NC}"

if [[ $FAILED -gt 0 ]]; then
  echo -e "${RED}Some files failed. Check errors above.${NC}"
  exit 1
fi

echo -e "${GREEN}UAT seed completed successfully!${NC}"
echo ""
echo -e "Key test accounts:"
echo -e "  Customer : +919900000001 (Ahmed)"
echo -e "  Provider : +919800000101 (Fatima's Tailoring)"
echo -e "  Admin    : +919876543210 (Ahmed Bhaisaheb)"
