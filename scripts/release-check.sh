#!/usr/bin/env bash
# Release preflight for Resonance.
#   1) Verifies the cache-busting version is identical across app.bundle.js,
#      sw.js and index.html (catches the classic "forgot to bump one" bug).
#   2) If a Capacitor iOS project exists, syncs the current web assets into it
#      so the App Store build never drifts from the live Cloudflare version
#      (iOS-plan Крок 1). Safe to run for web-only releases — it just skips.
set -euo pipefail
cd "$(dirname "$0")/.."

ht=$(grep -oE 'Ht="[0-9]+"' app.bundle.js | head -1 | grep -oE '[0-9]+' || true)
sw=$(grep -oE 'VERSION = "[0-9]+"' sw.js | grep -oE '[0-9]+' || true)
idx=$(grep -oE 'v=[0-9]+' index.html | grep -oE '[0-9]+' | sort -u)

echo "app.bundle.js : ${ht:-<none>}"
echo "sw.js         : ${sw:-<none>}"
echo "index.html    : ${idx:-<none>}"

if [ -z "$ht" ] || [ -z "$sw" ] || [ -z "$idx" ]; then
  echo "ERROR: could not read a version from one of the files." >&2; exit 1
fi
if [ "$(printf '%s\n' "$idx" | wc -l | tr -d ' ')" -ne 1 ]; then
  echo "ERROR: index.html has more than one distinct ?v= version." >&2; exit 1
fi
if [ "$ht" != "$sw" ] || [ "$ht" != "$idx" ]; then
  echo "ERROR: version mismatch — bump all three to the same value before releasing." >&2; exit 1
fi
echo "OK: version $ht consistent across all three files."

if [ -d ios ] && command -v npx >/dev/null 2>&1; then
  echo "Capacitor iOS project found - syncing web assets into the native build..."
  npx cap copy ios
  echo "OK: iOS web assets synced. Now bump the app version in Xcode and archive."
else
  echo "No Capacitor iOS project yet - web-only release (nothing to sync)."
fi
