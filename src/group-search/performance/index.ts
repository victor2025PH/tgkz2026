/**
 * TG-AI智控王 性能優化模塊導出
 * Performance Module Export
 */

// 虛擬滾動
export { VirtualScrollService, VirtualScrollController, VirtualScrollConfig, VirtualScrollState } from './virtual-scroll.service';
export { VirtualScrollComponent } from './virtual-scroll.component';

// Web Worker 池
export { WorkerPoolService, TaskType, WorkerTask, PoolStats } from './worker-pool.service';

// IndexedDB 優化
export { IndexedDBService, StoreSchema, QueryOptions, DBStats } from './indexed-db.service';

// 預加載
export { PreloadService, PreloadTask, PreloadConfig, PreloadPriority, NetworkQuality } from './preload.service';
