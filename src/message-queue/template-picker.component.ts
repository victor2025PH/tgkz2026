/**
 * 消息模板快速選擇器組件
 * Template Quick Picker Component
 * 
 * 功能:
 * 1. 快速選擇預設模板
 * 2. 變量自動替換
 * 3. 預覽消息
 * 4. 常用模板置頂
 */

import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 消息模板
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  usageCount: number;
  lastUsedAt?: Date;
  isActive: boolean;
  emoji?: string;
}

// 模板變量值
export interface TemplateVariables {
  name?: string;
  username?: string;
  firstName?: string;
  product?: string;
  price?: string;
  discount?: string;
  custom?: Record<string, string>;
}

@Component({
  selector: 'app-template-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="template-picker">
      <!-- 搜索欄 -->
      <div class="relative mb-3">
        <input type="text"
               [(ngModel)]="searchText"
               class="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 pl-9 text-sm text-white
                      placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
               placeholder="搜索模板...">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
      </div>
      
      <!-- 類別標籤 -->
      <div class="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        <button (click)="activeCategory.set('all')"
                class="px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0"
                [class.bg-cyan-500]="activeCategory() === 'all'"
                [class.text-white]="activeCategory() === 'all'"
                [class.bg-slate-700]="activeCategory() !== 'all'"
                [class.text-slate-400]="activeCategory() !== 'all'">
          全部
        </button>
        <button (click)="activeCategory.set('frequent')"
                class="px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0"
                [class.bg-cyan-500]="activeCategory() === 'frequent'"
                [class.text-white]="activeCategory() === 'frequent'"
                [class.bg-slate-700]="activeCategory() !== 'frequent'"
                [class.text-slate-400]="activeCategory() !== 'frequent'">
          ⭐ 常用
        </button>
        @for (cat of categories(); track cat) {
          <button (click)="activeCategory.set(cat)"
                  class="px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0"
                  [class.bg-cyan-500]="activeCategory() === cat"
                  [class.text-white]="activeCategory() === cat"
                  [class.bg-slate-700]="activeCategory() !== cat"
                  [class.text-slate-400]="activeCategory() !== cat">
            {{ cat }}
          </button>
        }
      </div>
      
      <!-- 模板列表 -->
      <div class="space-y-2 max-h-60 overflow-y-auto">
        @for (template of filteredTemplates(); track template.id) {
          <div (click)="selectTemplate(template)"
               class="p-3 bg-slate-800/50 rounded-lg border border-transparent cursor-pointer
                      hover:bg-slate-700/50 hover:border-cyan-500/30 transition-all group"
               [class.border-cyan-500]="selectedTemplate()?.id === template.id"
               [class.bg-cyan-500/10]="selectedTemplate()?.id === template.id">
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                @if (template.emoji) {
                  <span class="text-lg">{{ template.emoji }}</span>
                }
                <span class="text-sm font-medium text-white">{{ template.name }}</span>
                @if (template.usageCount > 10) {
                  <span class="px-1 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">熱門</span>
                }
              </div>
              <span class="text-xs text-slate-500">{{ template.category }}</span>
            </div>
            <p class="text-xs text-slate-400 line-clamp-2">{{ template.content }}</p>
            @if (template.variables.length > 0) {
              <div class="flex flex-wrap gap-1 mt-1.5">
                @for (v of template.variables.slice(0, 3); track v) {
                  <span class="px-1 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">{{ '{' + v + '}' }}</span>
                }
                @if (template.variables.length > 3) {
                  <span class="text-xs text-slate-500">+{{ template.variables.length - 3 }}</span>
                }
              </div>
            }
          </div>
        }
        
        @if (filteredTemplates().length === 0) {
          <div class="p-6 text-center text-slate-500">
            <div class="text-3xl mb-2">📝</div>
            <p class="text-sm">沒有找到模板</p>
          </div>
        }
      </div>
      
      <!-- 預覽和變量 -->
      @if (selectedTemplate()) {
        <div class="mt-4 p-3 bg-slate-800/80 rounded-lg border border-cyan-500/30">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-white">消息預覽</h4>
            <button (click)="clearSelection()"
                    class="text-xs text-slate-400 hover:text-white">
              取消選擇
            </button>
          </div>
          
          <!-- 變量輸入 -->
          @if (selectedTemplate()!.variables.length > 0) {
            <div class="grid grid-cols-2 gap-2 mb-3">
              @for (v of selectedTemplate()!.variables; track v) {
                <div>
                  <label class="text-xs text-slate-400 block mb-1">{{ '{' + v + '}' }}</label>
                  <input type="text"
                         [value]="getVariableValue(v)"
                         (input)="setVariableValue(v, $any($event.target).value)"
                         class="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                         [placeholder]="getVariablePlaceholder(v)">
                </div>
              }
            </div>
          }
          
          <!-- 預覽內容 -->
          <div class="p-3 bg-slate-900/50 rounded-lg text-sm text-slate-300 whitespace-pre-wrap">
            {{ previewContent() }}
          </div>
          
          <!-- 使用按鈕 -->
          <button (click)="useTemplate()"
                  class="w-full mt-3 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg 
                         text-sm font-medium transition-colors">
            使用此模板
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class TemplatePickerComponent {
  // 輸入
  templates = input<MessageTemplate[]>([]);
  recipientName = input('');
  recipientUsername = input('');
  
  // 輸出
  templateSelected = output<{ template: MessageTemplate; content: string; variables: Record<string, string> }>();
  
  // 狀態
  searchText = '';
  activeCategory = signal<string>('all');
  selectedTemplate = signal<MessageTemplate | null>(null);
  variableValues = signal<Record<string, string>>({});
  
  // 類別列表
  categories = computed(() => {
    const cats = new Set<string>();
    for (const t of this.templates()) {
      if (t.category) cats.add(t.category);
    }
    return Array.from(cats);
  });
  
  // 過濾後的模板
  filteredTemplates = computed(() => {
    let result = this.templates().filter(t => t.isActive);
    
    // 按類別過濾
    if (this.activeCategory() === 'frequent') {
      result = result.sort((a, b) => b.usageCount - a.usageCount).slice(0, 10);
    } else if (this.activeCategory() !== 'all') {
      result = result.filter(t => t.category === this.activeCategory());
    }
    
    // 搜索過濾
    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(search) || 
        t.content.toLowerCase().includes(search)
      );
    }
    
    return result;
  });
  
  // 預覽內容
  previewContent = computed(() => {
    const template = this.selectedTemplate();
    if (!template) return '';
    
    let content = template.content;
    const values = this.variableValues();
    
    // 替換變量
    for (const [key, value] of Object.entries(values)) {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`);
    }
    
    // 替換預設變量
    content = content.replace(/\{name\}/g, this.recipientName() || '{name}');
    content = content.replace(/\{username\}/g, this.recipientUsername() || '{username}');
    
    return content;
  });
  
  selectTemplate(template: MessageTemplate) {
    this.selectedTemplate.set(template);
    
    // 預填充接收者信息
    const values: Record<string, string> = {};
    if (template.variables.includes('name')) {
      values['name'] = this.recipientName();
    }
    if (template.variables.includes('username')) {
      values['username'] = this.recipientUsername();
    }
    this.variableValues.set(values);
  }
  
  clearSelection() {
    this.selectedTemplate.set(null);
    this.variableValues.set({});
  }
  
  getVariableValue(variable: string): string {
    return this.variableValues()[variable] || '';
  }
  
  setVariableValue(variable: string, value: string) {
    this.variableValues.update(v => ({ ...v, [variable]: value }));
  }
  
  getVariablePlaceholder(variable: string): string {
    const placeholders: Record<string, string> = {
      name: '接收者名稱',
      username: '用戶名',
      firstName: '名字',
      product: '產品名稱',
      price: '價格',
      discount: '折扣'
    };
    return placeholders[variable] || variable;
  }
  
  useTemplate() {
    const template = this.selectedTemplate();
    if (!template) return;
    
    this.templateSelected.emit({
      template,
      content: this.previewContent(),
      variables: this.variableValues()
    });
  }
}

// 快速回覆欄組件
@Component({
  selector: 'app-quick-reply-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quick-reply-bar flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
      <span class="text-xs text-slate-500 shrink-0">快速回覆:</span>
      <div class="flex gap-1.5 overflow-x-auto">
        @for (reply of quickReplies(); track reply.id) {
          <button (click)="selectReply(reply)"
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg 
                         text-xs whitespace-nowrap transition-colors shrink-0">
            @if (reply.emoji) {
              <span class="mr-1">{{ reply.emoji }}</span>
            }
            {{ reply.label }}
          </button>
        }
      </div>
      <button (click)="showMore.emit()"
              class="p-1.5 text-slate-400 hover:text-white transition-colors shrink-0">
        <span class="text-sm">📝</span>
      </button>
    </div>
  `
})
export class QuickReplyBarComponent {
  quickReplies = input<{ id: string; label: string; content: string; emoji?: string }[]>([
    { id: '1', label: '你好', content: '你好！有什麼可以幫你的嗎？', emoji: '👋' },
    { id: '2', label: '稍等', content: '好的，請稍等，我馬上回覆你', emoji: '⏳' },
    { id: '3', label: '感謝', content: '非常感謝你的關注！', emoji: '🙏' },
    { id: '4', label: '價格', content: '關於價格，可以私聊詳談', emoji: '💰' },
    { id: '5', label: '加好友', content: '可以加我好友，方便詳聊', emoji: '➕' }
  ]);
  
  replySelected = output<{ id: string; content: string }>();
  showMore = output<void>();
  
  selectReply(reply: { id: string; label: string; content: string }) {
    this.replySelected.emit({ id: reply.id, content: reply.content });
  }
}

// 模板預設數據
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 't1',
    name: '初次問候',
    content: '你好 {name}！看到你對我們的產品感興趣，有什麼可以幫你的嗎？',
    category: '問候',
    variables: ['name'],
    usageCount: 25,
    isActive: true,
    emoji: '👋'
  },
  {
    id: 't2',
    name: '產品介紹',
    content: '我們的 {product} 現在有優惠活動！原價 {price}，現在只要 {discount}。有興趣了解更多嗎？',
    category: '銷售',
    variables: ['product', 'price', 'discount'],
    usageCount: 18,
    isActive: true,
    emoji: '🎁'
  },
  {
    id: 't3',
    name: '跟進詢問',
    content: 'Hi {name}，上次聊的事情你考慮得怎麼樣了？有任何問題都可以問我哦',
    category: '跟進',
    variables: ['name'],
    usageCount: 32,
    isActive: true,
    emoji: '💭'
  },
  {
    id: 't4',
    name: '感謝購買',
    content: '感謝 {name} 的信任和支持！有任何問題隨時聯繫我，祝你使用愉快！',
    category: '售後',
    variables: ['name'],
    usageCount: 15,
    isActive: true,
    emoji: '🎉'
  },
  {
    id: 't5',
    name: '節日問候',
    content: '{name} 你好！{holiday} 快樂！願你一切順利，有空常聯繫！',
    category: '問候',
    variables: ['name', 'holiday'],
    usageCount: 8,
    isActive: true,
    emoji: '🎊'
  },
  {
    id: 't6',
    name: '活動邀請',
    content: '{name} 你好！我們正在舉辦 {event}，特別邀請你參加！時間：{time}，感興趣嗎？',
    category: '活動',
    variables: ['name', 'event', 'time'],
    usageCount: 12,
    isActive: true,
    emoji: '📢'
  }
];
