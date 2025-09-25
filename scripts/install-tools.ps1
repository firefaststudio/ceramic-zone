Write-Host "🚀 Installazione Poppler e Tesseract in corso..."

$tempDir = "$env:TEMP\ocr-tools"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Poppler
$popplerUrl = "https://github.com/oschwartz10612/poppler-windows/releases/download/v24.02.0-0/Release-24.02.0-0.zip"
$popplerZip = "$tempDir\poppler.zip"
Invoke-WebRequest -Uri $popplerUrl -OutFile $popplerZip
Expand-Archive -Path $popplerZip -DestinationPath "C:\poppler" -Force
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\poppler\Library\bin", [EnvironmentVariableTarget]::Machine)

# Tesseract
$tesseractUrl = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.4.20240506/tesseract-ocr-w64-setup-5.3.4.20240506.exe"
$tesseractExe = "$tempDir\tesseract-installer.exe"
Invoke-WebRequest -Uri $tesseractUrl -OutFile $tesseractExe
Start-Process -FilePath $tesseractExe -ArgumentList "/SILENT" -Wait

Write-Host "✅ Installazione completata!"
