@echo off
chcp 65001 >nul
echo ================================
echo   TG-Matrix 開發環境啟動中...
echo ================================
echo.

cd /d "%~dp0"
npm run start:dev

pause
