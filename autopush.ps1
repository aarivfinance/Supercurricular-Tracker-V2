# Auto-upload: every 30 seconds, sends any change in this folder to GitHub.
# Runs by itself after you've run setup-autopush.ps1 once. You can still start it by hand:
#   powershell -ExecutionPolicy Bypass -File autopush.ps1        Stop: close the window (or Ctrl+C)
Set-Location $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA 'AdmissionsHome'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'autopush.log'
function Say($msg, $colour = 'Gray') {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Write-Host $line -ForegroundColor $colour
  Add-Content -Path $log -Value $line
  if ((Get-Item $log).Length -gt 1MB) { Get-Content $log -Tail 2000 | Set-Content $log }   # keep the log small
}
Say "Auto-upload running for $PSScriptRoot" 'Green'
while ($true) {
  $changes = git status --porcelain
  if ($changes) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git add -A | Out-Null
    git commit -q -m "Update from Claude ($stamp)" | Out-Null
    git pull -q --rebase --autostash
    if ($LASTEXITCODE -ne 0) {
      git rebase --abort 2>$null
      Say "Couldn't merge with GitHub's latest version - tell Claude. Will retry." 'Yellow'
    } else {
      git push -q
      if ($LASTEXITCODE -eq 0) { Say "Uploaded: $($changes -join '; ')" 'Cyan' }
      else { Say "Upload failed (sign-in or network?) - will retry." 'Yellow' }
    }
  } else {
    git pull -q --rebase 2>$null | Out-Null   # pick up the scanner's latest results
  }
  Start-Sleep -Seconds 30
}
