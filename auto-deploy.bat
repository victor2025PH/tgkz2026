@echo off
chcp 65001 >nul
title TG-AI智控王 自動部署

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          🚀 TG-AI智控王 一鍵部署腳本                         ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  此腳本將自動:                                               ║
echo ║  1. 提交所有修改到 Git                                       ║
echo ║  2. 推送到 GitHub                                            ║
echo ║  3. 觸發 GitHub Actions 自動部署到服務器                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: 檢查是否有修改
echo [1/4] 檢查修改...
git status --short
echo.

:: 提示輸入提交信息
set /p commit_msg="請輸入提交信息 (直接回車使用默認): "
if "%commit_msg%"=="" set commit_msg=chore: 自動更新 %date% %time:~0,8%

:: 添加所有修改
echo.
echo [2/4] 添加修改到暫存區...
git add -A
if errorlevel 1 (
    echo ❌ 添加文件失敗
    pause
    exit /b 1
)

:: 提交
echo.
echo [3/4] 提交修改: %commit_msg%
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo ⚠️ 沒有需要提交的修改，跳過...
)

:: 推送
echo.
echo [4/4] 推送到 GitHub...
git push origin main
if errorlevel 1 (
    echo ❌ 推送失敗，請檢查網絡連接
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  ✅ 推送成功！GitHub Actions 將自動部署到服務器              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  🔗 查看部署狀態:                                            ║
echo ║  https://github.com/victor2025PH/tgkz2026/actions            ║
echo ║                                                              ║
echo ║  📋 管理後台 (約1分鐘後刷新):                                ║
echo ║  https://tgkz.usdt2026.cc/admin/                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 打開 GitHub Actions 頁面
choice /c YN /m "是否打開 GitHub Actions 頁面查看部署狀態"
if errorlevel 2 goto :end
start https://github.com/victor2025PH/tgkz2026/actions

:end
echo.
echo 完成！
timeout /t 5
