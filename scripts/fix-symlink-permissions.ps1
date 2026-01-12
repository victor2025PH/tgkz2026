# PowerShell script to fix symbolic link permissions for electron-builder
# Run this script as Administrator

Write-Host "🔧 修复 Electron Builder 符号链接权限" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ 此脚本需要管理员权限！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请右键点击 PowerShell，选择'以管理员身份运行'，然后重新运行此脚本。" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ 已检测到管理员权限" -ForegroundColor Green
Write-Host ""

# Method 1: Enable Developer Mode (Windows 10/11)
Write-Host "方法 1: 启用开发者模式（推荐）" -ForegroundColor Cyan
Write-Host "   这将允许普通用户创建符号链接"
Write-Host ""

$regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"
$regName = "AllowDevelopmentWithoutDevLicense"

try {
    $currentValue = Get-ItemProperty -Path $regPath -Name $regName -ErrorAction SilentlyContinue
    
    if ($currentValue.$regName -eq 1) {
        Write-Host "✅ 开发者模式已启用" -ForegroundColor Green
    } else {
        Write-Host "正在启用开发者模式..." -ForegroundColor Yellow
        Set-ItemProperty -Path $regPath -Name $regName -Value 1 -Type DWord
        Write-Host "✅ 开发者模式已启用" -ForegroundColor Green
        Write-Host "⚠️  请重启计算机以使更改生效" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  无法修改注册表（可能需要手动启用）" -ForegroundColor Yellow
    Write-Host "   请手动操作：设置 → 更新和安全 → 开发者选项 → 启用开发人员模式" -ForegroundColor Yellow
}

Write-Host ""

# Method 2: Clear electron-builder cache
Write-Host "方法 2: 清除 Electron Builder 缓存" -ForegroundColor Cyan
$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache"

if (Test-Path $cacheDir) {
    Write-Host "正在清除缓存: $cacheDir" -ForegroundColor Yellow
    try {
        Remove-Item -Path $cacheDir -Recurse -Force -ErrorAction Stop
        Write-Host "✅ 缓存已清除" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  清除缓存时出错: $_" -ForegroundColor Yellow
        Write-Host "   可以手动删除: $cacheDir" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  缓存目录不存在" -ForegroundColor Gray
}

Write-Host ""

# Method 3: Grant current user permission to create symbolic links
Write-Host "方法 3: 授予当前用户创建符号链接的权限" -ForegroundColor Cyan
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

try {
    # This requires SeCreateSymbolicLinkPrivilege
    # Note: This is a complex operation and may not work on all systems
    Write-Host "ℹ️  符号链接权限通常通过开发者模式或组策略管理" -ForegroundColor Gray
    Write-Host "   如果开发者模式已启用，此步骤通常不需要" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  无法直接授予权限（这是正常的）" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ 修复完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "   1. 如果启用了开发者模式，请重启计算机" -ForegroundColor White
Write-Host "   2. 重新运行打包命令: npm run package:win" -ForegroundColor White
Write-Host ""
pause

