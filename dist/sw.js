/**
 * P3 優化：Service Worker
 * 
 * 功能：
 * - 靜態資源緩存（HTML/JS/CSS）
 * - API 響應緩存
 * - 離線支持
 * - 後台同步
 */

const CACHE_VERSION = 'v2.1.2';
const STATIC_CACHE = `tg-matrix-static-${CACHE_VERSION}`;
const API_CACHE = `tg-matrix-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `tg-matrix-images-${CACHE_VERSION}`;

// 靜態資源列表（預緩存）
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
  // JS/CSS 文件會在運行時動態緩存
];

// 需要緩存的 API 路徑
const CACHEABLE_API_PATHS = [
  '/api/health',
  '/api/command' // 只緩存 GET 請求或特定命令
];

// 不緩存的路徑（管理後台 /admin/ 不使用 SW 緩存，確保更新即時生效）
const NO_CACHE_PATHS = [
  '/ws',
  '/api/upload',
  '/api/download',
  '/admin/'
];

// ==================== 安裝 ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] ✅ Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// ==================== 激活 ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker:', CACHE_VERSION);
  
  event.waitUntil(
    // 清理舊版本緩存
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('tg-matrix-') && 
                     !name.endsWith(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Activation complete');
        return self.clients.claim();
      })
  );
});

// ==================== 請求攔截 ====================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 跳過不需要緩存的請求
  if (shouldSkipCache(url, event.request)) {
    return;
  }
  
  // 處理靜態資源
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(event.request, STATIC_CACHE));
    return;
  }
  
  // 處理圖片
  if (isImageRequest(url)) {
    event.respondWith(cacheFirstStrategy(event.request, IMAGE_CACHE));
    return;
  }
  
  // 處理 API 請求
  if (isApiRequest(url)) {
    event.respondWith(networkFirstStrategy(event.request, API_CACHE));
    return;
  }
  
  // 其他請求使用網絡優先
  event.respondWith(networkFirstStrategy(event.request, STATIC_CACHE));
});

// ==================== 緩存策略 ====================

/**
 * 緩存優先策略（適用於靜態資源）
 */
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // 後台更新緩存
    fetchAndCache(request, cacheName);
    return cached;
  }
  
  return fetchAndCache(request, cacheName);
}

/**
 * 網絡優先策略（適用於 API）
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    
    // 只緩存成功的 GET 請求
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // 返回離線頁面或錯誤響應
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    return new Response(JSON.stringify({
      error: 'Offline',
      message: '網絡不可用，請稍後重試'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 獲取並緩存
 */
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// ==================== 輔助函數 ====================

function shouldSkipCache(url, request) {
  // 跳過 WebSocket
  if (url.pathname.startsWith('/ws')) return true;
  
  // 跳過管理後台（不使用 SW 緩存，確保優惠券彈窗等修復即時生效）
  if (url.pathname.startsWith('/admin/')) return true;
  
  // 跳過非 GET/POST 請求
  if (!['GET', 'POST'].includes(request.method)) return true;
  
  // 跳過 Chrome 擴展
  if (url.protocol === 'chrome-extension:') return true;
  
  // 跳過外部請求
  if (url.origin !== self.location.origin) return true;
  
  return false;
}

function isStaticAsset(url) {
  const extensions = ['.html', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'];
  return extensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname === '/';
}

function isImageRequest(url) {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'];
  return extensions.some(ext => url.pathname.endsWith(ext));
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// ==================== 後台同步 ====================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-operations') {
    event.waitUntil(syncOfflineOperations());
  }
});

async function syncOfflineOperations() {
  console.log('[SW] Syncing offline operations...');
  
  // 通知所有客戶端進行同步
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_OFFLINE_OPERATIONS'
    });
  });
}

// ==================== 消息處理 ====================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => {
        return Promise.all(names.map(name => caches.delete(name)));
      })
    );
  }
  
  if (event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.source.postMessage({
        type: 'CACHE_STATS',
        stats
      });
    });
  }
});

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    stats[name] = keys.length;
  }
  
  return stats;
}

console.log('[SW] Service Worker loaded:', CACHE_VERSION);
