# i18n coverage gate for Resonance.
# Lists every Cyrillic UI string literal in app.bundle.js that is NOT covered by
# i18n/ru.json (exact key) or a rule in i18n/patterns.json. Run this after any
# code change that touches user-facing text — a clean run means EN/RU are complete.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File i18n/check-i18n.ps1
#
# What it deliberately ignores:
#   - the assistant's k:[...] matcher tokens (never displayed)
#   - concatenation fragments (leading/trailing space) — those render as whole
#     nodes handled by patterns.json, so check them there if a pattern is missing
#   - a small allow-list of user data / native language labels (see $skip below)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = [int]::MaxValue

$s   = [System.IO.File]::ReadAllText("$root\app.bundle.js", $utf8)
$ru  = $ser.DeserializeObject([System.IO.File]::ReadAllText("$root\i18n\ru.json", $utf8))
$pat = $ser.DeserializeObject([System.IO.File]::ReadAllText("$root\i18n\patterns.json", $utf8))

$cyr = [regex]'[Ѐ-ӿ]'
$regexes = @(); foreach ($p in $pat) { $regexes += [regex]$p.p }

# assistant matcher tokens: k:["...","..."] — internal, never rendered
$excl = @{}
foreach ($m in [regex]::Matches($s, 'k:\[(?:"(?:[^"\\]|\\.)*"(?:,)?)+\]')) {
  foreach ($sm in [regex]::Matches($m.Value, '"((?:[^"\\]|\\.)*)"')) { $excl[$sm.Groups[1].Value] = $true }
}

# known non-translatable: native language labels + gender codes (user data)
$skip = @{ 'Українська'=$true; 'Русский'=$true; 'ч'=$true; 'ж'=$true; 'Р'=$true; 'р.'=$true }

$rx = [regex]'"(?:[^"\\]|\\.)*"'; $seen = @{}
$missing = New-Object System.Collections.Generic.List[string]
foreach ($m in $rx.Matches($s)) {
  $inner = $m.Value.Substring(1, $m.Value.Length - 2)
  if (-not $cyr.IsMatch($inner)) { continue }
  $val = $inner -replace '\\"', '"' -replace '\\\\', '\'
  if ($seen.ContainsKey($val)) { continue }; $seen[$val] = $true
  if ($ru.ContainsKey($val)) { continue }
  if ($excl.ContainsKey($val)) { continue }
  if ($skip.ContainsKey($val)) { continue }
  if ($val.StartsWith(' ') -or $val.EndsWith(' ') -or $val.EndsWith('«') -or $val.StartsWith('».')) { continue } # fragment -> patterns.json
  $hit = $false; foreach ($re in $regexes) { if ($re.IsMatch($val)) { $hit = $true; break } }
  if ($hit) { continue }
  $missing.Add($val)
}

Write-Host "i18n keys: $($ru.Count)  |  patterns: $($pat.Count)"
if ($missing.Count -eq 0) {
  Write-Host "OK - every displayed Cyrillic string is covered." -ForegroundColor Green
} else {
  Write-Host "UNCOVERED ($($missing.Count)) - add to i18n/ru.json + en.json (or a pattern):" -ForegroundColor Yellow
  foreach ($x in $missing) { Write-Host "  - $x" }
}
