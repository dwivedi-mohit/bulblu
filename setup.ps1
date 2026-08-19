Write-Host "================================================" -ForegroundColor Cyan
Write-Host "      BULBLU GOOGLE AUTH & APP SETUP SCRIPT    " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$keystore = "$PSScriptRoot\android\app\debug.keystore"
if (Test-Path $keystore) {
    Write-Host "[1/3] Extracting Android SHA-1 Fingerprint..." -ForegroundColor Yellow
    $output = keytool -list -v -keystore "$keystore" -alias androiddebugkey -storepass android -keypass android 2>&1
    $sha1 = ($output | Select-String "SHA1:\s+([A-FA-f0-9:]+)").Matches.Groups[1].Value
    $sha256 = ($output | Select-String "SHA256:\s+([A-FA-f0-9:]+)").Matches.Groups[1].Value

    Write-Host "✔ Package Name:  com.bulblu.app" -ForegroundColor Green
    Write-Host "✔ SHA-1:         $sha1" -ForegroundColor Green
    Write-Host "✔ SHA-256:       $sha256" -ForegroundColor Green
} else {
    Write-Host "ℹ Android debug.keystore not found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/3] Checking App TypeScript compilation..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✔ TypeScript Compilation: Clean (0 errors)" -ForegroundColor Green
} else {
    Write-Host "✖ TypeScript Compilation: Errors found" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📌 NEXT STEP: Add Android SHA-1 to Google Cloud Console:" -ForegroundColor Magenta
Write-Host "  1. Open https://console.cloud.google.com/apis/credentials" -ForegroundColor White
Write-Host "  2. Create OAuth Client ID -> Android" -ForegroundColor White
Write-Host "  3. Package Name: com.bulblu.app" -ForegroundColor White
Write-Host "  4. SHA-1:        5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Cyan
