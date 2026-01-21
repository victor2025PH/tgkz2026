@echo off
chcp 65001 > nul
title 上傳到 GitHub

echo.
echo ========================================
echo    TG-AI智控王 管理後台 - 上傳到 GitHub
echo ========================================
echo.

:: 檢查 Git
git --version > nul 2>&1
if errorlevel 1 (
    echo ❌ 未安裝 Git，請先安裝：https://git-scm.com/
    pause
    exit /b 1
)

:: 初始化 Git（如果還沒有）
if not exist ".git" (
    echo 📦 初始化 Git 倉庫...
    git init
    git branch -M main
)

:: 配置 Git（如果需要）
git config user.email > nul 2>&1
if errorlevel 1 (
    echo.
    set /p email="請輸入你的 GitHub 郵箱: "
    git config user.email "%email%"
)

git config user.name > nul 2>&1
if errorlevel 1 (
    set /p name="請輸入你的 GitHub 用戶名: "
    git config user.name "%name%"
)

:: 添加遠程倉庫（如果還沒有）
git remote get-url origin > nul 2>&1
if errorlevel 1 (
    echo.
    echo 請輸入你的 GitHub 倉庫地址
    echo 格式: https://github.com/username/repo-name.git
    set /p repo_url="倉庫地址: "
    git remote add origin "%repo_url%"
)

:: 添加所有文件
echo.
echo 📁 添加文件到暫存區...
git add .

:: 提交
echo 📝 提交更改...
set /p commit_msg="請輸入提交信息 (直接回車使用默認): "
if "%commit_msg%"=="" set commit_msg=Update admin panel

git commit -m "%commit_msg%"

:: 推送
echo.
echo 🚀 推送到 GitHub...
git push -u origin main

echo.
echo ✅ 上傳完成！
echo.
echo 📌 下一步：
echo    1. 進入 GitHub 倉庫 → Settings → Pages
echo    2. Source 選擇 "GitHub Actions"
echo    3. 等待 Actions 完成部署
echo    4. 訪問: https://^<username^>.github.io/^<repo-name^>/
echo.

pause
