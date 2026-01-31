/**
 * 多語言營銷模板服務
 * Marketing Templates Service
 * 
 * 🆕 P5 階段：高級功能擴展
 * 
 * 功能：
 * - 多語言模板管理
 * - 變量替換
 * - 模板分類
 * - AI 生成建議
 */

import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

/** 支持的語言 */
export type Language = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko' | 'th' | 'vi';

/** 模板類型 */
export type TemplateType = 
  | 'opening'           // 開場白
  | 'follow_up'         // 跟進
  | 'product_intro'     // 產品介紹
  | 'objection_handling'// 異議處理
  | 'closing'           // 促成成交
  | 'greeting'          // 問候
  | 'thank_you';        // 感謝

/** 模板場景 */
export type TemplateScene = 
  | 'private_chat'      // 私聊
  | 'group_chat'        // 群聊
  | 'cold_outreach'     // 冷啟動
  | 'warm_follow_up'    // 溫暖跟進
  | 'vip_service';      // VIP 服務

/** 營銷模板 */
export interface MarketingTemplate {
  id: string;
  name: string;
  description?: string;
  
  // 分類
  type: TemplateType;
  scene: TemplateScene;
  tags: string[];
  
  // 內容（多語言）
  content: Record<Language, string>;
  
  // 變量
  variables: TemplateVariable[];
  
  // 元數據
  isSystem: boolean;
  usageCount: number;
  rating: number;       // 1-5 評分
  
  createdAt: Date;
  updatedAt: Date;
}

/** 模板變量 */
export interface TemplateVariable {
  name: string;         // 變量名（不含大括號）
  label: string;        // 顯示標籤
  defaultValue?: string;
  type: 'text' | 'number' | 'date' | 'list';
  required: boolean;
}

/** 生成的消息 */
export interface GeneratedMessage {
  content: string;
  language: Language;
  templateId: string;
  variables: Record<string, string>;
}

// ============ 語言配置 ============

export const LANGUAGE_CONFIG: Record<Language, { label: string; flag: string }> = {
  'zh-TW': { label: '繁體中文', flag: '🇹🇼' },
  'zh-CN': { label: '简体中文', flag: '🇨🇳' },
  'en': { label: 'English', flag: '🇺🇸' },
  'ja': { label: '日本語', flag: '🇯🇵' },
  'ko': { label: '한국어', flag: '🇰🇷' },
  'th': { label: 'ไทย', flag: '🇹🇭' },
  'vi': { label: 'Tiếng Việt', flag: '🇻🇳' }
};

// ============ 預設模板 ============

const DEFAULT_TEMPLATES: Partial<MarketingTemplate>[] = [
  {
    id: 'tpl_opening_friendly',
    name: '友好開場',
    type: 'opening',
    scene: 'private_chat',
    tags: ['友好', '輕鬆'],
    content: {
      'zh-TW': '嗨 {name}！看到你也在這個群裡，想跟你認識一下 😊 你平時對{topic}有興趣嗎？',
      'zh-CN': '嗨 {name}！看到你也在这个群里，想跟你认识一下 😊 你平时对{topic}有兴趣吗？',
      'en': 'Hi {name}! I noticed you in the group and wanted to connect 😊 Are you interested in {topic}?',
      'ja': 'こんにちは {name}さん！グループで見かけて、ぜひお話ししたいと思いました 😊 {topic}に興味はありますか？',
      'ko': '안녕하세요 {name}님! 그룹에서 뵙고 인사드리고 싶었어요 😊 {topic}에 관심 있으신가요?',
      'th': 'สวัสดีครับ/ค่ะ {name}! เห็นคุณในกลุ่มแล้วอยากทำความรู้จัก 😊 คุณสนใจเรื่อง {topic} ไหมครับ/คะ?',
      'vi': 'Xin chào {name}! Mình thấy bạn trong nhóm và muốn làm quen 😊 Bạn có quan tâm đến {topic} không?'
    },
    variables: [
      { name: 'name', label: '用戶名', type: 'text', required: true },
      { name: 'topic', label: '話題', type: 'text', required: true, defaultValue: '數字貨幣' }
    ],
    isSystem: true,
    rating: 4.5
  },
  {
    id: 'tpl_opening_professional',
    name: '專業開場',
    type: 'opening',
    scene: 'cold_outreach',
    tags: ['專業', '正式'],
    content: {
      'zh-TW': '您好 {name}，我是{company}的{role}。留意到您在{topic}領域非常活躍，想請教一下您目前在這方面有什麼需求或挑戰嗎？',
      'zh-CN': '您好 {name}，我是{company}的{role}。注意到您在{topic}领域非常活跃，想请教一下您目前在这方面有什么需求或挑战吗？',
      'en': 'Hello {name}, I\'m {role} from {company}. I noticed your active presence in the {topic} space. May I ask what challenges or needs you currently have in this area?',
      'ja': '{name}様、{company}の{role}と申します。{topic}分野でのご活躍を拝見しました。現在、この分野でどのような課題やニーズをお持ちでしょうか？',
      'ko': '안녕하세요 {name}님, {company}의 {role}입니다. {topic} 분야에서 활발히 활동하시는 것을 보았습니다. 현재 이 분야에서 어떤 과제나 요구 사항이 있으신지 여쭤봐도 될까요?',
      'th': 'สวัสดีครับ/ค่ะ {name} ผม/ดิฉันเป็น {role} จาก {company} สังเกตว่าคุณมีบทบาทในด้าน {topic} อยากทราบว่าคุณมีความท้าทายหรือความต้องการอะไรในด้านนี้บ้างครับ/คะ?',
      'vi': 'Xin chào {name}, tôi là {role} từ {company}. Tôi nhận thấy bạn hoạt động rất tích cực trong lĩnh vực {topic}. Xin hỏi bạn hiện đang có thách thức hoặc nhu cầu gì trong lĩnh vực này?'
    },
    variables: [
      { name: 'name', label: '用戶名', type: 'text', required: true },
      { name: 'company', label: '公司名', type: 'text', required: true, defaultValue: 'TG-Matrix' },
      { name: 'role', label: '角色', type: 'text', required: true, defaultValue: '顧問' },
      { name: 'topic', label: '領域', type: 'text', required: true, defaultValue: '數字支付' }
    ],
    isSystem: true,
    rating: 4.2
  },
  {
    id: 'tpl_follow_up_interest',
    name: '興趣跟進',
    type: 'follow_up',
    scene: 'warm_follow_up',
    tags: ['跟進', '興趣'],
    content: {
      'zh-TW': '{name}，上次聊到{topic}，你有沒有進一步了解過？我這邊有一些最新的資訊可以分享給你 📊',
      'zh-CN': '{name}，上次聊到{topic}，你有没有进一步了解过？我这边有一些最新的资讯可以分享给你 📊',
      'en': '{name}, regarding our discussion about {topic}, have you had a chance to look into it further? I have some latest updates to share with you 📊',
      'ja': '{name}さん、前回お話しした{topic}について、その後調べましたか？最新の情報をお伝えできます 📊',
      'ko': '{name}님, 지난번 {topic}에 대해 이야기했는데, 더 알아보셨나요? 최신 정보를 공유해 드릴 수 있어요 📊',
      'th': '{name} เรื่อง {topic} ที่คุยกันครั้งก่อน คุณได้ศึกษาเพิ่มเติมบ้างไหมครับ/คะ? มีข้อมูลล่าสุดมาแชร์ให้ครับ/ค่ะ 📊',
      'vi': '{name}, về {topic} mà chúng ta đã thảo luận, bạn đã tìm hiểu thêm chưa? Mình có một số thông tin mới nhất muốn chia sẻ với bạn 📊'
    },
    variables: [
      { name: 'name', label: '用戶名', type: 'text', required: true },
      { name: 'topic', label: '話題', type: 'text', required: true }
    ],
    isSystem: true,
    rating: 4.3
  },
  {
    id: 'tpl_objection_price',
    name: '價格異議處理',
    type: 'objection_handling',
    scene: 'private_chat',
    tags: ['異議', '價格'],
    content: {
      'zh-TW': '理解你的考量！其實{product}的價值在於{benefit}。很多客戶用了之後發現，長期來看反而更省成本。我可以幫你算一下？',
      'zh-CN': '理解你的考量！其实{product}的价值在于{benefit}。很多客户用了之后发现，长期来看反而更省成本。我可以帮你算一下？',
      'en': 'I understand your concern! The value of {product} lies in {benefit}. Many customers find it actually saves costs in the long run. Shall I help you calculate?',
      'ja': 'ご懸念は理解できます！{product}の価値は{benefit}にあります。多くのお客様が長期的にはコスト削減になると感じています。計算してみましょうか？',
      'ko': '걱정되시는 점 이해해요! {product}의 가치는 {benefit}에 있어요. 많은 고객분들이 장기적으로 오히려 비용이 절약된다고 하세요. 계산해 드릴까요?',
      'th': 'เข้าใจความกังวลของคุณครับ/ค่ะ! คุณค่าของ {product} อยู่ที่ {benefit} ลูกค้าหลายคนพบว่าในระยะยาวประหยัดกว่า ให้ช่วยคำนวณไหมครับ/คะ?',
      'vi': 'Mình hiểu lo lắng của bạn! Giá trị của {product} nằm ở {benefit}. Nhiều khách hàng nhận thấy về lâu dài thực sự tiết kiệm hơn. Để mình tính toán cho bạn nhé?'
    },
    variables: [
      { name: 'product', label: '產品名', type: 'text', required: true },
      { name: 'benefit', label: '核心價值', type: 'text', required: true }
    ],
    isSystem: true,
    rating: 4.4
  },
  {
    id: 'tpl_closing_urgency',
    name: '促成成交（緊迫感）',
    type: 'closing',
    scene: 'private_chat',
    tags: ['成交', '緊迫'],
    content: {
      'zh-TW': '{name}，現在{promotion}只剩下{days}天了！錯過這次優惠，下次不知道要等多久。要不要我先幫你預留一個名額？',
      'zh-CN': '{name}，现在{promotion}只剩下{days}天了！错过这次优惠，下次不知道要等多久。要不要我先帮你预留一个名额？',
      'en': '{name}, the {promotion} only has {days} days left! Miss this and who knows when the next one will be. Want me to reserve a spot for you?',
      'ja': '{name}さん、{promotion}はあと{days}日だけです！このチャンスを逃すと次はいつになるかわかりません。お席を確保しましょうか？',
      'ko': '{name}님, {promotion}이 {days}일 남았어요! 이번 기회를 놓치면 다음은 언제인지 몰라요. 자리 예약해 드릴까요?',
      'th': '{name} ตอนนี้ {promotion} เหลืออีกแค่ {days} วัน! พลาดโอกาสนี้ไม่รู้จะต้องรอนานแค่ไหน ให้จองที่ไว้ให้ไหมครับ/คะ?',
      'vi': '{name}, {promotion} chỉ còn {days} ngày! Bỏ lỡ lần này không biết phải đợi đến bao giờ. Để mình giữ chỗ cho bạn nhé?'
    },
    variables: [
      { name: 'name', label: '用戶名', type: 'text', required: true },
      { name: 'promotion', label: '促銷活動', type: 'text', required: true, defaultValue: '新年優惠' },
      { name: 'days', label: '剩餘天數', type: 'number', required: true, defaultValue: '3' }
    ],
    isSystem: true,
    rating: 4.1
  }
];

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class MarketingTemplatesService {
  
  // 模板列表
  private _templates = signal<MarketingTemplate[]>([]);
  templates = this._templates.asReadonly();
  
  // 當前語言
  private _currentLanguage = signal<Language>('zh-TW');
  currentLanguage = this._currentLanguage.asReadonly();
  
  // 按類型分組
  templatesByType = computed(() => {
    const map = new Map<TemplateType, MarketingTemplate[]>();
    this._templates().forEach(t => {
      const list = map.get(t.type) || [];
      list.push(t);
      map.set(t.type, list);
    });
    return map;
  });
  
  // 熱門模板
  popularTemplates = computed(() => 
    this._templates()
      .filter(t => t.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
  );
  
  private readonly STORAGE_KEY = 'marketingTemplates';
  
  constructor() {
    this.loadFromStorage();
    this.initDefaultTemplates();
  }
  
  // ============ 模板管理 ============
  
  /**
   * 創建模板
   */
  createTemplate(config: {
    name: string;
    description?: string;
    type: TemplateType;
    scene: TemplateScene;
    tags?: string[];
    content: Partial<Record<Language, string>>;
    variables?: Omit<TemplateVariable, 'required'>[];
  }): MarketingTemplate {
    // 確保至少有一種語言的內容
    const content: Record<Language, string> = {
      'zh-TW': config.content['zh-TW'] || '',
      'zh-CN': config.content['zh-CN'] || config.content['zh-TW'] || '',
      'en': config.content['en'] || '',
      'ja': config.content['ja'] || '',
      'ko': config.content['ko'] || '',
      'th': config.content['th'] || '',
      'vi': config.content['vi'] || ''
    };
    
    const template: MarketingTemplate = {
      id: `tpl_${Date.now()}`,
      name: config.name,
      description: config.description,
      type: config.type,
      scene: config.scene,
      tags: config.tags || [],
      content,
      variables: (config.variables || []).map(v => ({ ...v, required: true })),
      isSystem: false,
      usageCount: 0,
      rating: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this._templates.update(t => [...t, template]);
    this.saveToStorage();
    
    console.log(`[Templates] 創建模板: ${template.name}`);
    return template;
  }
  
  /**
   * 更新模板
   */
  updateTemplate(templateId: string, updates: Partial<MarketingTemplate>) {
    this._templates.update(templates => 
      templates.map(t => t.id === templateId ? { ...t, ...updates, updatedAt: new Date() } : t)
    );
    this.saveToStorage();
  }
  
  /**
   * 刪除模板
   */
  deleteTemplate(templateId: string): boolean {
    const template = this._templates().find(t => t.id === templateId);
    if (!template || template.isSystem) return false;
    
    this._templates.update(t => t.filter(tpl => tpl.id !== templateId));
    this.saveToStorage();
    return true;
  }
  
  /**
   * 獲取模板
   */
  getTemplate(templateId: string): MarketingTemplate | undefined {
    return this._templates().find(t => t.id === templateId);
  }
  
  // ============ 消息生成 ============
  
  /**
   * 生成消息
   */
  generateMessage(
    templateId: string,
    variables: Record<string, string>,
    language?: Language
  ): GeneratedMessage | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;
    
    const lang = language || this._currentLanguage();
    let content = template.content[lang] || template.content['zh-TW'] || '';
    
    // 替換變量
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    
    // 替換默認值
    for (const variable of template.variables) {
      if (variable.defaultValue && !variables[variable.name]) {
        content = content.replace(
          new RegExp(`\\{${variable.name}\\}`, 'g'),
          variable.defaultValue
        );
      }
    }
    
    // 更新使用次數
    this.updateTemplate(templateId, { usageCount: template.usageCount + 1 });
    
    return {
      content,
      language: lang,
      templateId,
      variables
    };
  }
  
  /**
   * 預覽消息
   */
  previewMessage(
    templateId: string,
    variables?: Record<string, string>,
    language?: Language
  ): string {
    const template = this.getTemplate(templateId);
    if (!template) return '';
    
    const lang = language || this._currentLanguage();
    let content = template.content[lang] || template.content['zh-TW'] || '';
    
    // 使用變量或默認值
    for (const variable of template.variables) {
      const value = variables?.[variable.name] || variable.defaultValue || `[${variable.label}]`;
      content = content.replace(new RegExp(`\\{${variable.name}\\}`, 'g'), value);
    }
    
    return content;
  }
  
  // ============ 搜索和過濾 ============
  
  /**
   * 搜索模板
   */
  searchTemplates(query: string): MarketingTemplate[] {
    const lowerQuery = query.toLowerCase();
    
    return this._templates().filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      Object.values(t.content).some(c => c.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * 按條件過濾
   */
  filterTemplates(filters: {
    type?: TemplateType;
    scene?: TemplateScene;
    tags?: string[];
    hasLanguage?: Language;
  }): MarketingTemplate[] {
    return this._templates().filter(t => {
      if (filters.type && t.type !== filters.type) return false;
      if (filters.scene && t.scene !== filters.scene) return false;
      if (filters.tags && !filters.tags.some(tag => t.tags.includes(tag))) return false;
      if (filters.hasLanguage && !t.content[filters.hasLanguage]) return false;
      return true;
    });
  }
  
  // ============ 語言管理 ============
  
  /**
   * 設置當前語言
   */
  setLanguage(language: Language) {
    this._currentLanguage.set(language);
    this.saveToStorage();
  }
  
  /**
   * 獲取支持的語言
   */
  getSupportedLanguages(): { code: Language; label: string; flag: string }[] {
    return Object.entries(LANGUAGE_CONFIG).map(([code, config]) => ({
      code: code as Language,
      ...config
    }));
  }
  
  /**
   * 翻譯模板（佔位符，實際可調用翻譯 API）
   */
  async translateTemplate(templateId: string, targetLanguage: Language): Promise<boolean> {
    const template = this.getTemplate(templateId);
    if (!template) return false;
    
    // 找到有內容的源語言
    const sourceLang = Object.entries(template.content).find(([_, content]) => content)?.[0] as Language;
    if (!sourceLang) return false;
    
    // 這裡可以調用翻譯 API
    // 目前只是複製源語言內容作為佔位符
    const sourceContent = template.content[sourceLang];
    
    this.updateTemplate(templateId, {
      content: {
        ...template.content,
        [targetLanguage]: `[待翻譯] ${sourceContent}`
      }
    });
    
    console.log(`[Templates] 模板翻譯: ${templateId} -> ${targetLanguage}`);
    return true;
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 獲取類型選項
   */
  getTypeOptions(): { type: TemplateType; label: string; icon: string }[] {
    return [
      { type: 'opening', label: '開場白', icon: '👋' },
      { type: 'follow_up', label: '跟進', icon: '🔄' },
      { type: 'product_intro', label: '產品介紹', icon: '📦' },
      { type: 'objection_handling', label: '異議處理', icon: '🤝' },
      { type: 'closing', label: '促成成交', icon: '🎯' },
      { type: 'greeting', label: '問候', icon: '😊' },
      { type: 'thank_you', label: '感謝', icon: '🙏' }
    ];
  }
  
  /**
   * 獲取場景選項
   */
  getSceneOptions(): { scene: TemplateScene; label: string }[] {
    return [
      { scene: 'private_chat', label: '私聊' },
      { scene: 'group_chat', label: '群聊' },
      { scene: 'cold_outreach', label: '冷啟動' },
      { scene: 'warm_follow_up', label: '溫暖跟進' },
      { scene: 'vip_service', label: 'VIP 服務' }
    ];
  }
  
  /**
   * 初始化默認模板
   */
  private initDefaultTemplates() {
    const existing = this._templates();
    const existingIds = new Set(existing.map(t => t.id));
    
    for (const defaultTpl of DEFAULT_TEMPLATES) {
      if (!existingIds.has(defaultTpl.id!)) {
        const template: MarketingTemplate = {
          ...defaultTpl as MarketingTemplate,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this._templates.update(t => [...t, template]);
      }
    }
    
    this.saveToStorage();
  }
  
  // ============ 持久化 ============
  
  private saveToStorage() {
    const data = {
      templates: this._templates().filter(t => !t.isSystem),
      currentLanguage: this._currentLanguage(),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.templates) {
        this._templates.set(data.templates.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        })));
      }
      
      if (data.currentLanguage) {
        this._currentLanguage.set(data.currentLanguage);
      }
      
      console.log('[Templates] 已從存儲恢復數據');
    } catch (e) {
      console.error('[Templates] 恢復數據失敗:', e);
    }
  }
}
