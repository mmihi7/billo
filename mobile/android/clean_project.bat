@echo off
echo Cleaning project...

:: Delete build directories
if exist app\build rmdir /s /q app\build
if exist .gradle rmdir /s /q .gradle

:: Delete Gradle caches
if exist %USERPROFILE%\.gradle\caches rmdir /s /q %USERPROFILE%\.gradle\caches
if exist %USERPROFILE%\.gradle\daemon rmdir /s /q %USERPROFILE%\.gradle\daemon

:: Delete Android Studio caches
if exist %USERPROFILE%\.android\cache rmdir /s /q %USERPROFILE%\.android\cache
if exist %USERPROFILE%\.android\build-cache rmdir /s /q %USERPROFILE%\.android\build-cache

echo Project cleaned successfully!
echo Please restart Android Studio and rebuild the project.
pause
