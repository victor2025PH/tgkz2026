@echo off
chcp 65001 >nul
echo ================================
echo   TG-Matrix 開發環境啟動中...
echo ================================
echo.

REM 清理佔用端口 4200 的進程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4200" ^| findstr "LISTENING" 2^>nul') do (
    echo 正在終止佔用端口 4200 的進程 %%a...
    taskkill /PID %%a /F >nul 2>&1
)

REM 清理殘留的 Python 後端進程（避免數據庫鎖定）
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO LIST 2^>nul ^| findstr "PID:"') do (
    echo 正在清理殘留 Python 進程 %%a...
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

cd /d "%~dp0"
npm run start:dev

pause
