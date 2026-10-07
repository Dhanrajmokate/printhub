@echo off
title PrintHub Shop Partner Desktop App
echo ========================================================
echo        PRINTHUB SHOP PARTNER DESKTOP APPLICATION
echo ========================================================
echo.
echo [*] Launching Native Windows Print Spooler & FIFO Queue...
echo.
cd /d "%~dp0\shop-desktop"
node node_modules\electron\cli.js .
pause
