# ==============================================================================
# DEPA FEDERATION: STOP ALL RUNNING NODES
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STOPPING ALL DEPA SERVICES & NODES" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Stop by ports 8095, 8081, 8082, 3000, 3001, 3002, 3003
$ports = @(8095, 8081, 8082, 3000, 3001, 3002, 3003)

foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($conn in $conns) {
                $pidToKill = $conn.OwningProcess
                if ($pidToKill -gt 0) {
                    Write-Host "Stopping process $pidToKill listening on Port $port..." -ForegroundColor Yellow
                    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                }
            }
            Write-Host "Port $port is now released." -ForegroundColor Green
        } else {
            Write-Host "Port $port is already free." -ForegroundColor Gray
        }
    } catch {
        # ignore
    }
}

Write-Host "`nAll DEPA services have been cleanly stopped." -ForegroundColor Green
