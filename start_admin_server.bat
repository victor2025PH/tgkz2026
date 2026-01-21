@echo off
chcp 65001 > nul
title TG-AI智控王 管理後台服務器

echo.
echo ========================================
echo    TG-AI智控王 管理後台服務器
echo ========================================
echo.

:: 切換到 backend 目錄
cd /d "%~dp0backend"

:: 檢查 Python 環境
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Python，請安裝 Python 3.8+
    pause
    exit /b 1
)

:: 檢查依賴
python -c "import aiohttp" > nul 2>&1
if errorlevel 1 (
    echo 📦 正在安裝依賴...
    pip install aiohttp pyjwt
)

:: 啟動服務器
echo 🚀 正在啟動服務器...
echo.
python start_admin_server.py %*

pause
