#!/usr/bin/env bash
# Static smoke test (RISK plan §5.2).
# `node --check` only proves syntax; this asserts BEHAVIOURAL invariants that
# real incidents tripped over (white page from a renamed helper, the
# chat→translate icon regression, version drift, demo isolation). No browser
# needed — these are structural greps + a syntax check. Run before every deploy.
set -u
cd "$(dirname "$0")/.."
fail=0
ok(){ echo "  ok   $1"; }
bad(){ echo "  FAIL $1"; fail=1; }
has(){ grep -q -- "$1" app.bundle.js; }

echo "smoke: syntax"
if node --check app.bundle.js 2>/dev/null; then ok "app.bundle.js parses"; else bad "app.bundle.js syntax"; fi

echo "smoke: cache version consistent"
if bash scripts/release-check.sh >/dev/null 2>&1; then ok "version matches across 3 files"; else bad "version mismatch (release-check)"; fi

echo "smoke: demo isolation"
has "__rsDemoClient" && ok "__rsDemoClient present" || bad "__rsDemoClient missing (demo would hit prod)"
has "__rsDemoNudge" && ok "__rsDemoNudge present" || bad "__rsDemoNudge missing"

echo "smoke: paywall / entitlement wired"
has "__rsEntitled(" && ok "__rsEntitled present" || bad "__rsEntitled missing"
has "__rsPaywall(" && ok "__rsPaywall present" || bad "__rsPaywall missing"

echo "smoke: core render entrypoints"
for fn in "function Xn(" "function ki(" "function __rsYogaPage(" "function ci("; do
  has "$fn" && ok "$fn" || bad "$fn missing (route renderer gone)"
done

echo "smoke: icon map sanity (Phosphor nf + no chat/translate regression)"
has "function nf(" && ok "nf() builder present" || bad "nf() missing"
has "chat:()=>nf(" && ok "chat glyph present" || bad "chat glyph missing"
has "lang:()=>nf(" && ok "lang glyph present (translate lives here, not chat)" || bad "lang glyph missing"
# M keys must be unique (a dup silently overrides an icon)
dupes=$(grep -oE '[A-Za-z0-9_]+:\(\)=>nf\(' app.bundle.js | sed 's/:.*//' | sort | uniq -d | tr '\n' ' ')
[ -z "$dupes" ] && ok "M icon keys unique" || bad "duplicate M icon keys: $dupes"

echo "smoke: yoga data present"
has "__rsYoga=" && ok "__rsYoga map present" || bad "__rsYoga missing"

echo
if [ "$fail" -eq 0 ]; then echo "SMOKE OK"; else echo "SMOKE FAILED"; fi
exit $fail
