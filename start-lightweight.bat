@echo off
chcp 65001 >nul
echo ================================
echo   TG-Matrix 輕量模式啟動中...
echo   (優化內存佔用，適合開發調試)
echo ================================
echo.

REM 設置輕量模式環境變量
set TG_LIGHTWEIGHT_MODE=true
set TG_DISABLE_NEURAL_EMBEDDING=true
set TG_DISABLE_CHROMADB=true
set TG_MAX_CACHE_ENTRIES=200

REM 清理佔用端口 4200 的進程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4200" ^| findstr "LISTENING" 2^>nul') do (
    echo 正在終止佔用端口 4200 的進程 %%a...
    taskkill /PID %%a /F >nul 2>&1
)

REM 清理殘留的 Python 後端進程
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO LIST 2^>nul ^| findstr "PID:"') do (
    echo 正在清理殘留 Python 進程 %%a...
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

cd /d "%~dp0"

echo.
echo 🚀 輕量模式已啟用:
echo    - 神經網絡嵌入: 禁用 (節省 ~200MB)
echo    - ChromaDB: 禁用 (節省 ~50MB)
echo    - 模塊延遲加載: 啟用 (節省 ~100MB)
echo    - 緩存限制: 200 條目
echo.

npm run start:dev -- --lightweight

pause
