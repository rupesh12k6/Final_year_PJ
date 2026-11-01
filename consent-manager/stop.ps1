# ==============================================================================
# CONSENT MANAGER (SERVER 1) - INDIVIDUAL STOP SCRIPT
# Stops ports 8095 (Backend) and 3001 (Frontend)
# ==============================================================================

Write-Host "Stopping Consent Manager services (Ports 8095, 3001)..." -ForegroundColor Yellow

$ports = @(8095, 3001)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($conn in $conns) {
                if ($conn.OwningProcess -gt 0) {
                    Write-Host "Killing process $($conn.OwningProcess) on Port $port..." -ForegroundColor Yellow
                    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                }
            }
            Write-Host "Port $port released." -ForegroundColor Green
        } else {
            Write-Host "Port $port already free." -ForegroundColor Gray
        }
    } catch { }
}

Write-Host "Consent Manager stopped cleanly." -ForegroundColor Green
