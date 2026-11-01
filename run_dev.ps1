# 🎯 กำหนด Encoding แสดงผล
$OutputEncoding = [System.Text.Encoding]::UTF-8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Attendance System Backend (Dev Mode)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

while ($true) {
    $time = Get-Date -Format "HH:mm:ss"
    Write-Host "[$time] Status: Running Python app..." -ForegroundColor Green
    
    python app.py
    
    Write-Host ""
    Write-Host "--------------------------------------------------------" -ForegroundColor Red
    Write-Host "  App Crashed or Stopped!" -ForegroundColor Yellow
    Write-Host "  Restarting in 2 seconds... (Press Ctrl+C to stop)" -ForegroundColor Yellow
    Write-Host "--------------------------------------------------------" -ForegroundColor Red
    Write-Host ""
    Start-Sleep -Seconds 2
}