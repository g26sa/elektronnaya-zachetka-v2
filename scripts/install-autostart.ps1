$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8

$startup = [Environment]::GetFolderPath('Startup')
$projectDir = Split-Path -Parent $PSScriptRoot
$vbsPath = Join-Path $projectDir 'autostart.vbs'
$linkPath = Join-Path $startup 'ezk-autostart.lnk'

Write-Host "Startup folder: $startup"
Write-Host "Project dir   : $projectDir"
Write-Host "VBS script    : $vbsPath"
Write-Host "Shortcut      : $linkPath"

if (-not (Test-Path $vbsPath)) {
  Write-Error "autostart.vbs not found in $projectDir"
  exit 1
}

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($linkPath)
$sc.TargetPath = 'wscript.exe'
$sc.Arguments = '"' + $vbsPath + '"'
$sc.WorkingDirectory = $projectDir
$sc.Description = 'Autostart EZK web app'
$sc.IconLocation = 'shell32.dll,47'
$sc.Save()

Write-Host ""
Write-Host "Done. Shortcut created."
Write-Host "Contents of Startup folder:"
Get-ChildItem $startup | Select-Object Name, LastWriteTime | Format-Table -AutoSize
