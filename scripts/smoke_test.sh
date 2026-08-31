#!/usr/bin/env bash
# Pre-flight smoke test for SIH26188, run after `docker compose up --build`.
#
# Hits /health, /preprocess, and /screen against the three demo samples and
# reports pass/fail for each, plus the key JSON fields worth eyeballing
# before a live demo (verdict, trust_score, compression_warning, region
# count). Exits non-zero if anything fails, so it's CI-friendly too.
#
# Usage:
#   ./scripts/smoke_test.sh
#   BASE_URL=http://localhost:8000 ./scripts/smoke_test.sh   # override host

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
API="${BASE_URL}/api/v1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAMPLES_DIR="${SCRIPT_DIR}/../samples"

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo "  ✅ $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  ❌ $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "This script needs 'jq' to parse JSON responses. Install it and re-run."
    echo "  macOS:  brew install jq"
    echo "  Debian: sudo apt-get install -y jq"
    exit 1
  fi
}

echo "=== SIH26188 Pre-Flight Smoke Test ==="
echo "Target: ${BASE_URL}"
echo ""

require_jq

if [ ! -d "$SAMPLES_DIR" ] || [ ! -f "${SAMPLES_DIR}/sample_clean.jpg" ]; then
  echo "Samples not found at ${SAMPLES_DIR} — run 'python scripts/seed_demo_samples.py' first."
  exit 1
fi

# --- 1. Health check --------------------------------------------------
echo "[1/4] GET ${API}/health"
health_response=$(curl -s -w "\n%{http_code}" "${API}/health")
health_status=$(echo "$health_response" | tail -n1)
health_body=$(echo "$health_response" | sed '$d')

if [ "$health_status" = "200" ] && echo "$health_body" | jq -e '.status == "ok"' >/dev/null 2>&1; then
  pass "Backend is healthy (${health_body})"
else
  fail "Health check failed (HTTP ${health_status}): ${health_body}"
  echo ""
  echo "Backend isn't responding correctly — stopping here rather than"
  echo "running the rest of the checks against a broken backend."
  exit 1
fi
echo ""

# --- 2. Preprocess endpoint --------------------------------------------
echo "[2/4] POST ${API}/preprocess (sample_clean.jpg)"
preprocess_response=$(curl -s -w "\n%{http_code}" -X POST "${API}/preprocess" \
  -F "file=@${SAMPLES_DIR}/sample_clean.jpg;type=image/jpeg")
preprocess_status=$(echo "$preprocess_response" | tail -n1)
preprocess_body=$(echo "$preprocess_response" | sed '$d')

if [ "$preprocess_status" = "200" ]; then
  crop_method=$(echo "$preprocess_body" | jq -r '.crop_method')
  pass "Preprocess returned 200, crop_method=${crop_method}"
else
  fail "Preprocess failed (HTTP ${preprocess_status}): ${preprocess_body}"
fi
echo ""

# --- 3. Screen endpoint, one call per sample ----------------------------
run_screen_check() {
  local filename="$1"
  local expect_regions="$2"       # "yes" | "no" | "any"
  local expect_compression="$3"   # "true" | "false"

  echo "[3/4] POST ${API}/screen (${filename})"
  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "${API}/screen" \
    -F "id_document=@${SAMPLES_DIR}/${filename};type=image/jpeg")
  local status body
  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status" != "200" ]; then
    fail "${filename}: /screen failed (HTTP ${status}): ${body}"
    return
  fi

  local verdict trust_score tamper_score region_count compression_warning
  verdict=$(echo "$body" | jq -r '.result.verdict')
  trust_score=$(echo "$body" | jq -r '.result.trust_score')
  tamper_score=$(echo "$body" | jq -r '.ela.tamper_score')
  region_count=$(echo "$body" | jq -r '.ela.suspicious_regions | length')
  compression_warning=$(echo "$body" | jq -r '.ela.compression_warning')

  echo "     verdict=${verdict} trust_score=${trust_score} tamper_score=${tamper_score} regions=${region_count} compression_warning=${compression_warning}"

  local ok=true
  if [ "$expect_regions" = "yes" ] && [ "$region_count" -eq 0 ]; then
    ok=false
    echo "     ⚠ expected at least one flagged region, got 0"
  fi
  if [ "$expect_regions" = "no" ] && [ "$region_count" -ne 0 ]; then
    ok=false
    echo "     ⚠ expected zero flagged regions, got ${region_count}"
  fi
  if [ "$expect_compression" != "any" ] && [ "$compression_warning" != "$expect_compression" ]; then
    ok=false
    echo "     ⚠ expected compression_warning=${expect_compression}, got ${compression_warning}"
  fi

  if [ "$ok" = "true" ]; then
    pass "${filename}: response shape matches expectations"
  else
    fail "${filename}: response did not match expectations (see ⚠ above)"
  fi
}

run_screen_check "sample_clean.jpg" "no" "false"
echo ""
run_screen_check "sample_tampered_dob.jpg" "yes" "false"
echo ""
run_screen_check "sample_whatsapp_forward.jpg" "any" "true"
echo ""

# --- 4. Frontend reachability (best-effort, doesn't fail the suite) -----
echo "[4/4] GET http://localhost:5173 (frontend)"
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173" || echo "000")
if [ "$frontend_status" = "200" ]; then
  pass "Frontend dev server is reachable"
else
  echo "  ⚠  Frontend not reachable at :5173 (HTTP ${frontend_status}) — not counted as a failure,"
  echo "     since it may not be started yet, but check before the live demo."
fi
echo ""

echo "=== Summary: ${PASS_COUNT} passed, ${FAIL_COUNT} failed ==="
if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
