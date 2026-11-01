# ==============================================================================
# COLLEGE A UNIVERSITY (SERVER 2) - INDIVIDUAL STOP SCRIPT
# Stops ports 8081 (Backend) and 3002 (Frontend)
# ==============================================================================

Write-Host "Stopping College A services (Ports 8081, 3002)..." -ForegroundColor Yellow

$ports = @(8081, 3002)
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

Write-Host "College A stopped cleanly." -ForegroundColor Green
