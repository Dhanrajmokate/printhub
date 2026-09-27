@echo off
title PrintHub Full-Stack Starter
echo ========================================================
echo            STARTING PRINTHUB FULL-STACK SYSTEM
echo ========================================================
echo.
echo [1/3] Starting Backend API Server on Port 8000...
start "PrintHub Backend (Port 8000)" cmd /k "cd /d %~dp0\server && npm run dev"

echo [2/3] Starting Printer Hardware Agent on Ports 8001-8005...
start "PrintHub Printer Agent" cmd /k "cd /d %~dp0\printer-service && npm run dev"

echo [3/3] Starting Frontend Client on Port 8080...
start "PrintHub Client (Port 8080)" cmd /k "cd /d %~dp0\client && npm run dev"

echo.
echo ========================================================
echo  All 3 services are launching in background windows!
echo  Opening http://127.0.0.1:8080 in your browser...
echo ========================================================
timeout /t 3 >nul
start http://127.0.0.1:8080
