# Stop any running Gradle daemons
echo "Stopping Gradle daemons..."
& .\gradlew --stop

# Clean the project
echo "Cleaning project..."
Remove-Item -Recurse -Force .\.gradle -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\app\build -ErrorAction SilentlyContinue

# Clean Gradle caches
echo "Cleaning Gradle caches..."
$gradleCache = "$env:USERPROFILE\.gradle\caches"
if (Test-Path $gradleCache) {
    Remove-Item -Recurse -Force $gradleCache\* -ErrorAction SilentlyContinue
}

# Clean Android Studio caches
echo "Cleaning Android Studio caches..."
$androidCache = "$env:USERPROFILE\.android\cache"
if (Test-Path $androidCache) {
    Remove-Item -Recurse -Force $androidCache -ErrorAction SilentlyContinue
}

$buildCache = "$env:USERPROFILE\.android\build-cache"
if (Test-Path $buildCache) {
    Remove-Item -Recurse -Force $buildCache -ErrorAction SilentlyContinue
}

# Sync Gradle with new wrapper
echo "Syncing Gradle with new wrapper..."
& .\gradlew wrapper --gradle-version=8.4 --distribution-type=bin

# Verify Java home
echo "`nVerifying Java configuration..."
& .\gradlew -v

# Run with debug info
echo "`nRunning build with debug info..."
& .\gradlew :app:assembleDebug --info --stacktrace

# If the above fails, try with scan
echo "`nIf the build failed, generating build scan..."
& .\gradlew build --scan

echo "`nProcess completed. Please check the output above for any errors."
Read-Host -Prompt "Press Enter to exit"
