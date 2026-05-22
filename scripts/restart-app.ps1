$ErrorActionPreference = 'Continue'

$projectDir = Split-Path -Parent $PSScriptRoot

# Найти node-процессы, чей рабочий каталог — наш проект, и убить только их.
# Не трогаем системные/служебные node (например, harness).
$candidates = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine -match 'elektronnaya-zachetka' }

foreach ($p in $candidates) {
  try {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
    Write-Host ("Stopped node PID " + $p.ProcessId)
  } catch {
    Write-Host ("Could not stop PID " + $p.ProcessId + ": " + $_.Exception.Message)
  }
}

Start-Sleep -Milliseconds 1000

# Удаляем старый app.log (теперь не занят)
$logFile = Join-Path $projectDir 'app.log'
if (Test-Path $logFile) { Remove-Item $logFile -Force -ErrorAction SilentlyContinue }

# Запускаем VBS заново — он стартует next start в скрытом окне
$vbs = Join-Path $projectDir 'autostart.vbs'
Start-Process wscript.exe -ArgumentList ('"' + $vbs + '"') -WindowStyle Hidden
Write-Host "Server restarted via autostart.vbs"
