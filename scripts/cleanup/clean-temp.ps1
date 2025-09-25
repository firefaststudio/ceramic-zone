# Cleanup temporary and test artifacts for Ceramic Zone repo
$files = @(
  'server.log',
  'server.err.log',
  'server.out.log',
  'lighthouse-report.report.html',
  'lighthouse-report.report.json',
  'tmp_news.json',
  'tmp_homepage.html',
  'homepage.html',
  'weird.json',
  'weird2.json',
  'test.json',
  'tmp/get_puppeteer_path.mjs',
  'tmp/run_lighthouse_with_puppeteer.mjs',
  'tmp/check_http.mjs'
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

foreach ($f in $files) {
  $p = Join-Path $root $f
  if (Test-Path $p) {
    try {
      Remove-Item $p -Force -Recurse
      Write-Host "Removed: $p"
    }
    catch {
      Write-Warning "Failed to remove: $p => $_"
    }
  }
  else {
    Write-Host "Not found (skipped): $p"
  }
}

Write-Host "Cleanup finished. Review changes and commit if desired."
