@echo off
chcp 65001 >nul
echo ===============================================
echo    TG-Matrix 一鍵部署到服務器
echo    王者榮耀風格會員等級系統
echo ===============================================
echo.

set SERVER_IP=165.154.233.78
set SERVER_USER=ubuntu

echo 正在連接到服務器 %SERVER_IP%...
echo.
echo 請在彈出的窗口中輸入密碼: FtwpP3s2WiEU4Pv6
echo.

:: 上傳部署腳本並執行
ssh %SERVER_USER%@%SERVER_IP% "curl -sSL https://raw.githubusercontent.com/victor2025PH/tgkz2026/main/deploy/remote-deploy.sh | bash"

echo.
echo ===============================================
echo 部署完成！
echo 管理後台: http://%SERVER_IP%
echo ===============================================
pause
