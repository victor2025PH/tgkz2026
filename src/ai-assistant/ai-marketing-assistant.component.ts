/**
 * AI 營銷助手組件 - MVP 版本
 * AI Marketing Assistant Component
 * 
 * 功能:
 * 1. 一句話輸入需求
 * 2. AI 生成關鍵詞推薦（接入真實 AI）
 * 3. AI 生成營銷策略（本地優先 + 雲端回退）
 * 4. 快速啟動自動化
 */

import { Component, signal, computed, inject, OnInit, output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AIStrategyService, AIModelOption } from './ai-strategy.service';

// AI 策略結果
export interface AIStrategyResult {
  industry: string;
  targetAudience: string;
  keywords: {
    highIntent: string[];
    mediumIntent: string[];
    extended: string[];
  };
  customerProfile: {
    identity: string[];
    features: string[];
    needs: string[];
  };
  recommendedGroups: string[];
  messageTemplates: {
    firstTouch: string;
    followUp: string;
    closing: string;
  };
  automationSettings: {
    monitorMode: string;
    responseDelay: number;
    followUpInterval: number;
  };
}

// 預設行業模板
const INDUSTRY_TEMPLATES: { [key: string]: Partial<AIStrategyResult> } = {
  'payment': {
    industry: '支付/換匯',
    keywords: {
      highIntent: ['支付通道', 'U商', '換匯', 'USDT', '代收代付', '跑分'],
      mediumIntent: ['四方支付', '三方支付', 'API對接', '承兌商'],
      extended: ['OTC', '收款', '出款', '費率', 'T+0', 'T+1']
    },
    recommendedGroups: ['支付行業交流群', 'USDT/換匯交易群', '項目對接群']
  },
  'crypto': {
    industry: '加密貨幣',
    keywords: {
      highIntent: ['BTC', 'ETH', '合約', '現貨', '交易所'],
      mediumIntent: ['DeFi', 'NFT', '錢包', '公鏈'],
      extended: ['挖礦', '質押', '空投', 'IDO']
    },
    recommendedGroups: ['幣圈交流群', '合約交易群', '項目首發群']
  },
  'ecommerce': {
    industry: '電商/跨境',
    keywords: {
      highIntent: ['亞馬遜', '獨立站', 'Shopify', '物流', '選品'],
      mediumIntent: ['FBA', '海外倉', '清關', '支付'],
      extended: ['測評', '刷單', '站外推廣']
    },
    recommendedGroups: ['跨境電商交流群', '亞馬遜賣家群', '物流對接群']
  }
};

@Component({
  selector: 'app-ai-marketing-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-assistant h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      
      <!-- 頂部標題 -->
      <div class="p-6 border-b border-slate-700/50">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/20">
            🤖
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">AI 營銷助手</h1>
            <p class="text-slate-400 text-sm">告訴我你想找什麼客戶，AI 幫你完成一切</p>
          </div>
        </div>
      </div>
      
      <!-- 主內容區 -->
      <div class="flex-1 overflow-y-auto p-6">
        
        @switch (currentStep()) {
          <!-- 步驟 1: 輸入需求 -->
          @case ('input') {
            <div class="max-w-3xl mx-auto space-y-6">
              
              <!-- 輸入區域 -->
              <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <label class="block text-lg font-medium text-white mb-4">
                  💬 告訴我你想找什麼樣的客戶？
                </label>
                <textarea 
                  [(ngModel)]="userInput"
                  rows="4"
                  class="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-white text-lg placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
                  placeholder="例如：我想找支付行業的代理商，他們需要有換匯和跑分需求..."
                  (keydown.enter)="$event.ctrlKey && generateStrategy()">
                </textarea>
                <p class="text-xs text-slate-500 mt-2">💡 提示：描述越詳細，AI 分析越精準</p>
              </div>
              
              <!-- 快速選擇行業 -->
              <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <label class="block text-sm font-medium text-slate-400 mb-3">⚡ 快速選擇行業模板</label>
                <div class="flex flex-wrap gap-3">
                  <button 
                    (click)="selectIndustry('payment')"
                    class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    [class]="selectedIndustry() === 'payment' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                    💳 支付/換匯
                  </button>
                  <button 
                    (click)="selectIndustry('crypto')"
                    class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    [class]="selectedIndustry() === 'crypto' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                    🪙 加密貨幣
                  </button>
                  <button 
                    (click)="selectIndustry('ecommerce')"
                    class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    [class]="selectedIndustry() === 'ecommerce' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                    🛒 電商/跨境
                  </button>
                  <button 
                    (click)="selectIndustry('custom')"
                    class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    [class]="selectedIndustry() === 'custom' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                    ✏️ 自定義
                  </button>
                </div>
              </div>
              
              <!-- AI 模型選擇 -->
              <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <div class="flex items-center justify-between mb-4">
                  <label class="text-sm font-medium text-slate-400 flex items-center gap-2">
                    🤖 AI 模型
                    @if (connectedModelsCount() > 0) {
                      <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                        {{ connectedModelsCount() }} 個已連接
                      </span>
                    } @else {
                      <span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">未配置</span>
                    }
                  </label>
                  <a (click)="goToAICenter()"
                     class="text-sm text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-1">
                    ⚙️ 前往 AI 中心
                  </a>
                </div>
                
                <!-- 無模型提示 -->
                @if (availableModels().length === 0) {
                  <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                    <p class="text-amber-400 mb-2">⚠️ 尚未配置任何 AI 模型</p>
                    <p class="text-sm text-slate-400 mb-3">請先在 AI 中心配置並測試 AI 模型</p>
                    <button (click)="goToAICenter()"
                            class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                      🚀 前往配置 AI
                    </button>
                  </div>
                } @else {
                  <!-- 模型快速選擇 - 只顯示已連接的模型 -->
                  <div class="space-y-3">
                    <!-- 已連接模型 -->
                    @if (connectedModels().length > 0) {
                      <div>
                        <p class="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          可用模型
                        </p>
                        <div class="flex flex-wrap gap-2">
                          @for (model of connectedModels(); track model.id) {
                            <button 
                              (click)="selectModel(model.id)"
                              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
                              [class]="selectedModelId() === model.id 
                                ? 'bg-emerald-500/30 text-emerald-400 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                                : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50 hover:border-emerald-500/30'">
                              <span>{{ model.icon }}</span>
                              <span>{{ model.name }}</span>
                              @if (model.capability) {
                                <span class="text-[10px] px-1.5 py-0.5 rounded-full"
                                      [class]="getCapabilityStyle(model.capability)">
                                  {{ getCapabilityLabel(model.capability) }}
                                </span>
                              }
                              <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                    
                    <!-- 未連接模型 -->
                    @if (disconnectedModels().length > 0) {
                      <div>
                        <p class="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <span class="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                          未連接（需要測試）
                        </p>
                        <div class="flex flex-wrap gap-2">
                          @for (model of disconnectedModels(); track model.id) {
                            <button 
                              (click)="selectModel(model.id)"
                              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 opacity-60"
                              [class]="selectedModelId() === model.id 
                                ? 'bg-slate-600/50 text-slate-300 border border-slate-500'
                                : 'bg-slate-800/50 text-slate-500 border border-slate-700 hover:opacity-80'">
                              <span>{{ model.icon }}</span>
                              <span>{{ model.name }}</span>
                              <span class="text-xs text-slate-500">未測試</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                  
                  <!-- 推薦提示 -->
                  @if (connectedModels().length > 0) {
                    <p class="text-xs text-slate-500 mt-3 flex items-center gap-1">
                      💡 優先使用本地 AI（免費無限），雲端 AI 按使用量計費
                    </p>
                  }
                }
                
                <!-- 詳細設置面板 -->
                @if (showModelSettings()) {
                  <div class="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                    <!-- 本地 AI 配置 -->
                    <div class="bg-slate-900/50 rounded-xl p-4">
                      <h4 class="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        🦙 本地 Ollama 配置
                        @if (localAIConfig().isConnected) {
                          <span class="text-emerald-400 text-xs">✓ 已連接</span>
                        } @else {
                          <span class="text-amber-400 text-xs">未連接</span>
                        }
                      </h4>
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="text-xs text-slate-500 block mb-1">API 端點</label>
                          <input type="text" 
                                 [value]="localAIConfig().endpoint"
                                 (change)="updateLocalEndpoint($any($event.target).value)"
                                 class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                                 placeholder="https://your-ollama.ts.net/api/chat">
                        </div>
                        <div>
                          <label class="text-xs text-slate-500 block mb-1">模型名稱</label>
                          <input type="text" 
                                 [value]="localAIConfig().model"
                                 (change)="updateLocalModel($any($event.target).value)"
                                 class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                                 placeholder="qwen2.5">
                        </div>
                      </div>
                      <button (click)="testLocalAI()"
                              class="mt-3 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors">
                        🔗 測試連接
                      </button>
                    </div>
                    
                    <!-- 所有可用模型 -->
                    <div>
                      <h4 class="text-sm font-medium text-white mb-2">可用模型</h4>
                      <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        @for (model of availableModels(); track model.id) {
                          <div 
                            (click)="selectModel(model.id)"
                            class="p-3 rounded-lg cursor-pointer transition-all border"
                            [class]="selectedModelId() === model.id 
                              ? 'bg-purple-500/20 border-purple-500/50' 
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'">
                            <div class="flex items-center gap-2">
                              <span class="text-lg">{{ model.icon }}</span>
                              <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium text-white truncate">{{ model.name }}</div>
                                <div class="text-xs text-slate-500">{{ model.provider }}</div>
                              </div>
                              @if (model.isConnected) {
                                <span class="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></span>
                              } @else if (!model.isLocal) {
                                <span class="text-xs text-slate-500">未配置</span>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                    
                    <p class="text-xs text-slate-500">
                      💡 優先使用本地 AI (免費、隱私)，本地不可用時自動切換到雲端 AI
                    </p>
                  </div>
                }
              </div>
              
              <!-- 生成按鈕 -->
              <div class="flex flex-col items-center gap-4">
                <button 
                  (click)="generateStrategy()"
                  [disabled]="isGenerating() || (!userInput && selectedIndustry() === 'custom')"
                  class="px-8 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-2xl shadow-lg shadow-purple-500/30 transition-all flex items-center gap-3">
                  @if (isGenerating()) {
                    <span class="animate-spin">⟳</span>
                    AI 分析中...
                  } @else {
                    🚀 生成 AI 營銷策略
                  }
                </button>
                
                <!-- 生成進度 -->
                @if (isGenerating()) {
                  <div class="w-full max-w-md bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm text-slate-400">{{ generationStatus().message }}</span>
                      <span class="text-sm text-purple-400">{{ generationStatus().currentProvider }}</span>
                    </div>
                    <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
                           [style.width.%]="generationStatus().progress">
                      </div>
                    </div>
                  </div>
                }
              </div>
              
            </div>
          }
          
          <!-- 步驟 2: 策略結果 -->
          @case ('result') {
            @if (strategyResult()) {
              <div class="max-w-4xl mx-auto space-y-6">
                
                <!-- 成功提示 -->
                <div class="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl p-4 border border-emerald-500/30 flex items-center gap-3">
                  <span class="text-2xl">✨</span>
                  <div>
                    <p class="text-emerald-400 font-medium">AI 策略生成完成！</p>
                    <p class="text-slate-400 text-sm">根據您的需求，AI 已生成以下營銷策略</p>
                  </div>
                </div>
                
                <!-- 行業分析 -->
                <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                  <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📊</span> 行業分析
                  </h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-sm text-slate-400">目標行業</label>
                      <p class="text-white font-medium">{{ strategyResult()!.industry }}</p>
                    </div>
                    <div>
                      <label class="text-sm text-slate-400">目標受眾</label>
                      <p class="text-white font-medium">{{ strategyResult()!.targetAudience }}</p>
                    </div>
                  </div>
                </div>
                
                <!-- 關鍵詞推薦 -->
                <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                  <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>🔑</span> AI 推薦關鍵詞
                    <span class="text-xs text-slate-500 font-normal ml-2">點擊可編輯</span>
                  </h3>
                  
                  <div class="space-y-4">
                    <!-- 高意向關鍵詞 -->
                    <div>
                      <label class="text-sm text-emerald-400 font-medium mb-2 flex items-center gap-2">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        高意向關鍵詞
                      </label>
                      <div class="flex flex-wrap gap-2">
                        @for (keyword of strategyResult()!.keywords.highIntent; track $index) {
                          <span class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/30 transition-all">
                            {{ keyword }}
                          </span>
                        }
                        <button (click)="addKeyword('high')" class="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-sm hover:bg-slate-600">
                          + 添加
                        </button>
                      </div>
                    </div>
                    
                    <!-- 中意向關鍵詞 -->
                    <div>
                      <label class="text-sm text-amber-400 font-medium mb-2 flex items-center gap-2">
                        <span class="w-2 h-2 bg-amber-500 rounded-full"></span>
                        中意向關鍵詞
                      </label>
                      <div class="flex flex-wrap gap-2">
                        @for (keyword of strategyResult()!.keywords.mediumIntent; track $index) {
                          <span class="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm border border-amber-500/30 cursor-pointer hover:bg-amber-500/30 transition-all">
                            {{ keyword }}
                          </span>
                        }
                        <button (click)="addKeyword('medium')" class="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-sm hover:bg-slate-600">
                          + 添加
                        </button>
                      </div>
                    </div>
                    
                    <!-- 擴展關鍵詞 -->
                    <div>
                      <label class="text-sm text-slate-400 font-medium mb-2 flex items-center gap-2">
                        <span class="w-2 h-2 bg-slate-500 rounded-full"></span>
                        擴展關鍵詞
                      </label>
                      <div class="flex flex-wrap gap-2">
                        @for (keyword of strategyResult()!.keywords.extended; track $index) {
                          <span class="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-600 cursor-pointer hover:bg-slate-600 transition-all">
                            {{ keyword }}
                          </span>
                        }
                        <button (click)="addKeyword('extended')" class="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-sm hover:bg-slate-600">
                          + 添加
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 客戶畫像 -->
                <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                  <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>👥</span> 目標客戶畫像
                  </h3>
                  <div class="grid grid-cols-3 gap-4">
                    <div>
                      <label class="text-sm text-slate-400 mb-2 block">身份特徵</label>
                      <ul class="space-y-1">
                        @for (item of strategyResult()!.customerProfile.identity; track item) {
                          <li class="text-white text-sm flex items-center gap-2">
                            <span class="text-purple-400">•</span> {{ item }}
                          </li>
                        }
                      </ul>
                    </div>
                    <div>
                      <label class="text-sm text-slate-400 mb-2 block">行為特徵</label>
                      <ul class="space-y-1">
                        @for (item of strategyResult()!.customerProfile.features; track item) {
                          <li class="text-white text-sm flex items-center gap-2">
                            <span class="text-cyan-400">•</span> {{ item }}
                          </li>
                        }
                      </ul>
                    </div>
                    <div>
                      <label class="text-sm text-slate-400 mb-2 block">核心需求</label>
                      <ul class="space-y-1">
                        @for (item of strategyResult()!.customerProfile.needs; track item) {
                          <li class="text-white text-sm flex items-center gap-2">
                            <span class="text-emerald-400">•</span> {{ item }}
                          </li>
                        }
                      </ul>
                    </div>
                  </div>
                </div>
                
                <!-- 消息模板 -->
                <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                  <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>💬</span> AI 生成話術模板
                  </h3>
                  <div class="space-y-4">
                    <div>
                      <label class="text-sm text-emerald-400 font-medium mb-2 block">首次觸達</label>
                      <textarea 
                        [(ngModel)]="editableTemplates.firstTouch"
                        rows="2"
                        class="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:border-purple-500">
                      </textarea>
                    </div>
                    <div>
                      <label class="text-sm text-amber-400 font-medium mb-2 block">跟進話術</label>
                      <textarea 
                        [(ngModel)]="editableTemplates.followUp"
                        rows="2"
                        class="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:border-purple-500">
                      </textarea>
                    </div>
                    <div>
                      <label class="text-sm text-purple-400 font-medium mb-2 block">促成話術</label>
                      <textarea 
                        [(ngModel)]="editableTemplates.closing"
                        rows="2"
                        class="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:border-purple-500">
                      </textarea>
                    </div>
                  </div>
                </div>
                
                <!-- 操作按鈕 -->
                <div class="flex justify-between items-center pt-4">
                  <button 
                    (click)="backToInput()"
                    class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all">
                    ← 返回修改
                  </button>
                  <div class="flex gap-3">
                    <button 
                      (click)="saveStrategy()"
                      class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all flex items-center gap-2">
                      💾 保存策略
                    </button>
                    <button 
                      (click)="handoverToAITeam()"
                      class="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2">
                      🤖 交給 AI 團隊
                    </button>
                    <button 
                      (click)="startAutomation()"
                      class="px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all flex items-center gap-2">
                      🚀 手動執行
                    </button>
                  </div>
                </div>
                
                <!-- AI 團隊優勢提示 -->
                <div class="mt-4 p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-xl">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">💡</span>
                    <div>
                      <p class="text-white font-medium">推薦使用「交給 AI 團隊」</p>
                      <p class="text-slate-400 text-sm">AI 會自動組建團隊、分配角色、制定話術，24/7 智能銷售</p>
                    </div>
                  </div>
                </div>
                
              </div>
            }
          }
        }
        
      </div>
      
      <!-- 🔧 關鍵詞輸入對話框（替代 prompt） -->
      @if (showKeywordDialog()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
             (click)="cancelAddKeyword()">
          <div class="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-slate-700 shadow-2xl"
               (click)="$event.stopPropagation()">
            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span class="text-xl">🏷️</span>
              添加{{ getKeywordLevelLabel(keywordDialogLevel()) }}關鍵詞
            </h3>
            
            <input type="text" 
                   [(ngModel)]="newKeywordInput"
                   (keydown.enter)="confirmAddKeyword()"
                   (keydown.escape)="cancelAddKeyword()"
                   placeholder="請輸入關鍵詞..."
                   class="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white 
                          placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 
                          outline-none transition-all"
                   autofocus />
            
            <div class="flex gap-3 mt-6">
              <button (click)="cancelAddKeyword()"
                      class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 
                             rounded-xl transition-all font-medium">
                取消
              </button>
              <button (click)="confirmAddKeyword()"
                      [disabled]="!newKeywordInput.trim()"
                      class="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 
                             hover:from-purple-600 hover:to-pink-600 text-white rounded-xl 
                             transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                確定添加
              </button>
            </div>
          </div>
        </div>
      }
      
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class AiMarketingAssistantComponent implements OnInit {
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);
  private aiStrategyService = inject(AIStrategyService);
  
  // 輸出事件
  startAutomationEvent = output<AIStrategyResult>();
  handoverToAITeamEvent = output<AIStrategyResult>();
  navigateEvent = output<string>(); // 導航事件
  
  // 狀態
  currentStep = signal<'input' | 'result'>('input');
  userInput = '';
  selectedIndustry = signal<string>('custom');
  isGenerating = signal(false);
  strategyResult = signal<AIStrategyResult | null>(null);
  
  // AI 模型相關
  showModelSettings = signal(false);
  availableModels = this.aiStrategyService.availableModels;
  selectedModelId = this.aiStrategyService.selectedModelId;
  
  // 🔧 關鍵詞輸入對話框（替代 prompt）
  showKeywordDialog = signal(false);
  keywordDialogLevel = signal<'high' | 'medium' | 'extended'>('high');
  newKeywordInput = '';
  localAIConfig = this.aiStrategyService.localAIConfig;
  generationStatus = this.aiStrategyService.generationStatus;
  
  // 計算屬性：已連接的模型
  connectedModels = computed(() => this.availableModels().filter(m => m.isConnected));
  disconnectedModels = computed(() => this.availableModels().filter(m => !m.isConnected));
  connectedModelsCount = computed(() => this.connectedModels().length);
  
  // 可編輯的模板
  editableTemplates = {
    firstTouch: '',
    followUp: '',
    closing: ''
  };
  
  ngOnInit() {
    this.setupEventListeners();
    // 刷新可用模型
    this.aiStrategyService.refreshAvailableModels();
  }
  
  private setupEventListeners() {
    this.ipcService.on('ai-strategy-generated', (data: any) => {
      this.isGenerating.set(false);
      if (data.success) {
        this.strategyResult.set(data.strategy);
        this.editableTemplates = { ...data.strategy.messageTemplates };
        this.currentStep.set('result');
        this.toastService.success('AI 策略生成完成！');
      } else {
        this.toastService.error(`生成失敗: ${data.error}`);
      }
    });
  }
  
  // 導航到 AI 中心
  goToAICenter(): void {
    this.navigateEvent.emit('ai-engine');
    this.toastService.info('前往 AI 中心配置模型...');
  }
  
  // AI 模型設置
  selectModel(modelId: string): void {
    this.aiStrategyService.selectModel(modelId);
  }
  
  // 能力標籤樣式
  getCapabilityStyle(capability: string): string {
    switch (capability) {
      case 'fast': return 'bg-cyan-500/20 text-cyan-400';
      case 'powerful': return 'bg-purple-500/20 text-purple-400';
      case 'economic': return 'bg-green-500/20 text-green-400';
      case 'balanced': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  }
  
  // 能力標籤文字
  getCapabilityLabel(capability: string): string {
    switch (capability) {
      case 'fast': return '快速';
      case 'powerful': return '強大';
      case 'economic': return '經濟';
      case 'balanced': return '均衡';
      default: return '';
    }
  }
  
  async testLocalAI(): Promise<void> {
    await this.aiStrategyService.testLocalAIConnection();
  }
  
  updateLocalEndpoint(endpoint: string): void {
    this.aiStrategyService.updateLocalAIConfig({ endpoint });
  }
  
  updateLocalModel(model: string): void {
    this.aiStrategyService.updateLocalAIConfig({ model });
  }
  
  selectIndustry(industry: string) {
    this.selectedIndustry.set(industry);
    if (industry !== 'custom') {
      const template = INDUSTRY_TEMPLATES[industry];
      if (template) {
        this.userInput = `我想找${template.industry}行業的客戶`;
      }
    }
  }
  
  async generateStrategy() {
    if (!this.userInput && this.selectedIndustry() === 'custom') {
      this.toastService.warning('請輸入您的需求或選擇一個行業模板');
      return;
    }
    
    this.isGenerating.set(true);
    
    // 使用 AIStrategyService 進行真實 AI 調用
    // 優先使用本地 AI，失敗後回退到雲端，最後使用模板
    const inputText = this.userInput || `我想找${INDUSTRY_TEMPLATES[this.selectedIndustry()]?.industry || '目標行業'}的客戶`;
    
    try {
      const result = await this.aiStrategyService.generateStrategy(inputText);
      
      if (result) {
        this.strategyResult.set(result);
        this.editableTemplates = { ...result.messageTemplates };
        this.currentStep.set('result');
        
        // 顯示使用的 AI 提供者
        const status = this.generationStatus();
        if (status.currentProvider === '模板回退') {
          this.toastService.warning('雲端 AI 連接失敗，已使用智能模板生成。請檢查 AI 中心配置。');
        } else if (status.currentProvider.includes('本地')) {
          this.toastService.success(`✅ 策略生成完成！使用：${status.currentProvider}`);
        } else {
          this.toastService.success(`✅ AI 策略生成完成！(${status.currentProvider})`);
        }
      } else {
        this.toastService.error('策略生成失敗，請重試');
      }
    } catch (error: any) {
      console.error('[AIMarketing] 策略生成失敗:', error);
      this.toastService.error(`生成失敗: ${error.message}`);
    } finally {
      this.isGenerating.set(false);
    }
  }
  
  private generateFromTemplate() {
    const industry = this.selectedIndustry();
    const template = INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES['payment'];
    
    const strategy: AIStrategyResult = {
      industry: template.industry || '自定義行業',
      targetAudience: this.extractAudience(this.userInput),
      keywords: template.keywords || {
        highIntent: [],
        mediumIntent: [],
        extended: []
      },
      customerProfile: {
        identity: ['代理商', '項目方', '運營人員'],
        features: ['活躍在相關群組', '經常發業務消息', '有明確需求'],
        needs: ['尋找合作夥伴', '解決業務痛點', '獲取更多資源']
      },
      recommendedGroups: template.recommendedGroups || ['行業交流群', '業務對接群'],
      messageTemplates: {
        firstTouch: `您好！看到您在群裡的消息，我們專注${template.industry || '這個'}行業，能為您提供專業服務。方便聊聊嗎？`,
        followUp: '請問您目前業務上有什麼具體需求嗎？我們可以根據您的情況提供定制方案。',
        closing: '要不這樣，我先給您開個測試賬號/發個資料，您體驗一下？'
      },
      automationSettings: {
        monitorMode: '24/7 全天候',
        responseDelay: 30,
        followUpInterval: 7200
      }
    };
    
    this.strategyResult.set(strategy);
    this.editableTemplates = { ...strategy.messageTemplates };
    this.currentStep.set('result');
    this.isGenerating.set(false);
    this.toastService.success('AI 策略生成完成！');
  }
  
  private extractAudience(input: string): string {
    if (input.includes('代理')) return '代理商/渠道商';
    if (input.includes('客戶')) return '終端客戶';
    if (input.includes('項目')) return '項目方/運營商';
    return '目標客戶群體';
  }
  
  // 🔧 打開關鍵詞輸入對話框（替代 prompt）
  addKeyword(level: 'high' | 'medium' | 'extended') {
    this.keywordDialogLevel.set(level);
    this.newKeywordInput = '';
    this.showKeywordDialog.set(true);
  }
  
  // 🔧 確認添加關鍵詞
  confirmAddKeyword() {
    const keyword = this.newKeywordInput.trim();
    if (keyword && this.strategyResult()) {
      const result = { ...this.strategyResult()! };
      const level = this.keywordDialogLevel();
      switch (level) {
        case 'high':
          result.keywords.highIntent = [...result.keywords.highIntent, keyword];
          break;
        case 'medium':
          result.keywords.mediumIntent = [...result.keywords.mediumIntent, keyword];
          break;
        case 'extended':
          result.keywords.extended = [...result.keywords.extended, keyword];
          break;
      }
      this.strategyResult.set(result);
      this.toastService.success(`已添加關鍵詞: ${keyword}`);
    }
    this.showKeywordDialog.set(false);
    this.newKeywordInput = '';
  }
  
  // 🔧 取消添加關鍵詞
  cancelAddKeyword() {
    this.showKeywordDialog.set(false);
    this.newKeywordInput = '';
  }
  
  // 🔧 獲取關鍵詞類型標籤
  getKeywordLevelLabel(level: 'high' | 'medium' | 'extended'): string {
    switch (level) {
      case 'high': return '高意向';
      case 'medium': return '中意向';
      case 'extended': return '擴展';
    }
  }
  
  backToInput() {
    this.currentStep.set('input');
  }
  
  saveStrategy() {
    const result = this.strategyResult();
    if (result) {
      // 更新消息模板
      result.messageTemplates = { ...this.editableTemplates };
      
      this.ipcService.send('save-ai-strategy', {
        strategy: result
      });
      
      this.toastService.success('策略已保存！');
    }
  }
  
  startAutomation() {
    const result = this.strategyResult();
    if (result) {
      // 更新消息模板
      result.messageTemplates = { ...this.editableTemplates };
      
      this.startAutomationEvent.emit(result);
      this.toastService.success('正在啟動手動營銷...');
    }
  }
  
  /**
   * 將策略交給 AI 團隊銷售
   * AI 團隊會自動組建團隊、分配角色、制定話術
   */
  handoverToAITeam() {
    const result = this.strategyResult();
    if (result) {
      // 更新消息模板
      result.messageTemplates = { ...this.editableTemplates };
      
      this.handoverToAITeamEvent.emit(result);
      this.toastService.success('🤖 正在將策略交給 AI 團隊...');
    }
  }
}
