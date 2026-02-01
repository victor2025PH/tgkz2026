# TG-Matrix 後端重新部署腳本 (Windows)
# 使用根目錄 docker-compose 重建並啟動 API 服務（含 auth 修復）
#
# 用法: 在專案根目錄執行
#   .\scripts\redeploy-backend.ps1
# 或從任意目錄:
#   & "d:\tgkz2026\scripts\redeploy-backend.ps1"

$ErrorActionPreference = "Stop"

$ProjectRoot = if ($PSScriptRoot) {
    Split-Path $PSScriptRoot -Parent
} else {
    $MyInvocation.MyCommand.Path | Split-Path | Split-Path
}

if (-not (Test-Path (Join-Path $ProjectRoot "docker-compose.yml"))) {
    Write-Host "錯誤: 未找到 docker-compose.yml，請在專案根目錄執行或設置正確路徑。" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TG-Matrix 後端重新部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "專案目錄: $ProjectRoot"
Write-Host ""

Push-Location $ProjectRoot
try {
    Write-Host "[1/2] 重建 API 鏡像 (--no-cache)..." -ForegroundColor Yellow
    docker compose build --no-cache api
    if ($LASTEXITCODE -ne 0) {
        Write-Host "重建失敗。" -ForegroundColor Red
        exit 1
    }
    Write-Host "[2/2] 啟動 API 服務..." -ForegroundColor Yellow
    docker compose up -d api
    if ($LASTEXITCODE -ne 0) {
        Write-Host "啟動失敗。" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    Write-Host "部署完成。API 服務已重啟。" -ForegroundColor Green
    Write-Host "查看日誌: docker compose logs -f api" -ForegroundColor Gray
} finally {
    Pop-Location
}
