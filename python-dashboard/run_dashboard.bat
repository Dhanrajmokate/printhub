@echo off
title PrintHub Python Dashboard
echo =========================================================
echo    PrintHub Smart Print - Python Mini-Project Dashboard
echo =========================================================
echo.
echo Launching Streamlit dashboard on http://localhost:8505 ...
echo.
cd /d "%~dp0"
python -m streamlit run app.py --server.port 8505
pause
