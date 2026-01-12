# TG-Matrix 服務器部署腳本 (Windows)
# 適用於 Windows Server 2019+
#
# 使用方法:
#   以管理員身份運行 PowerShell
#   Set-ExecutionPolicy Bypass -Scope Process
#   .\deploy-windows.ps1

param(
    [string]$InstallDir = "C:\TG-Matrix-Server",
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

# ============ 配置 ============
$AppName = "TG-Matrix-License"
$ServiceName = "TGMatrixLicense"

# ============ 函數 ============

function Write-Log {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Type) {
        "INFO" { "Cyan" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Type] $Message" -ForegroundColor $color
}

function Test-Administrator {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ============ 檢查權限 ============

if (-not (Test-Administrator)) {
    Write-Log "請以管理員身份運行此腳本" "ERROR"
    exit 1
}

# ============ 開始部署 ============

Write-Host ""
Write-Host "=================================================="
Write-Host "   TG-Matrix License Server 部署腳本 (Windows)"
Write-Host "   王者榮耀風格會員等級系統"
Write-Host "=================================================="
Write-Host ""

Write-Log "安裝目錄: $InstallDir"
Write-Log "服務端口: $Port"
Write-Host ""

$confirm = Read-Host "是否繼續? (y/n)"
if ($confirm -ne "y") {
    Write-Log "已取消" "WARNING"
    exit 0
}

# ============ 創建目錄 ============

Write-Log "創建目錄結構..."

$dirs = @(
    $InstallDir,
    "$InstallDir\data",
    "$InstallDir\logs",
    "$InstallDir\admin-panel",
    "$InstallDir\backups"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Log "目錄創建完成" "SUCCESS"

# ============ 複製文件 ============

Write-Log "複製應用文件..."

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir

# 複製後端文件
$backendFiles = @(
    "license_server.py",
    "license_generator.py",
    "membership.py",
    "payment_gateway.py"
)

foreach ($file in $backendFiles) {
    $source = Join-Path "$projectDir\backend" $file
    if (Test-Path $source) {
        Copy-Item $source "$InstallDir\" -Force
    }
}

# 複製管理後台
$adminSource = "$projectDir\admin-panel"
if (Test-Path $adminSource) {
    Copy-Item "$adminSource\*" "$InstallDir\admin-panel\" -Recurse -Force
}

Write-Log "文件複製完成" "SUCCESS"

# ============ 檢查 Python ============

Write-Log "檢查 Python 環境..."

try {
    $pythonVersion = python --version 2>&1
    Write-Log "Python 版本: $pythonVersion"
} catch {
    Write-Log "未找到 Python，請先安裝 Python 3.8+" "ERROR"
    Write-Log "下載地址: https://www.python.org/downloads/"
    exit 1
}

# ============ 創建虛擬環境 ============

Write-Log "創建 Python 虛擬環境..."

$venvPath = "$InstallDir\venv"
if (-not (Test-Path $venvPath)) {
    python -m venv $venvPath
}

# 激活虛擬環境並安裝依賴
& "$venvPath\Scripts\pip.exe" install --upgrade pip
& "$venvPath\Scripts\pip.exe" install `
    aiohttp `
    aiosqlite `
    pyjwt `
    cryptography `
    python-dotenv `
    psutil

Write-Log "Python 環境配置完成" "SUCCESS"

# ============ 創建配置文件 ============

Write-Log "創建配置文件..."

$configContent = @"
# TG-Matrix License Server 配置

# 服務器設置
HOST=0.0.0.0
PORT=$Port

# JWT 密鑰（請修改為隨機字符串！）
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_STRING_$(Get-Random)

# 數據庫路徑
DB_PATH=$InstallDir\data\license_server.db

# 支付寶配置
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=

# 微信支付配置
WECHAT_APP_ID=
WECHAT_MCH_ID=
WECHAT_API_KEY=

# USDT 配置
USDT_TRC20_ADDRESS=
USDT_ERC20_ADDRESS=
USDT_RATE=7.2
"@

$configContent | Out-File -FilePath "$InstallDir\config.env" -Encoding UTF8

Write-Log "配置文件創建完成" "SUCCESS"
Write-Log "請編輯 $InstallDir\config.env 設置您的密鑰" "WARNING"

# ============ 創建啟動腳本 ============

Write-Log "創建啟動腳本..."

$startScript = @"
@echo off
cd /d "$InstallDir"
call venv\Scripts\activate.bat
python license_server.py run --host 0.0.0.0 --port $Port
"@

$startScript | Out-File -FilePath "$InstallDir\start.bat" -Encoding ASCII

# 生成卡密腳本
$generateScript = @"
@echo off
cd /d "$InstallDir"
call venv\Scripts\activate.bat
python license_generator.py generate %1 -n %2
call venv\Scripts\deactivate.bat
pause
"@

$generateScript | Out-File -FilePath "$InstallDir\generate-keys.bat" -Encoding ASCII

# 查看統計腳本
$statsScript = @"
@echo off
cd /d "$InstallDir"
call venv\Scripts\activate.bat
python license_generator.py stats
echo.
python license_generator.py prices
call venv\Scripts\deactivate.bat
pause
"@

$statsScript | Out-File -FilePath "$InstallDir\show-stats.bat" -Encoding ASCII

Write-Log "啟動腳本創建完成" "SUCCESS"

# ============ 創建 Windows 服務 (使用 NSSM) ============

Write-Log "配置 Windows 服務..."

# 下載 NSSM
$nssmPath = "$InstallDir\nssm.exe"
$nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"

if (-not (Test-Path $nssmPath)) {
    Write-Log "下載 NSSM 服務管理器..."
    try {
        $tempZip = "$env:TEMP\nssm.zip"
        Invoke-WebRequest -Uri $nssmUrl -OutFile $tempZip
        Expand-Archive -Path $tempZip -DestinationPath "$env:TEMP\nssm" -Force
        Copy-Item "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe" $nssmPath -Force
        Remove-Item $tempZip -Force
        Remove-Item "$env:TEMP\nssm" -Recurse -Force
    } catch {
        Write-Log "NSSM 下載失敗，請手動安裝服務" "WARNING"
    }
}

if (Test-Path $nssmPath) {
    # 停止並刪除舊服務
    & $nssmPath stop $ServiceName 2>$null
    & $nssmPath remove $ServiceName confirm 2>$null
    
    # 安裝新服務
    & $nssmPath install $ServiceName "$venvPath\Scripts\python.exe" "license_server.py run --host 0.0.0.0 --port $Port"
    & $nssmPath set $ServiceName AppDirectory $InstallDir
    & $nssmPath set $ServiceName DisplayName "TG-Matrix License Server"
    & $nssmPath set $ServiceName Description "TG-Matrix 卡密驗證服務器（王者榮耀風格）"
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    & $nssmPath set $ServiceName AppStdout "$InstallDir\logs\service.log"
    & $nssmPath set $ServiceName AppStderr "$InstallDir\logs\service-error.log"
    
    # 啟動服務
    & $nssmPath start $ServiceName
    
    Write-Log "Windows 服務安裝完成" "SUCCESS"
}

# ============ 配置防火牆 ============

Write-Log "配置防火牆規則..."

$ruleName = "TG-Matrix License Server"
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow

Write-Log "防火牆規則添加完成" "SUCCESS"

# ============ 顯示信息 ============

Write-Host ""
Write-Host "=================================================="
Write-Host "   ✅ TG-Matrix License Server 部署完成！" -ForegroundColor Green
Write-Host "=================================================="
Write-Host ""
Write-Host "📁 安裝目錄: $InstallDir"
Write-Host "🌐 服務地址: http://localhost:$Port"
Write-Host ""
Write-Host "🔧 管理命令:"
Write-Host "  生成卡密: $InstallDir\generate-keys.bat G2 10"
Write-Host "  查看統計: $InstallDir\show-stats.bat"
Write-Host "  啟動服務: $InstallDir\start.bat"
Write-Host ""
Write-Host "🔄 服務管理:"
Write-Host "  啟動: net start $ServiceName"
Write-Host "  停止: net stop $ServiceName"
Write-Host ""
Write-Host "⚠️  重要提醒:" -ForegroundColor Yellow
Write-Host "  1. 請編輯 $InstallDir\config.env 設置 JWT 密鑰"
Write-Host "  2. 如需外網訪問，請配置端口轉發或使用 Nginx"
Write-Host ""
Write-Host "📖 API 端點:"
Write-Host "  POST /api/license/validate - 驗證卡密"
Write-Host "  POST /api/license/activate - 激活卡密"
Write-Host "  POST /api/license/heartbeat - 心跳檢測"
Write-Host ""

# 打開安裝目錄
explorer $InstallDir
