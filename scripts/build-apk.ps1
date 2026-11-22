# Builds the NEURAL//DECK Android debug APK and copies it to .\apk\
#
#   pwsh -File scripts/build-apk.ps1        (or: npm run android:apk)
#
# Needs: Node/npm, the Android SDK, and a JDK (Android Studio's bundled JBR works).
# Gradle auto-downloads the JDK 21 toolchain the Capacitor plugins compile with.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:JAVA_HOME) {
    $studioJbr = 'C:\Program Files\Android\Android Studio\jbr'
    if (Test-Path $studioJbr) { $env:JAVA_HOME = $studioJbr }
    else { throw 'JAVA_HOME is not set and Android Studio''s JBR was not found. Install a JDK 21+ and set JAVA_HOME.' }
}
if (-not $env:ANDROID_HOME) {
    $defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (Test-Path $defaultSdk) { $env:ANDROID_HOME = $defaultSdk }
    else { throw 'ANDROID_HOME is not set and no SDK was found at %LOCALAPPDATA%\Android\Sdk.' }
}

Write-Host '==> Building web bundle' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'vite build failed' }

Write-Host '==> Syncing web assets + plugins into android/' -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'cap sync failed' }

Write-Host '==> Assembling debug APK' -ForegroundColor Cyan
Push-Location android
try {
    .\gradlew.bat assembleDebug --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'gradle assembleDebug failed' }
} finally { Pop-Location }

$version = (Select-String -Path android\app\build.gradle -Pattern 'versionName\s+"([^"]+)"').Matches[0].Groups[1].Value
$outDir = Join-Path $root 'apk'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$dest = Join-Path $outDir "neural-deck-$version-debug.apk"
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk $dest -Force
Write-Host "==> APK ready: $dest" -ForegroundColor Green
