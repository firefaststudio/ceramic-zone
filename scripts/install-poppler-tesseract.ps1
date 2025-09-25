# PowerShell script to install Poppler and Tesseract on Windows (uses Chocolatey if available)
# Requires: Administrator privileges

function Install-With-Choco {
  choco install -y poppler tesseract
}

function Install-ManualPoppler {
  Write-Host "Downloading Poppler..."
  $url = 'https://github.com/oschwartz10612/poppler-windows/releases/download/v22.12.0/Release-22.12.0.zip'
  $out = "$env:TEMP\poppler.zip"
  Invoke-WebRequest -Uri $url -OutFile $out
  $extract = "$env:ProgramFiles\poppler"
  Expand-Archive -LiteralPath $out -DestinationPath $extract -Force
  $bin = Join-Path $extract 'Release-22.12.0\bin'
  $env:Path += ";$bin"
  Write-Host "Poppler installed to $extract. Ensure $bin is in PATH."
}

function Install-ManualTesseract {
  Write-Host "Downloading Tesseract..."
  $url = 'https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-v5.3.0.20221204.exe'
  $out = "$env:TEMP\tesseract-setup.exe"
  Invoke-WebRequest -Uri $url -OutFile $out
  Start-Process -FilePath $out -Wait
  Write-Host "Tesseract installer completed."
}

# Try Chocolatey first
if (Get-Command choco -ErrorAction SilentlyContinue) {
  Write-Host "Chocolatey found, installing via choco..."
  Install-With-Choco
}
else {
  Write-Host "Chocolatey not found. Installing manually..."
  Install-ManualPoppler
  Install-ManualTesseract
}

Write-Host "Done. You may need to restart your terminal for PATH changes to apply."
