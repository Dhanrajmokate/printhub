@echo off
title PrintHub Shop Partner - Package Installer
echo ==================================================================
echo       PrintHub Shop Partner - Standalone .EXE Builder
echo ==================================================================
echo.
echo Packaging the native Windows desktop app for print shopkeepers...
echo No npm or Node.js required on the shopkeeper's laptop!
echo.
cd /d "%~dp0shop-desktop"
call npm run dist:installer
echo.
echo ==================================================================
echo  SUCCESS! Your installer has been generated in:
echo    shop-desktop\dist\PrintHub Shop Partner Setup 1.0.0.exe
echo ==================================================================
pause
