/**
 * TG-AI智控王 搜索適配器模塊
 * Search Adapters Export
 */

// 接口與基類
export * from './search-adapter.interface';

// 適配器實現
export { TelegramAdapter } from './telegram-adapter';
export { JisoAdapter } from './jiso-adapter';
export { TGStatAdapter } from './tgstat-adapter';
export { LocalAdapter } from './local-adapter';

// 聚合器
export { SearchAggregator } from './search-aggregator';
