# 快速启动指南

## 1. 安装 Python 依赖

在项目根目录（`tgkz2026`）执行：
```bash
pip install -r backend/requirements.txt
```

## 2. 测试后端独立运行

在项目根目录执行：
```bash
python backend/main.py
```

然后可以手动输入 JSON 命令进行测试：

```json
{"command": "get-initial-state", "payload": {}}
```

按 Enter 后，应该会看到返回的初始状态事件。

## 3. 测试数据库初始化

运行一次 `backend/main.py` 后，检查是否创建了数据库文件：

**Windows:**
```bash
dir backend\data\tgmatrix.db
```

**Mac/Linux:**
```bash
ls backend/data/tgmatrix.db
```

## 4. 与 Electron 集成测试

1. 确保后端依赖已安装
2. 启动 Electron 应用：
   ```bash
   npm start
   ```
3. 检查控制台输出，应该看到：
   - `[Backend] Starting Python backend...`
   - `[Backend] Event: log-entry`
   - `[Backend] Event: initial-state`

## 5. 常见问题

### Python 未找到
- Windows: 确保 Python 已添加到 PATH
- Mac/Linux: 使用 `python3` 而不是 `python`

### 模块未找到
在项目根目录执行：
```bash
pip install -r backend/requirements.txt
```

### 数据库权限错误
确保 `backend/data/` 目录有写权限。

### 通信问题
检查 `electron.js` 中的 Python 路径是否正确。

## 6. 下一步

完成基础架构后，下一步是实现：
1. Pyrogram 集成（Telegram API）
2. 实际的消息监控
3. Excel 文件处理

