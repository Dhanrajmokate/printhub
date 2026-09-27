@echo off
title PrintHub Desktop Print Agent
echo ========================================================
echo         PRINTHUB DESKTOP PRINTER AGENT (v1.0)
echo ========================================================
echo.
echo [*] Checking local hardware ports...
echo [*] Port 8001: B&W Laser Printer 1
echo [*] Port 8002: Color Studio Inkjet 1
echo [*] Port 8003: Secondary B&W / Heavy Duplex 2
echo [*] Port 8004: Secondary Color / Photo Jet 2
echo [*] Port 8005: Auxiliary Plotter / Special 3
echo.
cd /d "%~dp0\printer-service"
node node_modules\tsx\dist\cli.mjs src\index.ts
pause
