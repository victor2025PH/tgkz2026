# Telegram 聊天記錄自動學習 RAG 系統

## 系統概述

這是一個從 Telegram 聊天記錄自動學習的 RAG (Retrieval-Augmented Generation) 系統。它能夠：

1. **自動學習** - 從聊天對話中自動提取 Q&A、成功話術、異議處理等知識
2. **智能檢索** - 使用向量搜索和關鍵詞搜索的混合方式找到最相關的知識
3. **增強生成** - 將檢索到的知識注入 AI 回覆的上下文中，提升回覆質量
4. **反饋學習** - 通過用戶反饋不斷優化知識質量

## 核心組件

### 1. TelegramRAGSystem (`telegram_rag_system.py`)

核心 RAG 系統，提供：

- **知識提取** - 從對話中自動提取多種類型的知識
- **向量存儲** - 支持 ChromaDB（可選）和 SQLite 向量存儲
- **語義搜索** - 使用嵌入向量進行語義相似度搜索
- **混合搜索** - 結合向量搜索和關鍵詞搜索
- **質量評分** - 根據對話結果和反饋自動調整知識質量

### 2. ChatHistoryIndexer (`chat_history_indexer.py`)

聊天記錄索引服務，提供：

- **自動監控** - 監控新的聊天記錄並觸發學習
- **後台索引** - 定期批量處理歷史對話
- **智能識別** - 自動識別高價值對話優先學習

### 3. 整合模組

- `knowledge_learner.py` - 已整合 RAG 系統，提供向下兼容
- `ai_auto_chat.py` - 已整合 RAG 上下文增強

## 知識類型

系統支持以下知識類型：

| 類型 | 說明 | 自動提取條件 |
|------|------|--------------|
| `qa` | 問答對 | 用戶提問 → AI 回覆 |
| `script` | 成功話術 | 成交/感興趣對話中的回覆 |
| `objection` | 異議處理 | 用戶異議 → 成功處理 |
| `product` | 產品信息 | 手動添加 |
| `greeting` | 開場白 | 手動添加 |
| `closing` | 成交話術 | 手動添加 |
| `faq` | 常見問題 | 手動添加 |

## API 命令

### 初始化 RAG 系統

```javascript
// 發送命令
{ "command": "init-rag-system" }

// 回應事件: rag-initialized
{ "success": true }
```

### 獲取 RAG 統計

```javascript
// 發送命令
{ "command": "get-rag-stats" }

// 回應事件: rag-stats
{
  "success": true,
  "rag": {
    "total_knowledge": 150,
    "by_type": {
      "Q&A 問答": { "count": 80, "avg_score": 0.72, "uses": 245 },
      "成功話術": { "count": 45, "avg_score": 0.85, "uses": 123 }
    },
    "chromadb_enabled": true,
    "neural_embedding": true
  },
  "indexer": {
    "total_indexed": 350,
    "today": { "indexed": 12, "knowledge": 8 }
  }
}
```

### 搜索 RAG 知識庫

```javascript
// 發送命令
{
  "command": "search-rag",
  "payload": {
    "query": "價格多少",
    "limit": 5,
    "knowledgeType": "qa"  // 可選：qa, script, objection, etc.
  }
}

// 回應事件: rag-search-result
{
  "success": true,
  "query": "價格多少",
  "results": [
    {
      "id": 1,
      "type": "qa",
      "question": "這個多少錢？",
      "answer": "我們的服務價格從 xxx 起...",
      "successScore": 0.85,
      "similarity": 0.92,
      "source": "vector"
    }
  ]
}
```

### 觸發 RAG 學習

```javascript
// 學習特定用戶的對話
{
  "command": "trigger-rag-learning",
  "payload": {
    "userId": "user123",
    "accountPhone": "+886912345678",
    "outcome": "converted"  // converted, interested, negotiating, churned
  }
}

// 批量處理待索引對話
{
  "command": "trigger-rag-learning",
  "payload": {}
}

// 回應事件: rag-learning-triggered
{
  "success": true,
  "conversationsProcessed": 15,
  "knowledgeExtracted": 42
}
```

### 手動添加知識

```javascript
{
  "command": "add-rag-knowledge",
  "payload": {
    "type": "faq",
    "question": "你們的營業時間？",
    "answer": "我們的營業時間是週一到週五 9:00-18:00。",
    "context": ""
  }
}

// 回應事件: rag-knowledge-added
{
  "success": true,
  "knowledgeId": 123
}
```

### 記錄反饋

```javascript
{
  "command": "rag-feedback",
  "payload": {
    "knowledgeId": 123,
    "isPositive": true,
    "feedbackText": "回覆非常準確"
  }
}

// 回應事件: rag-feedback-recorded
{
  "success": true,
  "knowledgeId": 123
}
```

### 重新索引對話

```javascript
{
  "command": "reindex-conversations",
  "payload": {
    "highValueOnly": true,  // 只索引高價值對話（成交/感興趣）
    "days": 30              // 時間範圍
  }
}

// 回應事件: rag-reindex-complete
{
  "success": true,
  "conversations_processed": 50,
  "knowledge_extracted": 120
}
```

### 清理知識庫

```javascript
{
  "command": "cleanup-rag-knowledge",
  "payload": {
    "minScore": 0.2,        // 最低質量評分
    "daysOld": 30,          // 清理 N 天前的低質量知識
    "mergeSimilar": true    // 合併相似知識
  }
}

// 回應事件: rag-cleanup-complete
{
  "success": true,
  "deleted": 15,
  "merged": 8
}
```

## 安裝可選依賴

系統在沒有額外依賴的情況下也能運行，但安裝以下依賴可以提升效果：

### ChromaDB (向量數據庫)

```bash
pip install chromadb
```

提供更快的向量搜索和持久化存儲。

### Sentence Transformers (神經網絡嵌入)

```bash
pip install sentence-transformers
```

提供更準確的語義理解。使用 `paraphrase-multilingual-MiniLM-L12-v2` 模型支持中文。

## 工作流程

### 自動學習流程

```
1. 用戶發送消息 → 2. AI 回覆 → 3. 對話結束
                                    ↓
4. ChatHistoryIndexer 監控到對話結束
                                    ↓
5. 評估對話質量（根據結果、長度、參與度）
                                    ↓
6. 提取知識（Q&A、話術、異議處理）
                                    ↓
7. 向量化並存儲到知識庫
                                    ↓
8. 下次 AI 回覆時檢索相關知識作為上下文
```

### RAG 增強流程

```
1. 用戶發送消息
        ↓
2. TelegramRAGSystem.build_rag_context()
        ↓
3. 向量搜索 + 關鍵詞搜索
        ↓
4. 返回最相關的知識項
        ↓
5. 注入系統提示詞
        ↓
6. AI 生成增強回覆
```

## 質量評分機制

知識的質量評分 (success_score) 由以下因素決定：

1. **對話結果** (40%)
   - 已成交: +0.5
   - 有興趣: +0.3
   - 洽談中: +0.25
   - 已流失: -0.1

2. **對話長度** (20%)
   - 15+ 條消息: +0.2
   - 10+ 條消息: +0.15
   - 5+ 條消息: +0.1

3. **用戶參與度** (20%)
   - 用戶消息 5+ 條: +0.1
   - 回復比例高: +0.1

4. **反饋調整** (動態)
   - 正面反饋: 提升評分
   - 負面反饋: 降低評分

## 配置選項

在 AI 設置中可以配置：

```javascript
{
  "rag_enabled": true,      // 是否啟用 RAG
  "max_rag_items": 3,       // 最大知識項數
  "min_similarity": 0.4,    // 最小相似度閾值
  "auto_learning": true     // 是否自動學習
}
```

## 注意事項

1. **首次使用**：需要先初始化 RAG 系統 (`init-rag-system`)
2. **冷啟動**：新系統需要積累一定對話才會有知識庫
3. **質量控制**：定期運行 `cleanup-rag-knowledge` 清理低質量知識
4. **手動補充**：可以手動添加 FAQ 和產品知識提升效果
5. **反饋循環**：鼓勵標記有用/無用的回覆以優化知識質量

## 前端使用指南

### 訪問 RAG 系統設置

在應用程序中，導航到 **設置** 頁面，向下滾動找到 **🤖 Telegram 自動學習 RAG** 區塊。

### 界面功能說明

#### 統計卡片
- **💡 總知識量** - 知識庫中的總知識條目數
- **❓ 學習的問答** - 自動學習的 Q&A 對數量
- **💬 學習的話術** - 從成功對話中提取的話術數量
- **📊 總使用次數** - 知識被檢索使用的總次數

#### 系統狀態
- 顯示 RAG 系統是否在線
- 顯示使用的向量數據庫類型（ChromaDB 或 SQLite）
- 顯示嵌入模型類型（Neural 或 Simple）

#### 操作按鈕

| 按鈕 | 功能 |
|------|------|
| 🚀 初始化 RAG | 首次使用時點擊，初始化 RAG 系統 |
| 🎓 從聊天學習 | 觸發批量學習，從待處理的聊天記錄中學習 |
| 🔄 重建高價值索引 | 重新處理成交/感興趣用戶的對話 |
| 🧹 清理知識庫 | 刪除低質量知識，合併重複項 |
| 📊 刷新統計 | 更新統計數據 |

#### 搜索功能
輸入關鍵詞搜索知識庫，查看相關的 Q&A、話術等。

#### 反饋機制
在搜索結果中點擊 👍 或 👎 為知識打分，系統會根據反饋調整知識質量。

#### 手動添加知識
點擊 **➕ 手動添加知識** 可以添加：
- Q&A 問答
- 成功話術
- 異議處理
- 產品信息
- 常見問題
- 開場白
- 成交話術

### 使用流程

1. **首次設置**
   - 進入設置頁面
   - 點擊「🚀 初始化 RAG」按鈕
   - 等待系統初始化完成

2. **開始學習**
   - 確保系統中有足夠的聊天記錄（每個對話至少 4 條消息）
   - 點擊「🎓 從聊天學習」開始批量學習
   - 查看統計數據確認學習結果

3. **優化知識庫**
   - 使用搜索功能測試知識檢索效果
   - 對搜索結果進行反饋（👍/👎）
   - 定期點擊「🧹 清理知識庫」移除低質量知識
   - 手動補充重要的 FAQ 和產品知識

4. **持續優化**
   - 系統會自動在對話結束時學習新知識
   - 定期運行「🔄 重建高價值索引」更新成功案例

## 文件結構

```
backend/
├── telegram_rag_system.py     # 核心 RAG 系統
├── chat_history_indexer.py    # 聊天記錄索引服務
├── knowledge_learner.py       # 知識學習器（已整合 RAG）
├── ai_auto_chat.py            # AI 自動聊天（已整合 RAG）
├── vector_memory.py           # 向量記憶系統
└── main.py                    # API 命令處理

src/
├── app.component.html         # 前端界面（包含 RAG 管理 UI）
├── app.component.ts           # 前端邏輯（RAG 方法和事件處理）
└── translation.service.ts     # 翻譯（支持中英文）
```
