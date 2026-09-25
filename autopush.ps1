# Auto-upload: every 30 seconds, sends any change in this folder to GitHub.
# Start:  powershell -ExecutionPolicy Bypass -File autopush.ps1     Stop: close the window (or Ctrl+C)
Set-Location $PSScriptRoot
Write-Host "Auto-upload running for $PSScriptRoot - leave this window open. Ctrl+C to stop." -ForegroundColor Green
while ($true) {
  $changes = git status --porcelain
  if ($changes) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git add -A | Out-Null
    git commit -q -m "Update from Claude ($stamp)" | Out-Null
    git pull -q --rebase --autostash
    if ($LASTEXITCODE -ne 0) {
      git rebase --abort 2>$null
      Write-Host "[$stamp] Couldn't merge with GitHub's latest version - tell Claude. Will retry." -ForegroundColor Yellow
    } else {
      git push -q
      if ($LASTEXITCODE -eq 0) { Write-Host "[$stamp] Uploaded:`n$changes" -ForegroundColor Cyan }
      else { Write-Host "[$stamp] Upload failed (sign-in or network?) - will retry." -ForegroundColor Yellow }
    }
  } else {
    git pull -q --rebase 2>$null | Out-Null   # pick up the scanner's latest results
  }
  Start-Sleep -Seconds 30
}
