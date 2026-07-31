# Servidor local simples para o dashboard
$port = 5500
$root = $PSScriptRoot
$url = "http://localhost:$port/"

Write-Host ""
Write-Host "  Dashboard Gestao de Condominio" -ForegroundColor Cyan
Write-Host "  Abrindo $url" -ForegroundColor Green
Write-Host "  Pressione Ctrl+C para encerrar." -ForegroundColor DarkGray
Write-Host ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try {
  $listener.Start()
} catch {
  Write-Host "Nao foi possivel iniciar na porta $port. Tentando 5501..." -ForegroundColor Yellow
  $port = 5501
  $url = "http://localhost:$port/"
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add($url)
  $listener.Start()
}

Start-Process $url

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $reqPath = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($reqPath)) { $reqPath = "index.html" }

  $full = Join-Path $root $reqPath
  $full = [System.IO.Path]::GetFullPath($full)

  if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    $ctx.Response.StatusCode = 403
    $ctx.Response.Close()
    continue
  }

  if (-not (Test-Path $full -PathType Leaf)) {
    $ctx.Response.StatusCode = 404
    $bytes = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
    continue
  }

  $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
  $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}
