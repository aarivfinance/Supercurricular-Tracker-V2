# One-time setup: makes autopush start by itself, hidden, every time you log in to Windows,
# and restart within a minute if it ever stops. Run once: right-click this file -> "Run with PowerShell".
# To undo: Unregister-ScheduledTask -TaskName "AdmissionsHome-autopush" -Confirm:$false
param([switch]$NoPause)
$result = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'AdmissionsHome-setup-result.txt'
$dir = $PSScriptRoot
$script = Join-Path $dir 'autopush.ps1'
if (-not (Test-Path $script)) { Write-Host "Can't find autopush.ps1 next to this file." -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }

# the old Startup shortcut opened a window you had to keep open; the scheduled task replaces it
$old = Join-Path ([Environment]::GetFolderPath('Startup')) 'AdmissionsHome-autopush.lnk'
if (Test-Path $old) { Remove-Item $old -ErrorAction SilentlyContinue }

$action   = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`"" -WorkingDirectory $dir
$trigger  = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
            -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
try {
  Register-ScheduledTask -TaskName 'AdmissionsHome-autopush' -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
    -Description 'Sends changes in the Admissions Home folder to GitHub every 30 seconds.' -Force -ErrorAction Stop | Out-Null
  Start-ScheduledTask -TaskName 'AdmissionsHome-autopush'
  Write-Host "Done. Autopush now runs by itself in the background whenever you're logged in." -ForegroundColor Green
  Write-Host "Its log is at: $env:LOCALAPPDATA\AdmissionsHome\autopush.log"
  "OK $(Get-Date -Format s) task registered and started" | Set-Content $result
} catch {
  Write-Host "Windows didn't allow it: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host 'Try again: right-click this file, choose "Run with PowerShell", and if asked, allow it to run as administrator.'
  "FAILED $(Get-Date -Format s) $($_.Exception.Message)" | Set-Content $result
}
if (-not $NoPause) { Read-Host 'Press Enter to close' } else { Start-Sleep -Seconds 8 }
