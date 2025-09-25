<#
Simple staging deploy script (Windows PowerShell)
Usage: .\scripts\deploy_staging.ps1 -OutDir Z:\staging\marketplace-backend -EnvFile .env.staging
#>
param(
  [string]$OutDir = "$PWD\staging",
  [string]$EnvFile = ".env.staging"
)

Write-Host "Preparing staging deploy in: $OutDir"
if (-Not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

Write-Host "Copying repo files (package.json, scripts, reports)..."
# minimal copy
Get-ChildItem -Path . -Include package.json, package-lock.json -File | ForEach-Object { Copy-Item $_.FullName -Destination $OutDir -Force }
Copy-Item -Path scripts -Destination $OutDir -Recurse -Force
Copy-Item -Path reports -Destination $OutDir -Recurse -Force

Write-Host "Installing npm dependencies in staging (may take a while)..."
Push-Location $OutDir
if (Test-Path package-lock.json) { npm ci } else { npm install }

# copy env
if (Test-Path $EnvFile) {
  Copy-Item $EnvFile -Destination (Join-Path $OutDir ".env") -Force
  Write-Host "Copied env file to staging"
}
else {
  Write-Host "Env file $EnvFile not found — remember to set SUPABASE/RESEND/SLACK keys before test"
}

Write-Host "Staging deploy prepared. To run pilot test:" 
Write-Host "  node ./scripts/auto_export.mjs reports/test_samples/sample_pilot.csv --project PilotProject --out-dir reports/staging_output --email your@team.com --qr-url https://example.com/pilot"

Pop-Location
