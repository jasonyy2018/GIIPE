# PowerShell script to fix the missing honorableGuests column in the events table

Write-Host "🔧 Fixing missing honorableGuests column in events table..." -ForegroundColor Cyan
Write-Host ""

# Check if backend container is running
$backendRunning = docker ps --format "{{.Names}}" | Select-String "conference-backend-prod"
if (-not $backendRunning) {
    Write-Host "❌ Backend container is not running" -ForegroundColor Red
    Write-Host "Please start the backend container first:"
    Write-Host "  docker-compose -f docker-compose.prod.yml up -d backend"
    exit 1
}

Write-Host "✅ Backend container is running" -ForegroundColor Green
Write-Host ""

# Method 1: Try to run Prisma migrate deploy
Write-Host "📋 Attempting to apply pending migrations..." -ForegroundColor Cyan
$migrateResult = docker exec conference-backend-prod npx prisma migrate deploy 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migrations applied successfully" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Migration deploy failed, trying direct SQL approach..." -ForegroundColor Yellow
    
    # Method 2: Use psql directly to add the column
    Write-Host "📋 Using psql to add column directly..." -ForegroundColor Cyan
    
    # Get environment variables from docker-compose
    $envContent = Get-Content .env.production -ErrorAction SilentlyContinue
    $postgresUser = "conference_user"
    $postgresDb = "conference_db"
    
    if ($envContent) {
        foreach ($line in $envContent) {
            if ($line -match "^POSTGRES_USER=(.+)$") {
                $postgresUser = $matches[1].Trim()
            }
            if ($line -match "^POSTGRES_DB=(.+)$") {
                $postgresDb = $matches[1].Trim()
            }
        }
    }
    
    $sqlCommand = 'ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "honorableGuests" JSONB;'
    $psqlResult = docker exec conference-postgres-prod psql -U $postgresUser -d $postgresDb -c $sqlCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Column added successfully via psql" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to add column" -ForegroundColor Red
        Write-Host $psqlResult
        Write-Host ""
        Write-Host "Please try manually:"
        Write-Host "  docker exec -it conference-postgres-prod psql -U $postgresUser -d $postgresDb"
        Write-Host "  ALTER TABLE events ADD COLUMN IF NOT EXISTS `"honorableGuests`" JSONB;"
        exit 1
    }
}

Write-Host ""
Write-Host "🔄 Regenerating Prisma Client..." -ForegroundColor Cyan
docker exec conference-backend-prod npx prisma generate 2>&1 | Out-Null

Write-Host ""
Write-Host "🔄 Restarting backend to apply changes..." -ForegroundColor Cyan
docker restart conference-backend-prod

Write-Host ""
Write-Host "⏳ Waiting for backend to restart..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "✅ Fix complete! The honorableGuests column should now be available." -ForegroundColor Green
Write-Host ""
Write-Host "You can verify by checking the backend logs:"
Write-Host "  docker logs conference-backend-prod --tail 50"

