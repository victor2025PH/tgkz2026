# Session 文件清理功能说明

## 🐛 问题原因

之前的代码在无法删除 session 文件时，会创建带时间戳的替代文件（例如：`639952947692_1767467644.session`）。这导致：

1. **文件积累**：每次删除失败都会创建一个新文件
2. **无法删除**：这些文件可能仍然被锁定
3. **混乱**：sessions 目录中充满了重复的文件

从截图可以看到，有 23 个 session 文件，其中大部分是带时间戳的替代文件。

---

## ✅ 修复方案

### 1. 修复代码，不再创建替代文件

**修改文件：`backend/telegram_client.py`**

**修复前：**
```python
# 如果删除失败，创建带时间戳的替代文件
timestamp = int(time.time())
session_path = session_path.parent / f"{session_path.stem}_{timestamp}.session"
print(f"[TelegramClient] Using alternative session file: {session_path}", file=sys.stderr)
```

**修复后：**
```python
# 如果删除失败，抛出错误，不再创建替代文件
raise Exception(f"Cannot delete session file after {max_retries} attempts: {pe}")
```

**关键改进：**
- ✅ 在删除 session 文件前，先确保客户端断开连接
- ✅ 使用重试机制（最多 5 次，指数退避）
- ✅ 如果删除失败，**不再创建替代文件**，而是抛出错误
- ✅ 强制垃圾回收释放文件句柄

---

### 2. 添加清理功能

**新函数：`cleanup_orphaned_session_files`（`backend/main.py`）**

**功能：**
- ✅ 识别带时间戳的 session 文件（例如：`639952947692_1767467644.session`）
- ✅ 识别不在数据库中的 session 文件
- ✅ 识别孤立的 journal 文件
- ✅ 使用安全的删除函数（带重试机制）
- ✅ 返回清理统计信息

**清理逻辑：**
1. 获取数据库中所有账户的电话号码
2. 扫描 sessions 目录中的所有 `.session` 文件
3. 对于每个文件：
   - 如果是带时间戳的文件（`phone_timestamp.session`）→ 删除
   - 如果不在数据库中 → 删除
   - 如果在数据库中 → 保留
4. 清理孤立的 `.session.journal` 文件

---

### 3. 添加前端清理按钮

**修改文件：**
- `src/app.component.html`：添加"清理孤立文件"按钮
- `src/app.component.ts`：添加 `cleanupSessionFiles()` 方法和事件监听器

**功能：**
- ✅ 点击按钮时显示确认对话框
- ✅ 发送清理命令到后端
- ✅ 显示清理结果（成功/失败）
- ✅ 显示清理统计信息（删除了多少个文件，保留了多少个文件）

---

## 📋 使用方法

### 方法 1：通过前端界面

1. 打开应用
2. 在账户管理页面，找到"清理孤立文件"按钮（黄色/琥珀色按钮）
3. 点击按钮
4. 确认清理操作
5. 等待清理完成，查看结果

### 方法 2：通过后端命令（开发/调试）

发送以下 JSON 命令到后端：
```json
{
  "command": "cleanup-session-files"
}
```

后端会返回：
```json
{
  "event": "session-files-cleaned",
  "payload": {
    "deleted_count": 21,
    "deleted_files": ["639952947692_1767467644.session", ...],
    "kept_count": 2,
    "kept_files": ["639277356600.session", "639952947692.session"]
  }
}
```

---

## 🎯 清理规则

### 会被删除的文件：

1. **带时间戳的 session 文件**
   - 格式：`{phone}_{timestamp}.session`
   - 例如：`639952947692_1767467644.session`
   - **原因**：这些是之前代码创建的替代文件

2. **不在数据库中的 session 文件**
   - 格式：`{phone}.session`
   - 例如：如果 `639277356600.session` 存在，但数据库中没有这个电话号码的账户
   - **原因**：这是孤立的 session 文件

3. **孤立的 journal 文件**
   - 格式：`{phone}.session.journal`
   - 如果对应的 `.session` 文件不存在
   - **原因**：journal 文件是 SQLite 的临时文件，如果 session 文件不存在，journal 文件也应该被删除

### 会被保留的文件：

1. **在数据库中的 session 文件**
   - 格式：`{phone}.session`
   - 例如：`639277356600.session` 如果数据库中有这个电话号码的账户
   - **原因**：这是有效的 session 文件

---

## 🔧 技术细节

### 识别带时间戳的文件：

使用正则表达式：
```python
timestamp_pattern = re.compile(r'^(\d+)_\d+\.session$')
match = timestamp_pattern.match(filename)
```

- 匹配：`639952947692_1767467644.session` → `phone = "639952947692"`
- 不匹配：`639952947692.session` → 这是正常的 session 文件

### 安全删除：

使用 `safe_delete_session_file` 函数：
- 最多重试 5 次
- 指数退避（0.5s → 0.75s → 1.125s...）
- 每次重试前强制垃圾回收
- 详细日志记录

---

## ⚠️ 注意事项

1. **清理前备份**：虽然清理功能是安全的，但建议在清理前备份 `backend/sessions` 目录

2. **清理时机**：
   - 在应用启动时自动清理（可选，未实现）
   - 手动清理（通过按钮）
   - 定期清理（可选，未实现）

3. **清理不会影响正在使用的账户**：
   - 只删除孤立的文件
   - 保留所有在数据库中的账户的 session 文件

4. **如果清理失败**：
   - 检查文件是否被其他程序占用
   - 检查文件权限
   - 查看后端日志了解详细错误信息

---

## 📊 预期效果

清理前（从截图）：
- 23 个 session 文件
- 大部分是带时间戳的替代文件

清理后（预期）：
- 2 个 session 文件（每个账户一个）
- 所有带时间戳的文件被删除
- 所有孤立的文件被删除

---

## ✅ 修复完成

所有修复已完成：
- ✅ 代码不再创建替代文件
- ✅ 添加了清理功能
- ✅ 添加了前端清理按钮
- ✅ 代码已通过编译

**请重启应用，然后点击"清理孤立文件"按钮来清理这些旧文件！**

