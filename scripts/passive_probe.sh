#!/usr/bin/env bash
# Passive, read-only evidence collector for https://www.cynbit.in
#
# What it does (and only this):
#   * Anonymous GET/HEAD requests to publicly linked pages, robots.txt,
#     sitemap.xml, /.well-known/security.txt and ONE non-existent URL.
#   * Saves response headers, bodies (HTML only, for listed pages), and
#     curl timing fields for each request.
#   * Waits at least 2 seconds between requests and appends every request
#     to evidence/request-log.txt.
#
# What it does NOT do:
#   * No form submissions, logins, fuzzing, brute-forcing, port scans,
#     scanners, payload injection, load testing, or parallel requests.
#   * No guessing of non-public paths or API endpoints.
#   * No credentials of any kind are used or stored.
#
# Usage:
#   bash scripts/passive_probe.sh
#   (run from the repository root; output goes to evidence/)
#
# Reproducibility note: the URL list below is the list that was actually
# collected for this audit (publicly linked pages found from the homepage
# plus robots/sitemap/security.txt and one 404 probe). If the site changes,
# edit URLS and re-run; the request log will show the new count.

set -u
cd "$(dirname "$0")/.." || exit 1

UA="passive-audit/1.0 (internship assessment; contact: <my email placeholder>)"
BASE="https://www.cynbit.in"

# Pages that are publicly linked from the site (verified from homepage HTML
# during collection; see docs/01-scope-and-methodology.md for the link map).
URLS=(
  "$BASE/"
  "$BASE/contact"
  "$BASE/careers"
  "$BASE/services"
  "$BASE/products"
  "$BASE/bitelevate"
  "$BASE/robots.txt"
  "$BASE/sitemap.xml"
)

mkdir -p evidence/headers evidence/html evidence/timings
LOG="evidence/request-log.txt"
: > "$LOG"

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >> "$LOG"; }

slug() {
  # Turn a URL path into a safe filename stem.
  local p="${1#"$BASE"}"
  p="${p#/}"
  if [ -z "$p" ]; then p="home"; fi
  printf '%s' "$p" | tr '/.' '__'
}

fetch() {
  # $1 = URL, $2 = stem, $3 = follow-redirects (L or empty)
  local url="$1" stem="$2" follow="$3"
  local flag=""
  [ "$follow" = "L" ] && flag="-L"
  # shellcheck disable=SC2086
  curl -sS $flag --compressed -A "$UA" \
    -D "evidence/headers/${stem}.headers.txt" \
    -o "evidence/html/${stem}.html" \
    -w 'url=%{url_effective}\nhttp_code=%{http_code}\nhttp_version=%{http_version}\nsize_download=%{size_download}\ntime_namelookup=%{time_namelookup}\ntime_connect=%{time_connect}\ntime_appconnect=%{time_appconnect}\ntime_pretransfer=%{time_pretransfer}\ntime_starttransfer=%{time_starttransfer}\ntime_total=%{time_total}\nnum_redirects=%{num_redirects}\nredirect_url=%{redirect_url}\n' \
    "$url" > "evidence/timings/${stem}.timing.txt" 2> "evidence/timings/${stem}.error.txt" \
    || echo "curl failed for $url (see evidence/timings/${stem}.error.txt)"
  log "GET $url -> evidence/headers/${stem}.headers.txt evidence/html/${stem}.html evidence/timings/${stem}.timing.txt"
}

# --- Redirect chain checks (no body, headers only) -------------------------
for url in "http://cynbit.in/" "http://www.cynbit.in/" "https://cynbit.in/"; do
  stem="redirect-$(printf '%s' "$url" | tr ':/.' '___')"
  curl -sS -A "$UA" -D "evidence/headers/${stem}.headers.txt" -o /dev/null "$url" \
    || echo "curl failed for $url"
  log "GET (no follow) $url -> evidence/headers/${stem}.headers.txt"
  sleep 2
done

# --- Main pages, 3 spaced repeats each (cold vs warm / cache behaviour) ----
for url in "${URLS[@]}"; do
  stem="$(slug "$url")"
  for i in 1 2 3; do
    fetch "$url" "${stem}-r${i}" "L"
    sleep 2
  done
done

# --- One non-existent URL, to observe 404 behaviour only -------------------
fetch "$BASE/this-page-does-not-exist-audit-404" "not-found-404" "L"
sleep 2

# --- security.txt (single GET) ----------------------------------------------
curl -sS -A "$UA" -D "evidence/headers/security-txt.headers.txt" \
  -o "evidence/html/security-txt.txt" "$BASE/.well-known/security.txt" \
  || echo "security.txt request failed"
log "GET $BASE/.well-known/security.txt -> evidence/headers/security-txt.headers.txt"
sleep 2

echo "Done. Request log: $LOG"
wc -l "$LOG"
echo "NOTE: browser-load (HAR) and Lighthouse runs, if used, must be appended"
echo "to the same log by hand so the total request count stays honest."
