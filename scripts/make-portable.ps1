$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root "dist"
$portableDir = Join-Path $root "portable-build"
$releaseDir = Join-Path $root "releases"
$zipPath = Join-Path $releaseDir "politicmon-portable-web.zip"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

Set-Location $root
npm run build

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
New-Item -ItemType Directory -Force -Path $portableDir | Out-Null

$portableResolved = Resolve-Path $portableDir
if (-not $portableResolved.Path.StartsWith($root.Path)) {
  throw "Percorso portable-build non sicuro: $($portableResolved.Path)"
}
Get-ChildItem -LiteralPath $portableResolved.Path -Force | Remove-Item -Recurse -Force

$indexPath = Join-Path $dist "index.html"
$indexHtml = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
$cssMatch = [regex]::Match($indexHtml, '<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>')
$jsMatch = [regex]::Match($indexHtml, '<script type="module"[^>]*src="([^"]+)"[^>]*></script>')

if (-not $cssMatch.Success -or -not $jsMatch.Success) {
  throw "Impossibile trovare asset CSS/JS nella build Vite."
}

$cssRel = $cssMatch.Groups[1].Value.TrimStart(".", "/")
$jsRel = $jsMatch.Groups[1].Value.TrimStart(".", "/")
$css = [System.IO.File]::ReadAllText((Join-Path $dist $cssRel), [System.Text.Encoding]::UTF8)
$js = [System.IO.File]::ReadAllText((Join-Path $dist $jsRel), [System.Text.Encoding]::UTF8)

$singleHtml = $indexHtml
$singleHtml = [regex]::Replace($singleHtml, '\s*<link rel="manifest"[^>]*>\r?\n?', "`n")
$singleHtml = [regex]::Replace($singleHtml, '\s*<link rel="icon"[^>]*>\r?\n?', "`n")
$singleHtml = [regex]::Replace(
  $singleHtml,
  '<link rel="stylesheet"[^>]*href="[^"]+"[^>]*>',
  { param($match) "<style>`n$css`n</style>" }
)
$singleHtml = [regex]::Replace(
  $singleHtml,
  '<script type="module"[^>]*src="[^"]+"[^>]*></script>',
  { param($match) "<script type=`"module`">`n$js`n</script>" }
)

$readme = @"
POLITICMON - VERSIONE PORTABLE

Come si avvia:
1. Estrai tutto lo zip in una cartella.
2. Apri Politicmon.html con Chrome, Edge o Firefox.

Non serve installare Node.js e non serve avviare un server.

Note:
- I salvataggi restano nel browser e nel dispositivo usato.
- Per giocare da telefono, invia il file al telefono oppure caricalo su un hosting statico.
"@

[System.IO.File]::WriteAllText((Join-Path $portableDir "Politicmon.html"), $singleHtml, $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $portableDir "README.txt"), $readme, $utf8NoBom)

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $portableDir "*") -DestinationPath $zipPath -Force
Write-Host "Creato: $zipPath"
