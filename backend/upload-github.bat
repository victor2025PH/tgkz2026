@echo off
chcp 65001 > nul
title 上傳 License Server 到 GitHub

echo.
echo ========================================
echo    TG-AI智控王 License Server - 上傳到 GitHub
echo ========================================
echo.

:: 檢查 Git
git --version > nul 2>&1
if errorlevel 1 (
    echo ❌ 未安裝 Git，請先安裝：https://git-scm.com/
    pause
    exit /b 1
)

:: 需要上傳的文件
echo 📋 將上傳以下文件:
echo    - database.py
echo    - license_server.py
echo    - start_admin_server.py
echo    - Dockerfile
echo    - requirements-server.txt
echo    - README-server.md
echo    - .github/workflows/docker-build.yml
echo.

:: 初始化 Git
if not exist ".git" (
    echo 📦 初始化 Git 倉庫...
    git init
    git branch -M main
)

:: 配置
git config user.email > nul 2>&1
if errorlevel 1 (
    set /p email="請輸入你的 GitHub 郵箱: "
    git config user.email "%email%"
)

git config user.name > nul 2>&1
if errorlevel 1 (
    set /p name="請輸入你的 GitHub 用戶名: "
    git config user.name "%name%"
)

:: 添加遠程倉庫
git remote get-url origin > nul 2>&1
if errorlevel 1 (
    echo.
    echo 請輸入你的 GitHub 倉庫地址
    echo 格式: https://github.com/username/tgai-license-server.git
    set /p repo_url="倉庫地址: "
    git remote add origin "%repo_url%"
)

:: 添加文件
echo.
echo 📁 添加文件...
git add database.py license_server.py start_admin_server.py
git add Dockerfile requirements-server.txt README-server.md
git add .github/workflows/docker-build.yml
git add .gitignore

:: 提交
echo 📝 提交更改...
set /p commit_msg="請輸入提交信息 (直接回車使用默認): "
if "%commit_msg%"=="" set commit_msg=Update license server

git commit -m "%commit_msg%"

:: 推送
echo.
echo 🚀 推送到 GitHub...
git push -u origin main

echo.
echo ✅ 上傳完成！
echo.
echo 📌 下一步：
echo    1. GitHub Actions 會自動構建 Docker 鏡像
echo    2. 鏡像地址: ghcr.io/^<username^>/^<repo^>:latest
echo    3. 在服務器上運行:
echo       docker pull ghcr.io/^<username^>/^<repo^>:latest
echo       docker run -d -p 8080:8080 ghcr.io/^<username^>/^<repo^>:latest
echo.

pause
