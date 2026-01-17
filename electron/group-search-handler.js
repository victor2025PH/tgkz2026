/**
 * TG-AI智控王 群組搜索 Electron IPC Handler
 * Group Search Handler v1.0
 * 
 * 處理群組搜索、成員提取、批量操作等 IPC 請求
 */

const { ipcMain } = require('electron');

// ============ 搜索源配置 ============

const SEARCH_SOURCES = {
  telegram: {
    name: 'Telegram 官方',
    enabled: true
  },
  jiso: {
    name: '極搜',
    enabled: true,
    botUsername: 'jisou_bot'
  },
  tgstat: {
    name: 'TGStat',
    enabled: false,
    apiKey: null
  },
  local: {
    name: '本地索引',
    enabled: true
  }
};

// ============ 本地緩存 ============

let localGroupCache = [];
let searchHistory = [];

// ============ 初始化 ============

function initGroupSearchHandler(mainWindow, tgClient) {
  console.log('[GroupSearch] Initializing handlers...');
  
  // 檢查搜索源狀態
  ipcMain.handle('check-search-source', async (event, { source }) => {
    try {
      const config = SEARCH_SOURCES[source];
      if (!config || !config.enabled) {
        return { available: false };
      }
      
      // 對於 Telegram 官方搜索，檢查客戶端連接
      if (source === 'telegram') {
        if (tgClient && tgClient.connected) {
          return { available: true };
        }
        return { available: false };
      }
      
      // 對於極搜，檢查 Bot 是否可用
      if (source === 'jiso') {
        // TODO: 實際檢查極搜 Bot 的可用性
        return { available: true };
      }
      
      // 本地索引始終可用
      if (source === 'local') {
        return { available: true };
      }
      
      return { available: false };
    } catch (error) {
      console.error('[GroupSearch] Check source error:', error);
      return { available: false };
    }
  });
  
  // 執行搜索
  ipcMain.handle('search-groups', async (event, query) => {
    try {
      console.log('[GroupSearch] Searching:', query.keyword);
      
      const results = [];
      const sourceResults = [];
      
      // 並行搜索多個源
      const searchPromises = query.sources.map(async (source) => {
        try {
          let groups = [];
          
          switch (source) {
            case 'telegram':
              groups = await searchTelegram(tgClient, query);
              break;
            case 'jiso':
              groups = await searchJiso(tgClient, query);
              break;
            case 'local':
              groups = searchLocal(query);
              break;
            default:
              groups = [];
          }
          
          return {
            source,
            groups,
            status: 'success',
            count: groups.length
          };
        } catch (error) {
          console.error(`[GroupSearch] ${source} search error:`, error);
          return {
            source,
            groups: [],
            status: 'error',
            count: 0,
            error: error.message
          };
        }
      });
      
      const searchResults = await Promise.all(searchPromises);
      
      // 合併結果
      let allGroups = [];
      searchResults.forEach(result => {
        sourceResults.push({
          source: result.source,
          count: result.count,
          status: result.status,
          error: result.error
        });
        allGroups = allGroups.concat(result.groups);
      });
      
      // 去重（基於 ID）
      const uniqueGroups = deduplicateGroups(allGroups);
      
      // 排序
      const sortedGroups = sortGroups(uniqueGroups, query.filters.sortBy);
      
      // 分頁
      const start = (query.page - 1) * query.limit;
      const pagedGroups = sortedGroups.slice(start, start + query.limit);
      
      return {
        success: true,
        data: {
          groups: pagedGroups,
          totalCount: sortedGroups.length,
          hasMore: start + query.limit < sortedGroups.length,
          sources: sourceResults
        }
      };
    } catch (error) {
      console.error('[GroupSearch] Search error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });
  
  // 獲取群組詳情
  ipcMain.handle('get-group-detail', async (event, { groupId, source }) => {
    try {
      if (!tgClient || !tgClient.connected) {
        return { success: false, message: 'TG 客戶端未連接' };
      }
      
      const detail = await getGroupDetail(tgClient, groupId);
      
      return {
        success: true,
        data: detail
      };
    } catch (error) {
      console.error('[GroupSearch] Get detail error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });
  
  // 加入群組
  ipcMain.handle('join-group', async (event, { groupId, username, inviteLink }) => {
    try {
      if (!tgClient || !tgClient.connected) {
        return { success: false, message: 'TG 客戶端未連接' };
      }
      
      await joinGroup(tgClient, { groupId, username, inviteLink });
      
      return { success: true };
    } catch (error) {
      console.error('[GroupSearch] Join group error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });
  
  // 提取成員
  ipcMain.handle('extract-members', async (event, request) => {
    try {
      if (!tgClient || !tgClient.connected) {
        return { success: false, message: 'TG 客戶端未連接' };
      }
      
      const members = await extractMembers(tgClient, request, (progress) => {
        // 發送進度更新
        mainWindow.webContents.send('extraction-progress', progress);
      });
      
      return {
        success: true,
        data: {
          members,
          totalCount: members.length,
          extractedCount: members.length,
          hasMore: false
        }
      };
    } catch (error) {
      console.error('[GroupSearch] Extract members error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });
  
  // 停止提取
  ipcMain.handle('stop-extraction', async (event) => {
    // TODO: 實現停止提取邏輯
    return { success: true };
  });
  
  // 導出成員
  ipcMain.handle('export-members', async (event, { members, config, groupTitle }) => {
    try {
      const filePath = await exportMembers(members, config, groupTitle);
      return {
        success: true,
        data: { filePath }
      };
    } catch (error) {
      console.error('[GroupSearch] Export error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });
  
  // 批量操作
  ipcMain.handle('start-batch-operation', async (event, operation) => {
    try {
      const result = await executeBatchOperation(tgClient, operation, (progress) => {
        mainWindow.webContents.send('batch-progress', progress);
      });
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('[GroupSearch] Batch operation error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });
  
  console.log('[GroupSearch] Handlers initialized.');
}

// ============ 搜索實現 ============

async function searchTelegram(client, query) {
  if (!client || !client.connected) {
    return [];
  }
  
  try {
    // 使用 TG API 搜索
    // const result = await client.invoke(new Api.contacts.Search({
    //   q: query.keyword,
    //   limit: query.limit
    // }));
    
    // 模擬數據（實際實現需要使用 GramJS/MTProto）
    return generateMockResults(query.keyword, 'telegram', 5);
  } catch (error) {
    console.error('[GroupSearch] Telegram search error:', error);
    return [];
  }
}

async function searchJiso(client, query) {
  if (!client || !client.connected) {
    return [];
  }
  
  try {
    // TODO: 實現極搜 Bot 對接
    // 1. 向極搜 Bot 發送搜索命令
    // 2. 等待並解析返回的消息
    // 3. 提取群組信息
    
    // 模擬數據
    return generateMockResults(query.keyword, 'jiso', 3);
  } catch (error) {
    console.error('[GroupSearch] Jiso search error:', error);
    return [];
  }
}

function searchLocal(query) {
  // 搜索本地緩存
  const keyword = query.keyword.toLowerCase();
  return localGroupCache.filter(g => 
    g.title.toLowerCase().includes(keyword) ||
    (g.description && g.description.toLowerCase().includes(keyword))
  );
}

// ============ 群組詳情 ============

async function getGroupDetail(client, groupId) {
  if (!client || !client.connected) {
    return null;
  }
  
  try {
    // TODO: 使用 TG API 獲取群組詳情
    // const fullChat = await client.invoke(new Api.messages.GetFullChat({
    //   chatId: groupId
    // }));
    
    // 模擬數據
    return {
      id: groupId,
      title: '測試群組',
      type: 'supergroup',
      accessType: 'public',
      membersCount: 12345,
      description: '這是一個測試群組',
      stats: {
        membersCount: 12345,
        onlineCount: 1234,
        dailyMessages: 567,
        weeklyGrowth: 5.2,
        activeRate: 18.5
      },
      tags: ['中文', '交流'],
      source: 'telegram',
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('[GroupSearch] Get detail error:', error);
    return null;
  }
}

// ============ 加入群組 ============

async function joinGroup(client, { groupId, username, inviteLink }) {
  if (!client || !client.connected) {
    throw new Error('TG 客戶端未連接');
  }
  
  try {
    if (username) {
      // await client.invoke(new Api.channels.JoinChannel({
      //   channel: username
      // }));
    } else if (inviteLink) {
      // await client.invoke(new Api.messages.ImportChatInvite({
      //   hash: inviteLink.split('/').pop()
      // }));
    } else {
      throw new Error('缺少群組標識');
    }
    
    console.log('[GroupSearch] Joined group:', groupId);
  } catch (error) {
    console.error('[GroupSearch] Join group error:', error);
    throw error;
  }
}

// ============ 成員提取 ============

async function extractMembers(client, request, onProgress) {
  if (!client || !client.connected) {
    throw new Error('TG 客戶端未連接');
  }
  
  const members = [];
  const limit = request.limit || 200;
  let offset = request.offset || 0;
  let total = 0;
  
  try {
    // TODO: 使用 TG API 提取成員
    // const result = await client.invoke(new Api.channels.GetParticipants({
    //   channel: request.groupId,
    //   filter: new Api.ChannelParticipantsSearch({ q: '' }),
    //   offset,
    //   limit: 100,
    //   hash: BigInt(0)
    // }));
    
    // 模擬數據
    total = 500;
    for (let i = 0; i < Math.min(limit, total); i++) {
      members.push(generateMockMember(i));
      
      // 發送進度
      if (i % 10 === 0) {
        onProgress({
          current: i + 1,
          total: Math.min(limit, total),
          members: members.slice(-10)
        });
      }
      
      // 模擬延遲
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 最終進度
    onProgress({
      current: members.length,
      total: members.length,
      members: []
    });
    
    return members;
  } catch (error) {
    console.error('[GroupSearch] Extract members error:', error);
    throw error;
  }
}

// ============ 數據導出 ============

async function exportMembers(members, config, groupTitle) {
  const { app, dialog } = require('electron');
  const fs = require('fs');
  const path = require('path');
  
  // 選擇保存路徑
  const defaultPath = path.join(
    app.getPath('downloads'),
    `${groupTitle}_members_${Date.now()}.${config.format}`
  );
  
  const { filePath } = await dialog.showSaveDialog({
    defaultPath,
    filters: [
      { name: 'Excel', extensions: ['xlsx'] },
      { name: 'CSV', extensions: ['csv'] },
      { name: 'JSON', extensions: ['json'] }
    ]
  });
  
  if (!filePath) {
    throw new Error('未選擇保存路徑');
  }
  
  let content = '';
  
  switch (config.format) {
    case 'csv':
      content = membersToCSV(members, config.fields, config.includeHeaders);
      break;
    case 'json':
      content = JSON.stringify(members, null, 2);
      break;
    case 'excel':
      // TODO: 使用 xlsx 庫生成 Excel
      content = membersToCSV(members, config.fields, config.includeHeaders);
      break;
    default:
      content = membersToCSV(members, config.fields, config.includeHeaders);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  
  return filePath;
}

function membersToCSV(members, fields, includeHeaders) {
  const lines = [];
  
  if (includeHeaders) {
    lines.push(fields.join(','));
  }
  
  members.forEach(member => {
    const values = fields.map(field => {
      const value = member[field];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    lines.push(values.join(','));
  });
  
  return lines.join('\n');
}

// ============ 批量操作 ============

async function executeBatchOperation(client, operation, onProgress) {
  if (!client || !client.connected) {
    throw new Error('TG 客戶端未連接');
  }
  
  const { type, targetMembers, config } = operation;
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < targetMembers.length; i++) {
    const member = targetMembers[i];
    
    try {
      if (type === 'message') {
        // 發送消息
        const message = config.messageTemplate
          .replace(/{name}/g, member.firstName || member.username || '')
          .replace(/{username}/g, member.username || '');
        
        // await client.invoke(new Api.messages.SendMessage({
        //   peer: member.id,
        //   message
        // }));
        
        console.log(`[BatchOp] Sent message to ${member.id}`);
      }
      
      success++;
    } catch (error) {
      console.error(`[BatchOp] Failed for ${member.id}:`, error);
      failed++;
    }
    
    // 發送進度
    onProgress({
      progress: {
        total: targetMembers.length,
        processed: i + 1,
        success,
        failed
      },
      status: 'running'
    });
    
    // 智能延遲
    const delay = config.delayMin + Math.random() * (config.delayMax - config.delayMin);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
    
    // 檢查每日限制
    if (success >= config.dailyLimit) {
      console.log('[BatchOp] Daily limit reached');
      break;
    }
  }
  
  return {
    total: targetMembers.length,
    success,
    failed
  };
}

// ============ 工具函數 ============

function deduplicateGroups(groups) {
  const seen = new Map();
  return groups.filter(group => {
    if (seen.has(group.id)) {
      return false;
    }
    seen.set(group.id, true);
    return true;
  });
}

function sortGroups(groups, sortBy) {
  switch (sortBy) {
    case 'members':
      return groups.sort((a, b) => b.membersCount - a.membersCount);
    case 'activity':
      return groups.sort((a, b) => (b.stats?.activeRate || 0) - (a.stats?.activeRate || 0));
    default:
      return groups.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }
}

function generateMockResults(keyword, source, count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push({
      id: `${source}_${Date.now()}_${i}`,
      title: `${keyword} 交流群 ${i + 1}`,
      username: `${keyword.replace(/\s/g, '')}_group_${i + 1}`,
      type: 'supergroup',
      accessType: 'public',
      membersCount: Math.floor(Math.random() * 50000) + 1000,
      description: `這是一個關於 ${keyword} 的交流群組`,
      source,
      relevanceScore: Math.random()
    });
  }
  return results;
}

function generateMockMember(index) {
  const statuses = ['online', 'recently', 'lastWeek', 'lastMonth', 'longAgo'];
  const roles = ['member', 'member', 'member', 'admin'];
  
  return {
    id: `user_${Date.now()}_${index}`,
    firstName: `用戶${index + 1}`,
    lastName: '',
    username: Math.random() > 0.3 ? `user_${index}` : null,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    role: roles[Math.floor(Math.random() * roles.length)],
    isBot: Math.random() > 0.95,
    isPremium: Math.random() > 0.8,
    isVerified: Math.random() > 0.95
  };
}

module.exports = { initGroupSearchHandler };
