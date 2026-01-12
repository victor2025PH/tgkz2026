# Session 文件管理逻辑说明

## 📋 概述

Session 文件是 Pyrogram 用来存储 Telegram 账户登录凭证的文件。系统有三种方式管理 session 文件：

1. **手动添加账户** - 不会自动生成 session 文件
2. **导入 session 文件** - 从外部导入已有的 session 文件
3. **登录账户** - 登录成功后自动生成 session 文件

## 🔄 完整运行流程

### 方式 1: 手动添加账户

**流程：**

1. **用户在界面填写账户信息：**
   - 电话号码
   - API ID
   - API Hash
   - 代理（可选）
   - 2FA 密码（可选）

2. **前端发送 `add-account` 命令：**
   ```json
   {
     "command": "add-account",
     "payload": {
       "phone": "+639952947692",
       "apiId": "123456",
       "apiHash": "abc...",
       "proxy": "",
       "twoFactorPassword": ""
     }
   }
   ```

3. **后端处理：**
   - 验证账户信息
   - 将账户信息保存到数据库
   - **不创建 session 文件** ❌
   - 账户状态设置为 "Offline"

4. **结果：**
   - ✅ 账户已添加到数据库
   - ❌ **没有 session 文件**
   - 账户状态：`Offline`

**重要：** 手动添加账户时，**不会自动生成 session 文件**。需要后续登录才能生成。

---

### 方式 2: 导入 Session 文件

**流程：**

1. **用户点击"导入会话"按钮**

2. **前端打开文件选择对话框：**
   - 用户选择 `.session` 文件
   - 文件路径发送到后端

3. **前端发送 `import-session` 命令：**
   ```json
   {
     "command": "import-session",
     "payload": {
       "filePath": "C:\\path\\to\\639952947692.session"
     }
   }
   ```

4. **后端处理：**
   - 读取 session 文件路径
   - 从文件名提取电话号码（例如：`639952947692.session` → `+639952947692`）
   - **复制 session 文件到 `backend/sessions/` 目录**
   - 尝试从 session 文件获取账户信息（如果可能）
   - 如果账户不存在，创建新账户
   - 如果账户已存在，更新账户信息

5. **结果：**
   - ✅ Session 文件已复制到 `backend/sessions/`
   - ✅ 账户已创建或更新
   - ✅ 账户状态：可能是 "Online"（如果 session 有效）

**重要：** 导入 session 文件时，**会复制文件到系统目录**，并尝试自动创建或更新账户。

---

### 方式 3: 登录账户（生成 Session 文件）

**流程：**

1. **用户点击"登录"按钮**

2. **前端发送 `login-account` 命令：**
   ```json
   {
     "command": "login-account",
     "payload": 1  // account_id
   }
   ```

3. **后端处理：**

   **步骤 3.1: 检查 session 文件**
   - 检查 `backend/sessions/639952947692.session` 是否存在
   - 如果存在，尝试使用它
   - 如果 session 有效，直接登录成功
   - 如果 session 无效，删除它并重新登录

   **步骤 3.2: 发送验证码（如果没有 session 或 session 无效）**
   - 调用 `client.send_code(phone)`
   - 返回 `phone_code_hash`
   - 发送 `login-requires-code` 事件到前端
   - 前端显示验证码输入框

   **步骤 3.3: 用户输入验证码**
   - 前端发送 `login-account` 命令，包含验证码：
     ```json
     {
       "command": "login-account",
       "payload": {
         "accountId": 1,
         "phoneCode": "123456",
         "phoneCodeHash": "abc..."
       }
     }
     ```

   **步骤 3.4: 验证验证码**
   - 调用 `client.sign_in(phone, phone_code_hash, phone_code)`
   - 如果账户有 2FA，返回 `SessionPasswordNeeded`
   - 如果账户没有 2FA，登录成功

   **步骤 3.5: 处理 2FA（如果需要）**
   - 如果返回 `SessionPasswordNeeded`，发送 `login-requires-2fa` 事件
   - 前端显示 2FA 输入框
   - 用户输入 2FA 密码
   - 调用 `client.check_password(two_factor_password)`

   **步骤 3.6: 登录成功**
   - Pyrogram **自动创建 session 文件** ✅
   - Session 文件保存在：`backend/sessions/639952947692.session`
   - 账户状态更新为 "Online"

4. **结果：**
   - ✅ **Session 文件已自动生成**
   - ✅ 账户状态：`Online`
   - ✅ 可以开始使用账户

**重要：** 登录成功后，**Pyrogram 会自动创建 session 文件**。下次登录时，如果 session 文件有效，可以直接登录，无需验证码。

---

### 方式 4: 重新加载 Session 文件

**流程：**

1. **用户点击"重新加载会话"按钮**

2. **前端发送 `reload-sessions-and-accounts` 命令**

3. **后端处理：**
   - 扫描 `backend/sessions/` 目录
   - 查找所有 `.session` 文件
   - 对每个 session 文件：
     - 从文件名提取电话号码
     - 检查数据库中是否存在该账户
     - 如果不存在，创建新账户
     - 如果存在，更新账户信息
   - 检查数据库中的账户是否有对应的 session 文件
   - 如果没有，标记账户状态

4. **结果：**
   - ✅ 所有 session 文件已扫描
   - ✅ 账户列表已同步

**重要：** 这个功能用于**同步 session 文件和数据库**，确保两者一致。

---

## 📁 Session 文件位置

所有 session 文件都保存在：
```
backend/sessions/
├── 639952947692.session
├── 8613800138000.session
└── ...
```

文件名格式：`{电话号码（去除+号）}.session`

例如：
- `+639952947692` → `639952947692.session`
- `+8613800138000` → `8613800138000.session`

---

## 🔄 Session 文件生命周期

### 创建 Session 文件

Session 文件在以下情况创建：

1. **登录成功时：**
   - Pyrogram 自动创建
   - 保存登录凭证
   - 下次登录可以直接使用

2. **导入 session 文件时：**
   - 从外部复制到系统目录
   - 保持原有登录状态

### 使用 Session 文件

Session 文件在以下情况使用：

1. **登录时：**
   - 如果 session 文件存在且有效，直接登录
   - 如果 session 文件无效，删除并重新登录

2. **检查账户状态时：**
   - 尝试连接 session 文件
   - 检查账户是否在线

3. **发送消息时：**
   - 使用 session 文件中的连接
   - 发送消息到 Telegram

### 删除 Session 文件

Session 文件在以下情况删除：

1. **手动删除：**
   - 用户手动删除文件
   - 或使用清理脚本

2. **自动删除：**
   - Session 文件无效时自动删除
   - 账户删除时（可选）

---

## 🎯 关键点总结

### 手动添加账户时：

- ✅ **会创建账户记录**（保存到数据库）
- ❌ **不会创建 session 文件**
- ⚠️ **需要后续登录才能生成 session 文件**

### 导入 Session 文件时：

- ✅ **会复制 session 文件**到系统目录
- ✅ **会创建或更新账户记录**
- ✅ **如果 session 有效，账户可能直接在线**

### 登录账户时：

- ✅ **如果 session 文件存在且有效：** 直接登录，无需验证码
- ✅ **如果 session 文件不存在或无效：** 发送验证码，登录成功后**自动创建 session 文件**

### Session 文件的作用：

- 🔐 **存储登录凭证**：避免每次都需要验证码
- ⚡ **快速登录**：如果 session 有效，可以直接登录
- 💾 **持久化登录状态**：应用重启后仍然保持登录

---

## 📝 当前状态

我已经帮您删除了旧的 session 文件：`backend/sessions/639952947692.session`

**现在请操作：**

1. **重新启动应用**（如果正在运行）
2. **点击"登录"按钮**
3. **应该会显示验证码输入框** ✅
4. **输入验证码后登录成功**
5. **系统会自动创建新的 session 文件**

---

**最后更新：** 2026-01-02

