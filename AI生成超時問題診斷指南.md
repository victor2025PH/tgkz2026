# AI 生成超時問題診斷指南

## 🔍 問題分析

根據您的描述，在另一台電腦上 AI 生成是**秒回**的，但在這台電腦上**超時**。這表明問題不是 AI 服務本身的問題，而是**這台電腦與 AI 服務之間的連接問題**。

## 📋 診斷步驟

### 步驟 1: 檢查 AI 服務是否可訪問

#### 方法 1: 使用瀏覽器測試
1. 打開瀏覽器
2. 訪問：`http://100.84.60.15:11434`
3. 如果看到 "Ollama is running"，說明服務正常
4. 如果無法訪問，說明網絡連接有問題

#### 方法 2: 使用命令行測試（Windows PowerShell）
```powershell
# 測試 TCP 連接
Test-NetConnection -ComputerName 100.84.60.15 -Port 11434

# 如果連接失敗，會顯示：
# - TcpTestSucceeded: False
# - 可能的原因：防火牆阻塞、服務未運行、網絡路由問題
```

#### 方法 3: 使用 curl 測試（如果已安裝）
```powershell
# 測試基本連接
curl http://100.84.60.15:11434

# 測試 AI API
curl -X POST http://100.84.60.15:11434/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{"model":"huihui_ai/qwen2.5-abliterate","messages":[{"role":"user","content":"test"}]}'
```

### 步驟 2: 檢查防火牆設置

#### Windows 防火牆檢查
1. 打開「Windows Defender 防火牆」
2. 點擊「進階設定」
3. 檢查「輸出規則」中是否有阻止 Python 或 Node.js 的規則
4. 檢查是否有規則阻止端口 11434

#### 臨時測試：暫時關閉防火牆
1. 打開「Windows Defender 防火牆」
2. 點擊「開啟或關閉 Windows Defender 防火牆」
3. **暫時**關閉防火牆（僅用於測試）
4. 測試 AI 生成是否正常
5. **測試完成後立即重新開啟防火牆**

### 步驟 3: 檢查網絡路由

#### 檢查是否能 ping 通 AI 服務器
```powershell
ping 100.84.60.15
```

如果 ping 不通，可能原因：
- 服務器不在同一網絡
- 服務器防火牆阻止了 ICMP
- 網絡路由配置問題

#### 檢查路由表
```powershell
route print | findstr "100.84.60"
```

### 步驟 4: 檢查代理設置

#### 檢查系統代理
1. 打開「設定」→「網路和網際網路」→「Proxy」
2. 檢查是否配置了代理
3. 如果配置了代理，檢查代理是否正常工作
4. 嘗試暫時禁用代理進行測試

#### 檢查環境變量
```powershell
echo $env:HTTP_PROXY
echo $env:HTTPS_PROXY
echo $env:NO_PROXY
```

### 步驟 5: 使用應用內診斷工具

我已經添加了詳細的診斷功能。在應用中：

1. 進入「設置」頁面
2. 找到「本地 AI 設置」
3. 點擊「測試連接」按鈕
4. 查看診斷結果，會顯示：
   - TCP 連接狀態
   - HTTP 連接狀態
   - AI 響應測試結果
   - 詳細的錯誤信息

### 步驟 6: 檢查後端日誌

查看後端控制台的詳細日誌：

1. 啟動應用後，查看後端控制台（Electron 主進程）
2. 當 AI 生成超時時，應該看到類似這樣的日誌：
   ```
   [AI] _call_local_ai called with endpoint: http://100.84.60.15:11434/v1/chat/completions
   [AI] Diagnosing connection to 100.84.60.15:11434...
   [AI] ✓ TCP connection to 100.84.60.15:11434 successful
   [AI] Attempting to call AI endpoint: ...
   [AI] ✗ Request timeout after X.XXs
   ```

3. 根據日誌判斷問題：
   - 如果看到「TCP connection failed」：網絡連接問題
   - 如果看到「DNS resolution failed」：DNS 問題
   - 如果看到「Request timeout」：AI 服務響應慢或無響應

## 🛠️ 常見問題和解決方案

### 問題 1: TCP 連接失敗

**症狀：** 日誌顯示「TCP connection failed」

**可能原因：**
- 防火牆阻止了連接
- AI 服務未運行
- 端口被其他程序占用

**解決方案：**
1. 檢查 Windows 防火牆設置
2. 確認 AI 服務正在運行（在另一台電腦上檢查）
3. 檢查端口是否被占用：
   ```powershell
   netstat -ano | findstr "11434"
   ```

### 問題 2: DNS 解析失敗

**症狀：** 日誌顯示「DNS resolution failed」

**可能原因：**
- 主機名無法解析（如果使用域名）
- DNS 服務器配置問題

**解決方案：**
1. 如果使用 IP 地址（如 `100.84.60.15`），不應該有 DNS 問題
2. 如果使用域名，檢查 DNS 設置
3. 嘗試直接使用 IP 地址

### 問題 3: 連接超時

**症狀：** TCP 連接成功，但 HTTP 請求超時

**可能原因：**
- AI 服務響應過慢
- 網絡延遲過高
- AI 模型正在加載

**解決方案：**
1. 檢查 AI 服務的資源使用情況（CPU、內存、GPU）
2. 檢查網絡延遲：
   ```powershell
   Test-NetConnection -ComputerName 100.84.60.15 -Port 11434 -InformationLevel Detailed
   ```
3. 嘗試增加超時時間（已在代碼中設置為 90 秒）

### 問題 4: 防火牆阻止

**症狀：** 在另一台電腦正常，這台電腦超時

**解決方案：**
1. 添加防火牆規則允許 Python 訪問網絡：
   ```powershell
   # 以管理員身份運行 PowerShell
   New-NetFirewallRule -DisplayName "Allow Python" -Direction Outbound -Program "C:\Python\python.exe" -Action Allow
   ```

2. 或者允許特定端口：
   ```powershell
   New-NetFirewallRule -DisplayName "Allow AI Service" -Direction Outbound -RemotePort 11434 -Action Allow
   ```

### 問題 5: 代理設置問題

**症狀：** 公司網絡或使用代理

**解決方案：**
1. 檢查是否需要配置代理
2. 在後端代碼中配置代理（如果需要）
3. 將 AI 服務 IP 添加到 `NO_PROXY` 環境變量

## 🔧 快速診斷命令

創建一個 PowerShell 腳本進行快速診斷：

```powershell
# 保存為 test-ai-connection.ps1

$endpoint = "100.84.60.15"
$port = 11434

Write-Host "=== AI 服務連接診斷 ===" -ForegroundColor Cyan
Write-Host ""

# 1. Ping 測試
Write-Host "1. Ping 測試..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $endpoint -Count 2 -Quiet
if ($ping) {
    Write-Host "   ✓ Ping 成功" -ForegroundColor Green
} else {
    Write-Host "   ✗ Ping 失敗" -ForegroundColor Red
}

# 2. TCP 連接測試
Write-Host "2. TCP 連接測試..." -ForegroundColor Yellow
$tcp = Test-NetConnection -ComputerName $endpoint -Port $port -WarningAction SilentlyContinue
if ($tcp.TcpTestSucceeded) {
    Write-Host "   ✓ TCP 連接成功" -ForegroundColor Green
} else {
    Write-Host "   ✗ TCP 連接失敗" -ForegroundColor Red
    Write-Host "   可能原因：防火牆阻塞、服務未運行" -ForegroundColor Yellow
}

# 3. HTTP 連接測試
Write-Host "3. HTTP 連接測試..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://${endpoint}:${port}" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✓ HTTP 連接成功 (狀態碼: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ✗ HTTP 連接失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. 檢查防火牆規則
Write-Host "4. 檢查防火牆規則..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Python*" -or $_.DisplayName -like "*Node*" }
if ($firewallRules) {
    Write-Host "   找到相關防火牆規則：" -ForegroundColor Yellow
    $firewallRules | ForEach-Object { Write-Host "   - $($_.DisplayName): $($_.Action)" }
} else {
    Write-Host "   未找到相關防火牆規則" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 診斷完成 ===" -ForegroundColor Cyan
```

運行方法：
```powershell
.\test-ai-connection.ps1
```

## 📊 對比測試

### 在正常工作的電腦上：
1. 記錄網絡配置：
   - IP 地址
   - 子網掩碼
   - 默認網關
   - DNS 服務器
   - 代理設置

### 在問題電腦上：
1. 對比網絡配置
2. 檢查是否有差異
3. 特別注意：
   - 是否在同一網絡
   - 防火牆規則是否不同
   - 代理設置是否不同

## 🎯 最可能的原因

根據您的描述（另一台電腦秒回，這台電腦超時），最可能的原因是：

1. **防火牆阻止**（最常見）
   - Windows 防火牆阻止了 Python 的網絡訪問
   - 企業防火牆規則

2. **網絡路由問題**
   - 這台電腦無法正確路由到 `100.84.60.15`
   - 網絡配置不同

3. **代理設置**
   - 這台電腦配置了代理，但代理無法訪問 AI 服務

## ✅ 快速修復建議

1. **首先嘗試：** 暫時關閉防火牆測試（僅用於診斷）
2. **檢查日誌：** 查看後端控制台的詳細錯誤信息
3. **使用診斷工具：** 在應用中點擊「測試連接」按鈕
4. **對比配置：** 與正常工作的電腦對比網絡配置

## 📝 需要提供的信息

如果問題持續，請提供：

1. **後端日誌**（從啟動到超時的完整日誌）
2. **診斷結果**（使用應用內的測試連接功能）
3. **網絡配置**（IP、子網、網關、DNS）
4. **防火牆規則**（相關的輸出規則）
5. **兩台電腦的差異**（網絡配置、防火牆設置等）

這些信息將幫助我進一步診斷問題。
