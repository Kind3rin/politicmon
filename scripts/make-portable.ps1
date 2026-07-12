$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root "dist"
$portableDir = Join-Path $root "portable-build"
$releaseDir = Join-Path $root "releases"
$zipPath = Join-Path $releaseDir "politicmon-portable-web.zip"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

Set-Location $root
npm run build

New-Item -ItemType Directory -Force -Path $releaseDir, $portableDir | Out-Null
$portableResolved = Resolve-Path $portableDir
if (-not $portableResolved.Path.StartsWith($root.Path)) {
  throw "Percorso portable-build non sicuro: $($portableResolved.Path)"
}
Get-ChildItem -LiteralPath $portableResolved.Path -Force | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $dist "*") -Destination $portableResolved.Path -Recurse -Force

$launcher = @'
@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
'@

$server = @'
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$port = 8765
while ($port -lt 8785) {
  try { $listener.Prefixes.Add("http://127.0.0.1:$port/"); $listener.Start(); break }
  catch { $listener.Prefixes.Clear(); $port++ }
}
if (-not $listener.IsListening) { throw "Nessuna porta locale disponibile." }
Start-Process "http://127.0.0.1:$port/"
Write-Host "POLITICMON avviato. Lascia aperta questa finestra; CTRL+C per chiudere."
$mime = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8"; ".json"="application/json"; ".webmanifest"="application/manifest+json"; ".png"="image/png"; ".svg"="image/svg+xml"; ".mp4"="video/mp4" }
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
    if (-not $relative) { $relative = "index.html" }
    $candidate = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (-not $candidate.StartsWith([IO.Path]::GetFullPath($root)) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $context.Response.StatusCode = 404; $context.Response.Close(); continue
    }
    $bytes = [IO.File]::ReadAllBytes($candidate)
    $ext = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
    $contentType = $mime[$ext]
    if (-not $contentType) { $contentType = "application/octet-stream" }
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally { $listener.Stop(); $listener.Close() }
'@

$readme = @'
POLITICMON - VERSIONE PORTABLE WINDOWS

1. Estrai tutto lo ZIP in una cartella.
2. Fai doppio clic su AVVIA_POLITICMON.bat.
3. Lascia aperta la finestra nera mentre giochi.

Non servono Node.js, installazione o connessione Internet.
Il piccolo server locale è necessario perché i browser bloccano i moduli di gioco
aperti direttamente da file. I salvataggi restano nel browser del dispositivo.
'@

[IO.File]::WriteAllText((Join-Path $portableDir "AVVIA_POLITICMON.bat"), $launcher, $utf8NoBom)
[IO.File]::WriteAllText((Join-Path $portableDir "server.ps1"), $server, $utf8NoBom)
[IO.File]::WriteAllText((Join-Path $portableDir "README.txt"), $readme, $utf8NoBom)

if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -Path (Join-Path $portableDir "*") -DestinationPath $zipPath -Force
Write-Host "Creato: $zipPath"
