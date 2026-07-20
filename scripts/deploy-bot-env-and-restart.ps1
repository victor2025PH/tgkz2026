# 在「運行 API/Bot 的那台機器」上執行，為掃碼登錄配置 INTERNAL_API_URL 並重啟 API 容器
# 用法: 在項目根目錄執行 .\scripts\deploy-bot-env-and-restart.ps1

$ErrorActionPreference = "Stop"
# 腳本在 scripts/ 下，項目根目錄為其上層
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { ".env" }
$InternalUrl = if ($env:INTERNAL_API_URL) { $env:INTERNAL_API_URL } else { "https://tgw.usdt2026.cc" }

Write-Host "[deploy-bot] 使用環境文件: $EnvFile"

if (Test-Path $EnvFile) {
    $content = Get-Content $EnvFile -Raw
    if ($content -match "INTERNAL_API_URL=") {
        $content = $content -replace "INTERNAL_API_URL=.*", "INTERNAL_API_URL=$InternalUrl"
        Set-Content $EnvFile -Value $content -NoNewline
        Write-Host "[deploy-bot] 已更新 INTERNAL_API_URL=$InternalUrl"
    } else {
        Add-Content $EnvFile "INTERNAL_API_URL=$InternalUrl"
        Write-Host "[deploy-bot] 已寫入 INTERNAL_API_URL=$InternalUrl"
    }
} else {
    Set-Content $EnvFile "INTERNAL_API_URL=$InternalUrl"
    Write-Host "[deploy-bot] 已創建 $EnvFile 並寫入 INTERNAL_API_URL=$InternalUrl"
}

Write-Host "[deploy-bot] 重啟 API 容器（Bot 在 API 進程內）..."
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        docker compose up -d --force-recreate api 2>$null
        if ($LASTEXITCODE -ne 0) { docker-compose up -d --force-recreate api }
    } catch {
        Write-Host "[deploy-bot] 請手動執行: docker compose up -d --force-recreate api"
        exit 1
    }
} else {
    Write-Host "[deploy-bot] 未找到 docker，請手動執行: docker compose up -d --force-recreate api"
    exit 1
}

Write-Host "[deploy-bot] 完成。請在 Telegram 中再次嘗試掃碼登錄。"
