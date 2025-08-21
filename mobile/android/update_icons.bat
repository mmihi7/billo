@echo off
setlocal enabledelayedexpansion

echo Updating launcher icons...

:: Source directory
set "SRC_DIR=%~dp0..\..\assets\logo"
set "DEST_DIR=%~dp0app\src\main\res"

:: Create destination directories if they don't exist
for %%d in (
    "mipmap-ldpi"
    "mipmap-mdpi"
    "mipmap-hdpi"
    "mipmap-xhdpi"
    "mipmap-xxhdpi"
    "mipmap-xxxhdpi"
) do (
    if not exist "%DEST_DIR%\%%~d" mkdir "%DEST_DIR%\%%~d"
)

:: Copy and rename icon files
copy /Y "%SRC_DIR%\android-icon-36x36.png" "%DEST_DIR%\mipmap-ldpi\ic_launcher.png"
copy /Y "%SRC_DIR%\android-icon-36x36.png" "%DEST_DIR%\mipmap-ldpi\ic_launcher_round.png"

copy /Y "%SRC_DIR%\android-icon-48x48.png" "%DEST_DIR%\mipmap-mdpi\ic_launcher.png"
copy /Y "%SRC_DIR%\android-icon-48x48.png" "%DEST_DIR%\mipmap-mdpi\ic_launcher_round.png"

copy /Y "%SRC_DIR%\android-icon-72x72.png" "%DEST_DIR%\mipmap-hdpi\ic_launcher.png"
copy /Y "%SRC_DIR%\android-icon-72x72.png" "%DEST_DIR%\mipmap-hdpi\ic_launcher_round.png"

copy /Y "%SRC_DIR%\android-icon-96x96.png" "%DEST_DIR%\mipmap-xhdpi\ic_launcher.png"
copy /Y "%SRC_DIR%\android-icon-96x96.png" "%DEST_DIR%\mipmap-xhdpi\ic_launcher_round.png"

copy /Y "%SRC_DIR%\android-icon-144x144.png" "%DEST_DIR%\mipmap-xxhdpi\ic_launcher.png"
copy /Y "%SRC_DIR%\android-icon-144x144.png" "%DEST_DIR%\mipmap-xxhdpi\ic_launcher_round.png"

copy /Y "%SRC_DIR%\android-icon-192x192.png" "%DEST_DIR%\mipmap-xxxhdpi\ic_launcher.png"
copy /Y "%SRC_DIR%\android-icon-192x192.png" "%DEST_DIR%\mipmap-xxxhdpi\ic_launcher_round.png"

echo Launcher icons updated successfully!
pause
