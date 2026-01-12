# TG-Matrix Backend

Python 后端服务，负责处理 Telegram API 集成、数据库操作和与 Electron 主进程的通信。

## 架构

```
[Angular Frontend] <--IPC--> [Electron Main] <--stdin/stdout--> [Python Backend]
```

## 安装

1. 确保已安装 Python 3.8 或更高版本

2. 在项目根目录（`tgkz2026`）安装依赖：
```bash
pip install -r backend/requirements.txt
```

## 运行

### 开发模式

在项目根目录运行主程序：
```bash
python backend/main.py
```

程序将从标准输入读取 JSON 格式的命令，并通过标准输出发送 JSON 格式的事件。

### 命令格式

**输入（stdin）：**
```json
{
  "command": "command-name",
  "payload": {}
}
```

**输出（stdout）：**
```json
{
  "event": "event-name",
  "payload": {}
}
```

## 项目结构

```
backend/
├── main.py          # 主程序入口，处理命令和事件
├── database.py      # 数据库操作类
├── config.py        # 配置管理
├── requirements.txt # Python 依赖
├── data/            # 数据库文件目录（自动创建）
├── sessions/        # Pyrogram 会话文件目录（自动创建）
├── logs/            # 日志文件目录（自动创建）
└── templates/       # Excel 模板目录（自动创建）
```

## 数据库

使用 SQLite 数据库，文件位置：`data/tgmatrix.db`

数据库会在首次运行时自动初始化，创建所有必要的表结构。

## 已实现的命令

- ✅ `get-initial-state` - 获取初始状态
- ✅ `add-account` - 添加账户
- ✅ `login-account` - 登录账户（支持验证码和2FA）
- ✅ `check-account-status` - 检查账户状态
- ✅ `update-account-data` - 更新账户数据
- ✅ `bulk-assign-role` - 批量分配角色
- ✅ `bulk-assign-group` - 批量分配分组
- ✅ `bulk-delete-accounts` - 批量删除账户
- ✅ `remove-account` - 删除账户
- ✅ `start-monitoring` - 启动监控（支持群组消息监控和关键词匹配）
- ✅ `stop-monitoring` - 停止监控
- ✅ `add-keyword-set` - 添加关键词集
- ✅ `remove-keyword-set` - 删除关键词集
- ✅ `add-keyword` - 添加关键词
- ✅ `remove-keyword` - 删除关键词
- ✅ `add-group` - 添加监控群组
- ✅ `remove-group` - 移除监控群组
- ✅ `add-template` - 添加消息模板
- ✅ `remove-template` - 删除模板
- ✅ `toggle-template-status` - 切换模板状态
- ✅ `add-campaign` - 添加自动化活动
- ✅ `remove-campaign` - 删除活动
- ✅ `toggle-campaign-status` - 切换活动状态
- ✅ `send-message` - 发送消息（通过Pyrogram实际发送）
- ✅ `update-lead-status` - 更新潜在客户状态
- ✅ `add-to-dnc` - 添加到"请勿联系"列表
- ✅ `clear-logs` - 清除日志
- ✅ `load-accounts-from-excel` - 从 Excel 加载账户
- ✅ `export-leads-to-excel` - 导出潜在客户到 Excel
- ✅ `reload-sessions-and-accounts` - 重新加载会话
- ✅ `import-session` - 导入会话文件
- ✅ `export-session` - 导出会话文件

## 已实现功能

- ✅ Pyrogram 集成（Telegram API）- 完整的账户登录、消息发送、群组监控
- ✅ 实际的消息监控功能 - 实时监控群组消息，匹配关键词，捕获潜在客户
- ✅ 实际的消息发送功能 - 通过Pyrogram发送消息，支持Flood Wait处理
- ✅ Excel 文件处理 - 批量导入账户、导出潜在客户
- ✅ 会话文件管理 - 导入、导出、自动扫描会话文件
- ✅ 账户健康监控 - 定期检查账户状态，计算健康分数
- ✅ 自动化活动执行 - 关键词触发后自动执行活动，发送消息

## 环境变量

可选的环境变量：
- `TELEGRAM_API_ID` - Telegram API ID
- `TELEGRAM_API_HASH` - Telegram API Hash

## 注意事项

1. 所有消息必须以换行符（\n）结尾
2. 所有 JSON 必须使用 UTF-8 编码
3. 时间戳使用 ISO 8601 格式（YYYY-MM-DDTHH:mm:ss.sssZ）
4. 数据库操作使用异步 aiosqlite
5. 程序通过 stdin/stdout 与 Electron 通信

## 开发说明

### 添加新命令

1. 在 `main.py` 的 `handle_command` 方法中添加路由
2. 实现对应的处理函数（如 `handle_new_command`）
3. 在 `database.py` 中添加必要的数据库操作（如需要）

### 添加新事件

使用 `send_event` 方法发送事件：
```python
self.send_event("event-name", payload)
```

### 数据库操作

所有数据库操作都在 `database.py` 中的 `Database` 类中实现。使用异步方法：
```python
await db.add_account(account_data)
accounts = await db.get_all_accounts()
```

## 故障排除

### 数据库锁定错误
确保没有多个进程同时访问数据库文件。

### 通信问题
检查 stdin/stdout 是否正确连接，确保 JSON 格式正确。

### 导入错误
确保所有依赖都已安装（在项目根目录执行）：
```bash
pip install -r backend/requirements.txt
```

