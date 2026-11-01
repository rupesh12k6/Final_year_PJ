# ==============================================================================
# COLLEGE B UNIVERSITY (SERVER 3) - INDIVIDUAL STOP SCRIPT
# Stops ports 8082 (Backend) and 3003 (Frontend)
# ==============================================================================

Write-Host "Stopping College B services (Ports 8082, 3003)..." -ForegroundColor Yellow

$ports = @(8082, 3003)
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

Write-Host "College B stopped cleanly." -ForegroundColor Green
