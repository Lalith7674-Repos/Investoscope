# PowerShell script to test all sync jobs
# Replace YOUR_CRON_SECRET with your actual CRON_SECRET from .env.local

$CRON_SECRET = "YOUR_CRON_SECRET"
$BASE_URL = "http://localhost:3000"

Write-Host "Testing Sync Jobs..." -ForegroundColor Cyan
Write-Host ""

# 1) AMFI Mutual Fund Universe
Write-Host "1. Syncing AMFI Mutual Fund Universe..." -ForegroundColor Yellow
$response1 = Invoke-RestMethod -Uri "$BASE_URL/api/jobs/sync-mf-universe" -Method POST -Headers @{"X-CRON-KEY"=$CRON_SECRET}
Write-Host "   Result: $($response1 | ConvertTo-Json)" -ForegroundColor Green
Write-Host ""

# 2) AMFI Latest NAV
Write-Host "2. Syncing AMFI Latest NAV..." -ForegroundColor Yellow
$response2 = Invoke-RestMethod -Uri "$BASE_URL/api/jobs/sync-mf-nav" -Method POST -Headers @{"X-CRON-KEY"=$CRON_SECRET}
Write-Host "   Result: $($response2 | ConvertTo-Json)" -ForegroundColor Green
Write-Host ""

# 3) NSE Stocks + ETFs Universe
Write-Host "3. Syncing NSE Stocks + ETFs Universe..." -ForegroundColor Yellow
$response3 = Invoke-RestMethod -Uri "$BASE_URL/api/jobs/sync-nse-universe" -Method POST -Headers @{"X-CRON-KEY"=$CRON_SECRET}
Write-Host "   Result: $($response3 | ConvertTo-Json)" -ForegroundColor Green
Write-Host ""

# 4) Prices for Stocks/ETFs
Write-Host "4. Syncing Prices for Stocks/ETFs..." -ForegroundColor Yellow
$response4 = Invoke-RestMethod -Uri "$BASE_URL/api/jobs/sync-prices" -Method POST -Headers @{"X-CRON-KEY"=$CRON_SECRET}
Write-Host "   Result: $($response4 | ConvertTo-Json)" -ForegroundColor Green
Write-Host ""

# Check counts
Write-Host "5. Checking database counts..." -ForegroundColor Yellow
$counts = Invoke-RestMethod -Uri "$BASE_URL/api/debug/counts" -Method GET
Write-Host "   Counts: $($counts.counts | ConvertTo-Json)" -ForegroundColor Green
Write-Host ""

Write-Host "Done! ✅" -ForegroundColor Cyan

