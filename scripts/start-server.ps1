# Start server helper
param()

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $root.Path

Write-Output "Starting local server helper from $($root.Path)"

function Open-Url($url) {
  Write-Output "Opening $url in default browser..."
  Start-Process $url
}

# Try live-server (global or npx)
try {
  Write-Output "Trying npx live-server..."
  $p = Start-Process -FilePath "npx" -ArgumentList "live-server --port=5500 --open=./frontend/index.html" -NoNewWindow -PassThru
  Write-Output "Started npx live-server (PID $($p.Id)). If it fails, cancel this task and try fallback."
  Exit 0
}
catch {
  Write-Output "npx live-server not available or failed: $_"
}

# Fallback to npx serve
try {
  Write-Output "Trying npx serve..."
  $p = Start-Process -FilePath "npx" -ArgumentList "serve frontend -l 5500 --single" -NoNewWindow -PassThru
  Write-Output "Started npx serve (PID $($p.Id))."
  Open-Url "http://localhost:5500"
  Exit 0
}
catch {
  Write-Output "npx serve failed: $_"
}

# Fallback to python
try {
  Write-Output "Trying Python HTTP server..."
  $frontendPath = Join-Path $root.Path 'frontend'
  if (Test-Path $frontendPath) {
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$frontendPath'; python -m http.server 5500" -NoNewWindow -PassThru | Out-Null
    Open-Url "http://localhost:5500"
    Exit 0
  }
  else {
    Write-Output "Frontend folder not found at $frontendPath"
  }
  Exit 0
}
catch {
  Write-Output "Python HTTP server failed: $_"
}

Write-Output "All start methods failed. Please ensure Node.js or Python is installed and in PATH."
Exit 1
