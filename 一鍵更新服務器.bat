@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════╗
echo ║     TG-AI智控王 一鍵更新服務器                   ║
echo ╚══════════════════════════════════════════════════╝
echo.

set SERVER=ubuntu@165.154.233.78
set PASSWORD=FtwpP3s2WiEU4Pv6

echo [1/4] 連接服務器並拉取代碼...
echo.

:: 使用 plink (如果有) 或提示手動操作
where plink >nul 2>&1
if %errorlevel%==0 (
    echo y | plink -ssh %SERVER% -pw %PASSWORD% "cd /opt/tg-matrix-server && git pull origin main"
    plink -ssh %SERVER% -pw %PASSWORD% "cd /opt/tg-matrix-server && source venv/bin/activate && python backend/license_server.py init"
    plink -ssh %SERVER% -pw %PASSWORD% "sudo systemctl restart tg-matrix-license"
    plink -ssh %SERVER% -pw %PASSWORD% "sudo systemctl status tg-matrix-license"
    echo.
    echo ✅ 更新完成！
) else (
    echo ⚠️ 未找到 plink，請手動執行以下命令:
    echo.
    echo ssh %SERVER%
    echo 密碼: %PASSWORD%
    echo.
    echo 登錄後執行:
    echo   cd /opt/tg-matrix-server
    echo   git pull origin main
    echo   source venv/bin/activate
    echo   python backend/license_server.py init
    echo   sudo systemctl restart tg-matrix-license
    echo.
)

echo.
echo ════════════════════════════════════════════════════
echo 管理後台: https://tgkz.usdt2026.cc/admin/
echo 默認帳號: admin / admin888
echo ════════════════════════════════════════════════════
echo.
pause
