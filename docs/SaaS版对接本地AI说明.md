# SaaS 版对接本地 AI 说明

部署为 SaaS 后，前端在**用户浏览器**中运行，调用「本地 AI」时请求由**浏览器**发往你填写的 **API 端点**。因此只要该端点能从公网访问（例如通过 Tailscale Funnel、ngrok 等暴露本地服务），即可在 SaaS 里使用你本地部署的 AI。

---

## 一、整体流程

1. **在运行 Ollama/本地 AI 的机器上**：把本地 AI 服务暴露到公网（推荐 Tailscale Funnel）。
2. **在 SaaS 控制台**：智能引擎 → 模型配置 → 添加本地 AI，填写上述公网可访问的「API 端点」和模型名。
3. **使用**：在智能营销、对话等场景选择该「本地 AI」即可，请求会从浏览器发到你本地。

---

## 二、暴露本地 AI 到公网（二选一）

### 方式 1：Tailscale Funnel（推荐，界面已提示）

1. 在运行 Ollama 的机器上安装 [Tailscale](https://tailscale.com/) 并登录。
2. 暴露本机 Ollama 端口（默认 11434）：
   ```bash
   tailscale funnel 11434
   ```
   若本地用 Nginx/Caddy 做了反向代理并提供 `/api/chat`，则暴露代理端口，例如：
   ```bash
   tailscale funnel 8080
   ```
3. 记下 Funnel 给出的公网 URL，形如：  
   `https://xxx.tail1234.ts.net`  
   若直接暴露 11434，则 API 端点填：  
   `https://xxx.tail1234.ts.net/api/chat`  
   （Ollama 的 chat 接口路径为 `/api/chat`。）

### 方式 2：ngrok

1. 安装并登录 [ngrok](https://ngrok.com/)。
2. 暴露 Ollama 端口：
   ```bash
   ngrok http 11434
   ```
3. 使用 ngrok 给出的 `https://xxx.ngrok.io`，API 端点填：  
   `https://xxx.ngrok.io/api/chat`

---

## 三、在 SaaS 中配置「本地 AI」

1. 登录 SaaS 控制台，进入 **智能引擎**（或「AI 智能」→ 智能引擎）。
2. 打开 **模型配置** Tab，在「本地 AI」区域点击 **+ 添加本地 AI**。
3. 在弹窗中填写：
   - **API 端点 \***：上一步得到的公网地址 + `/api/chat`  
     例如：`https://ms-defysomwqybz.tail05a567.ts.net/api/chat`
   - **模型名称 \***：与本地一致，如 `qwen2.5:latest` 或 `huihui_ai/qwen2.5-abliterate`  
     本地可执行 `ollama list` 查看。
   - **显示名称（可选）**：如「我的本地 AI」。
4. 点击 **测试连接**，通过后再点 **保存**。

保存后，在智能营销、多角色、对话等场景中即可选择该「本地 AI」使用。

---

## 四、接口要求

- 本地服务需提供 **Ollama 兼容**的 HTTP 接口：  
  `POST /api/chat`，请求体含 `model`、`messages` 等（与 Ollama 一致）。
- 若本地不是 Ollama 而是自建服务，需实现相同格式的 `/api/chat`，否则需在现有前端/后端增加适配（当前实现按 Ollama 格式调用）。

---

## 五、注意事项

- **谁在调用**：SaaS 下由**用户浏览器**直接请求你填写的 API 端点，不经 SaaS 服务器转发，因此端点必须对「用户当前网络」可访问（公网 URL 即可）。
- **HTTPS**：Tailscale Funnel、ngrok 均提供 HTTPS，建议使用；部分浏览器对混合内容（页面 HTTPS、请求 HTTP）有限制。
- **稳定性**：家庭网络或笔记本关机后，Funnel/ngrok URL 会不可用，此时 SaaS 会提示连接失败，可改用云端模型或恢复本地服务后再用。

---

*文档版本：v1.0*
