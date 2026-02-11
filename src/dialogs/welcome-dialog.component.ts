/**
 * Phase 10: Welcome / First-Run Setup Dialog
 * Extracted from app.component.html (183 lines)
 */
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-welcome-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-cyan-500/30">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-cyan-500 to-purple-500 p-6 text-center">
          <h1 class="text-3xl font-bold text-white mb-2">🚀 歡迎使用 TG-AI智控王</h1>
          <p class="text-cyan-100">AI 驅動的 Telegram 營銷自動化平台</p>
        </div>
        
        <!-- Step Indicator -->
        <div class="flex justify-center gap-2 py-4 bg-slate-800/50">
          <div class="w-3 h-3 rounded-full transition-all" 
               [class]="step() >= 1 ? 'bg-cyan-500' : 'bg-slate-600'"></div>
          <div class="w-3 h-3 rounded-full transition-all" 
               [class]="step() >= 2 ? 'bg-cyan-500' : 'bg-slate-600'"></div>
          <div class="w-3 h-3 rounded-full transition-all" 
               [class]="step() >= 3 ? 'bg-cyan-500' : 'bg-slate-600'"></div>
        </div>
        
        <!-- Content -->
        <div class="p-6">
          @switch (step()) {
            @case (1) {
              <div class="text-center space-y-6">
                <div class="grid grid-cols-3 gap-4 mb-6">
                  <div class="p-4 bg-slate-700/50 rounded-xl">
                    <div class="text-3xl mb-2">🤖</div>
                    <div class="text-sm font-medium text-white">AI 自動回覆</div>
                    <div class="text-xs text-slate-400">智能客服助手</div>
                  </div>
                  <div class="p-4 bg-slate-700/50 rounded-xl">
                    <div class="text-3xl mb-2">🔍</div>
                    <div class="text-sm font-medium text-white">資源發現</div>
                    <div class="text-xs text-slate-400">自動搜索群組</div>
                  </div>
                  <div class="p-4 bg-slate-700/50 rounded-xl">
                    <div class="text-3xl mb-2">📊</div>
                    <div class="text-sm font-medium text-white">數據分析</div>
                    <div class="text-xs text-slate-400">轉化追蹤報表</div>
                  </div>
                </div>
                <p class="text-slate-300">
                  TG-AI智控王 將幫助您自動化 Telegram 營銷流程，<br>
                  讓您專注於業務增長而非重複操作。
                </p>
              </div>
            }
            @case (2) {
              <div class="space-y-4">
                <h3 class="text-lg font-semibold text-white text-center mb-4">🦙 AI 服務配置</h3>
                
                <div class="p-4 rounded-xl" 
                     [class]="ollamaDetected() ? 'bg-green-500/20 border border-green-500/30' : 'bg-yellow-500/20 border border-yellow-500/30'">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">{{ ollamaDetected() ? '✅' : '⚠️' }}</span>
                      <div>
                        <div class="font-medium text-white">
                          {{ ollamaDetected() ? 'Ollama 已檢測到' : 'Ollama 未運行' }}
                        </div>
                        <div class="text-sm text-slate-400">
                          {{ ollamaDetected() ? '本地 AI 服務可用' : '建議安裝 Ollama 獲得免費 AI 能力' }}
                        </div>
                      </div>
                    </div>
                    <button (click)="detectOllamaClick.emit()" [disabled]="isDetecting()"
                            class="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white disabled:opacity-50">
                      {{ isDetecting() ? '檢測中...' : '重新檢測' }}
                    </button>
                  </div>
                </div>
                
                @if (ollamaDetected()) {
                  <div class="p-4 bg-slate-700/50 rounded-xl">
                    <label class="block text-sm font-medium text-slate-300 mb-2">選擇 AI 模型</label>
                    @if (ollamaModels().length > 0) {
                      <select [ngModel]="localModel()" (ngModelChange)="localModelChange.emit($event)"
                              class="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-white">
                        @for (model of ollamaModels(); track model) {
                          <option [value]="model">{{ model }}</option>
                        }
                      </select>
                    } @else {
                      <input [ngModel]="localModel()" (ngModelChange)="localModelChange.emit($event)"
                             class="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-white"
                             placeholder="qwen2:7b">
                    }
                    <p class="text-xs text-slate-500 mt-1">推薦：qwen2:7b（中英文通用）</p>
                  </div>
                } @else {
                  <div class="p-4 bg-slate-700/50 rounded-xl">
                    <div class="text-sm text-slate-300 space-y-2">
                      <p class="font-medium">📦 安裝 Ollama（免費）：</p>
                      <code class="block bg-slate-800 p-2 rounded text-cyan-400 text-xs">
                        curl -fsSL https://ollama.com/install.sh | sh
                      </code>
                      <p class="text-xs text-slate-500">
                        安裝後運行 <code class="text-cyan-400">ollama pull qwen2:7b</code> 下載模型
                      </p>
                    </div>
                  </div>
                  
                  <div class="p-4 bg-slate-700/50 rounded-xl">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" [checked]="autoFallback()" (change)="autoFallbackChange.emit(!autoFallback())"
                             class="w-4 h-4 text-cyan-500 rounded">
                      <span class="text-sm text-slate-300">使用雲端 AI 作為備選</span>
                    </label>
                    @if (autoFallback()) {
                      <div class="mt-2">
                        <select [ngModel]="backupProvider()" (ngModelChange)="backupProviderChange.emit($event)"
                                class="w-full bg-slate-800 border border-slate-600 rounded py-1 px-2 text-sm text-white">
                          <option value="gemini">Google Gemini（免費額度）</option>
                          <option value="openai">OpenAI GPT</option>
                        </select>
                      </div>
                    }
                  </div>
                }
              </div>
            }
            @case (3) {
              <div class="text-center space-y-6">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-2xl font-bold text-white">設置完成！</h3>
                <p class="text-slate-300">
                  您已準備好開始使用 TG-AI智控王。<br>
                  接下來請添加您的第一個 Telegram 帳號。
                </p>
                <div class="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
                  <div class="text-sm text-slate-300 space-y-1">
                    <p>✅ AI 服務：{{ ollamaDetected() ? 'Ollama 本地 AI' : '雲端 AI' }}</p>
                    @if (ollamaDetected()) {
                      <p>✅ 模型：{{ localModel() }}</p>
                    }
                    <p>✅ 自動降級：{{ autoFallback() ? '已啟用' : '已禁用' }}</p>
                  </div>
                </div>
              </div>
            }
          }
        </div>
        
        <!-- Footer -->
        <div class="p-6 bg-slate-800/50 flex justify-between items-center">
          <button (click)="skip.emit()" class="text-sm text-slate-400 hover:text-white transition-colors">
            跳過設置
          </button>
          <div class="flex gap-3">
            @if (step() > 1) {
              <button (click)="stepChange.emit(step() - 1)"
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                上一步
              </button>
            }
            @if (step() < 3) {
              <button (click)="stepChange.emit(step() + 1)"
                      class="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all">
                下一步
              </button>
            } @else {
              <button (click)="complete.emit()"
                      class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg transition-all">
                開始使用 🚀
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class WelcomeDialogComponent {
  step = input(1);
  ollamaDetected = input(false);
  isDetecting = input(false);
  ollamaModels = input<string[]>([]);
  localModel = input('');
  autoFallback = input(false);
  backupProvider = input('gemini');

  skip = output<void>();
  complete = output<void>();
  stepChange = output<number>();
  detectOllamaClick = output<void>();
  localModelChange = output<string>();
  autoFallbackChange = output<boolean>();
  backupProviderChange = output<string>();
}
