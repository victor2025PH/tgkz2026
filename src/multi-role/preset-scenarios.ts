/**
 * 10個預設劇本場景模板
 * 包含完整的角色配置和流程設計
 */

import { ScriptTemplate, ScriptStage, ScriptMessage, RoleType } from './multi-role.models';
import { ExtendedRoleType } from './preset-roles';

// 場景類型
export type ScenarioType = 
  | 'new_customer_icebreak'     // 新客戶破冰
  | 'hesitant_conversion'       // 猶豫客戶促單
  | 'aftersales_handling'       // 售後問題處理
  | 'vip_service'               // 高價值客戶服務
  | 'community_activation'      // 社群活躍引導
  | 'product_launch'            // 產品發布推廣
  | 'education_sales'           // 教育課程銷售
  | 'b2b_cooperation'           // B2B企業合作
  | 'competitor_conversion'     // 競品用戶轉化
  | 'churn_recovery';           // 流失客戶挽回

// 場景元數據
export const SCENARIO_META: Record<ScenarioType, {
  icon: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: string;
  successRate: string;
}> = {
  new_customer_icebreak: {
    icon: '🤝',
    name: '新客戶破冰',
    description: '自然互動 → 體驗分享 → 專業介紹',
    difficulty: 'easy',
    duration: '10-15分鐘',
    successRate: '65%'
  },
  hesitant_conversion: {
    icon: '💪',
    name: '猶豫客戶促單',
    description: '需求確認 → 報價談判 → 特批優惠',
    difficulty: 'medium',
    duration: '20-30分鐘',
    successRate: '45%'
  },
  aftersales_handling: {
    icon: '🔧',
    name: '售後問題處理',
    description: '問題記錄 → 技術排查 → 滿意度補償',
    difficulty: 'medium',
    duration: '15-25分鐘',
    successRate: '85%'
  },
  vip_service: {
    icon: '👑',
    name: '高價值客戶服務',
    description: '尊貴接待 → 定制方案 → 戰略合作',
    difficulty: 'hard',
    duration: '30-45分鐘',
    successRate: '70%'
  },
  community_activation: {
    icon: '🎉',
    name: '社群活躍引導',
    description: '話題發起 → 互動討論 → 價值總結',
    difficulty: 'easy',
    duration: '持續性',
    successRate: '80%'
  },
  product_launch: {
    icon: '🚀',
    name: '產品發布推廣',
    description: '預熱造勢 → 專業測評 → 活動引爆',
    difficulty: 'hard',
    duration: '多日活動',
    successRate: '55%'
  },
  education_sales: {
    icon: '📚',
    name: '教育課程銷售',
    description: '需求分析 → 課程介紹 → 學員見證',
    difficulty: 'medium',
    duration: '20-30分鐘',
    successRate: '50%'
  },
  b2b_cooperation: {
    icon: '🏢',
    name: 'B2B企業合作',
    description: '合作邀約 → 方案設計 → 項目推進',
    difficulty: 'hard',
    duration: '多輪跟進',
    successRate: '35%'
  },
  competitor_conversion: {
    icon: '🎯',
    name: '競品用戶轉化',
    description: '痛點共鳴 → 優勢對比 → 遷移優惠',
    difficulty: 'hard',
    duration: '25-40分鐘',
    successRate: '40%'
  },
  churn_recovery: {
    icon: '💝',
    name: '流失客戶挽回',
    description: '關懷回訪 → 問題解決 → 續費優惠',
    difficulty: 'medium',
    duration: '15-25分鐘',
    successRate: '30%'
  }
};

// 場景角色配置
export interface ScenarioRoleConfig {
  roleType: ExtendedRoleType;
  order: number;          // 出場順序
  isRequired: boolean;    // 是否必需
  purpose: string;        // 角色目的
}

// 預設場景模板接口
export interface PresetScenario {
  id: string;
  type: ScenarioType;
  name: string;
  description: string;
  roles: ScenarioRoleConfig[];
  stages: {
    id: string;
    name: string;
    roleType: ExtendedRoleType;
    triggerType: 'time' | 'message' | 'manual';
    delaySeconds?: number;
    messageTemplate: string;
    aiPrompt?: string;
    successCondition?: string;
  }[];
  tips: string[];
}

// 10個預設場景模板
export const PRESET_SCENARIOS: PresetScenario[] = [
  // 場景1: 新客戶破冰
  {
    id: 'scenario_new_customer_icebreak',
    type: 'new_customer_icebreak',
    name: '新客戶破冰',
    description: '通過熱心群友和老用戶的真實分享，自然地介紹產品，讓新客戶快速建立信任',
    roles: [
      { roleType: 'friendly_member', order: 1, isRequired: true, purpose: '活躍氣氛，自然引入話題' },
      { roleType: 'loyal_customer', order: 2, isRequired: true, purpose: '分享真實使用體驗' },
      { roleType: 'sales_manager', order: 3, isRequired: true, purpose: '專業解答，促成意向' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '話題引入',
        roleType: 'friendly_member',
        triggerType: 'time',
        delaySeconds: 30,
        messageTemplate: '大家好！最近有沒有什麼好用的{產品類型}推薦啊？',
        successCondition: '客戶參與討論'
      },
      {
        id: 'stage_2',
        name: '體驗分享',
        roleType: 'loyal_customer',
        triggerType: 'time',
        delaySeconds: 60,
        messageTemplate: '我用{產品名}半年多了，感覺還不錯！一開始也是朋友推薦的，沒想到真的很好用~',
        aiPrompt: '以老用戶身份分享使用體驗，真實自然，可以提到一些小缺點但總體滿意'
      },
      {
        id: 'stage_3',
        name: '專業介紹',
        roleType: 'sales_manager',
        triggerType: 'message',
        messageTemplate: '感謝分享！{客戶名}您好，我是產品顧問，有什麼具體問題可以問我~',
        aiPrompt: '以專業顧問身份詳細解答問題，注意傾聽客戶需求'
      }
    ],
    tips: [
      '熱心群友先活躍氣氛，不要一開始就推銷',
      '老用戶分享要真實自然，避免過度誇張',
      '銷售出場時機要把握，在客戶表現興趣後'
    ]
  },

  // 場景2: 猶豫客戶促單
  {
    id: 'scenario_hesitant_conversion',
    type: 'hesitant_conversion',
    name: '猶豫客戶促單',
    description: '通過層層遞進的策略，從需求確認到價格談判，最終由總監特批優惠促成成交',
    roles: [
      { roleType: 'account_manager', order: 1, isRequired: true, purpose: '了解顧慮，確認需求' },
      { roleType: 'price_specialist', order: 2, isRequired: true, purpose: '提供報價，談判價格' },
      { roleType: 'regional_director', order: 3, isRequired: false, purpose: '特批最終優惠' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '需求確認',
        roleType: 'account_manager',
        triggerType: 'manual',
        messageTemplate: '{客戶名}您好，我是您的專屬客戶經理。了解到您對{產品}有興趣，請問主要是哪些方面讓您還在考慮呢？',
        aiPrompt: '耐心傾聽客戶顧慮，逐一記錄並回應',
        successCondition: '客戶說出具體顧慮'
      },
      {
        id: 'stage_2',
        name: '報價談判',
        roleType: 'price_specialist',
        triggerType: 'message',
        delaySeconds: 120,
        messageTemplate: '我是價格專員，針對您的需求，我們可以提供一個特別方案...',
        aiPrompt: '根據客戶顧慮點設計優惠方案，強調價值而非價格'
      },
      {
        id: 'stage_3',
        name: '總監特批',
        roleType: 'regional_director',
        triggerType: 'manual',
        messageTemplate: '您好，我是區域總監。了解到您的情況，我可以特批一個額外優惠...',
        aiPrompt: '以高層身份做最後讓步，營造稀缺感'
      }
    ],
    tips: [
      '先解決價格以外的顧慮',
      '價格專員的讓步要有理由（如首單、長期合作等）',
      '總監出場是最後手段，要營造稀缺感'
    ]
  },

  // 場景3: 售後問題處理
  {
    id: 'scenario_aftersales_handling',
    type: 'aftersales_handling',
    name: '售後問題處理',
    description: '高效處理客戶售後問題，從問題記錄到技術排查，確保客戶滿意',
    roles: [
      { roleType: 'cs_agent', order: 1, isRequired: true, purpose: '記錄問題，初步安撫' },
      { roleType: 'tech_support', order: 2, isRequired: true, purpose: '技術排查，解決問題' },
      { roleType: 'complaint_handler', order: 3, isRequired: false, purpose: '處理投訴，滿意度補償' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '問題記錄',
        roleType: 'cs_agent',
        triggerType: 'message',
        messageTemplate: '您好，非常抱歉給您帶來不便！請您詳細描述一下遇到的問題，我馬上為您處理。',
        aiPrompt: '表達歉意和重視，詳細記錄問題細節',
        successCondition: '獲取問題詳情'
      },
      {
        id: 'stage_2',
        name: '技術排查',
        roleType: 'tech_support',
        triggerType: 'time',
        delaySeconds: 60,
        messageTemplate: '您好，我是技術支持。根據您描述的問題，請您嘗試以下步驟...',
        aiPrompt: '提供專業的技術解決方案，步驟清晰'
      },
      {
        id: 'stage_3',
        name: '滿意度確認',
        roleType: 'complaint_handler',
        triggerType: 'time',
        delaySeconds: 300,
        messageTemplate: '問題解決了嗎？為表歉意，我們為您申請了一份小禮品...',
        aiPrompt: '確認問題解決，提供適當補償'
      }
    ],
    tips: [
      '第一時間表達歉意和重視',
      '技術解決方案要清晰易懂',
      '問題解決後要跟進滿意度'
    ]
  },

  // 場景4: 高價值客戶服務
  {
    id: 'scenario_vip_service',
    type: 'vip_service',
    name: '高價值客戶服務',
    description: '為高價值客戶提供尊貴體驗，從VIP接待到定制方案，可升級到創始人親自對接',
    roles: [
      { roleType: 'vip_service', order: 1, isRequired: true, purpose: 'VIP專屬接待' },
      { roleType: 'solution_expert', order: 2, isRequired: true, purpose: '設計定制方案' },
      { roleType: 'founder_ceo', order: 3, isRequired: false, purpose: '戰略級合作' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '尊貴接待',
        roleType: 'vip_service',
        triggerType: 'manual',
        messageTemplate: '{客戶名}先生/女士您好！我是您的VIP專屬客服，感謝您一直以來的支持。有任何需求隨時告訴我~',
        aiPrompt: '營造尊貴感，讓客戶感受被重視'
      },
      {
        id: 'stage_2',
        name: '定制方案',
        roleType: 'solution_expert',
        triggerType: 'message',
        delaySeconds: 120,
        messageTemplate: '根據您的業務規模和需求，我們為您設計了專屬方案...',
        aiPrompt: '提供真正定制化的方案，體現專業性'
      },
      {
        id: 'stage_3',
        name: '戰略合作',
        roleType: 'founder_ceo',
        triggerType: 'manual',
        messageTemplate: '您好，我是{公司}創始人。您是我們非常重視的合作夥伴，我親自來和您談這次合作...',
        aiPrompt: '以創始人身份建立深度連接'
      }
    ],
    tips: [
      'VIP服務要體現差異化和尊貴感',
      '方案要真正定制，不能是模板套用',
      '創始人出場要有特殊理由'
    ]
  },

  // 場景5: 社群活躍引導
  {
    id: 'scenario_community_activation',
    type: 'community_activation',
    name: '社群活躍引導',
    description: '通過多角色配合，持續保持社群活躍度，引導有價值的討論',
    roles: [
      { roleType: 'community_manager', order: 1, isRequired: true, purpose: '發起話題，維護秩序' },
      { roleType: 'friendly_member', order: 2, isRequired: true, purpose: '活躍氣氛，積極互動' },
      { roleType: 'friendly_member', order: 3, isRequired: false, purpose: '持續互動' },
      { roleType: 'opinion_leader', order: 4, isRequired: false, purpose: '價值總結，觀點輸出' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '話題發起',
        roleType: 'community_manager',
        triggerType: 'time',
        messageTemplate: '早安各位！今天來聊聊{話題}，大家有什麼經驗分享嗎？',
        aiPrompt: '發起有討論價值的話題'
      },
      {
        id: 'stage_2',
        name: '積極響應',
        roleType: 'friendly_member',
        triggerType: 'time',
        delaySeconds: 60,
        messageTemplate: '這個話題好！我來說說我的經驗...',
        aiPrompt: '積極響應，分享個人經驗'
      },
      {
        id: 'stage_3',
        name: '持續互動',
        roleType: 'friendly_member',
        triggerType: 'time',
        delaySeconds: 120,
        messageTemplate: '樓上說得對！我補充一點...',
        aiPrompt: '認同並補充，引發更多討論'
      },
      {
        id: 'stage_4',
        name: '價值總結',
        roleType: 'opinion_leader',
        triggerType: 'time',
        delaySeconds: 300,
        messageTemplate: '看了大家的討論，我總結一下重點...',
        aiPrompt: '總結討論價值，給出專業觀點'
      }
    ],
    tips: [
      '話題要有討論價值，避免過於營銷',
      '多個群友配合要自然，避免刷屏',
      '定期變換話題和互動形式'
    ]
  },

  // 場景6: 產品發布推廣
  {
    id: 'scenario_product_launch',
    type: 'product_launch',
    name: '產品發布推廣',
    description: '新產品發布的完整推廣流程，從預熱到引爆',
    roles: [
      { roleType: 'brand_ambassador', order: 1, isRequired: true, purpose: '預熱造勢' },
      { roleType: 'tech_blogger', order: 2, isRequired: true, purpose: '專業測評' },
      { roleType: 'event_operator', order: 3, isRequired: true, purpose: '活動引爆' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '預熱造勢',
        roleType: 'brand_ambassador',
        triggerType: 'time',
        messageTemplate: '有個大消息要告訴大家！{產品名}即將發布，據說有很多驚喜...',
        aiPrompt: '製造懸念和期待感'
      },
      {
        id: 'stage_2',
        name: '專業測評',
        roleType: 'tech_blogger',
        triggerType: 'time',
        delaySeconds: 86400, // 1天後
        messageTemplate: '我提前拿到了{產品名}的測試版，來跟大家分享一下...',
        aiPrompt: '專業客觀的測評，突出亮點'
      },
      {
        id: 'stage_3',
        name: '活動引爆',
        roleType: 'event_operator',
        triggerType: 'time',
        delaySeconds: 172800, // 2天後
        messageTemplate: '🎉 {產品名}正式發布！限時優惠來了！',
        aiPrompt: '營造搶購氛圍，引導下單'
      }
    ],
    tips: [
      '預熱期要保持神秘感',
      '測評要專業可信',
      '發布活動要有緊迫感'
    ]
  },

  // 場景7: 教育課程銷售
  {
    id: 'scenario_education_sales',
    type: 'education_sales',
    name: '教育課程銷售',
    description: '通過需求分析和學員見證，促進課程報名',
    roles: [
      { roleType: 'education_consultant', order: 1, isRequired: true, purpose: '需求分析，課程推薦' },
      { roleType: 'trainer', order: 2, isRequired: false, purpose: '課程介紹，專業背書' },
      { roleType: 'loyal_customer', order: 3, isRequired: true, purpose: '學員見證' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '需求分析',
        roleType: 'education_consultant',
        triggerType: 'message',
        messageTemplate: '您好！請問您想學習的主要目標是什麼？我來幫您規劃學習路徑~',
        aiPrompt: '了解學習目標和現狀，推薦合適課程'
      },
      {
        id: 'stage_2',
        name: '課程介紹',
        roleType: 'trainer',
        triggerType: 'time',
        delaySeconds: 120,
        messageTemplate: '我是這門課的講師，來給大家介紹一下課程內容...',
        aiPrompt: '專業介紹課程亮點和學習收益'
      },
      {
        id: 'stage_3',
        name: '學員見證',
        roleType: 'loyal_customer',
        triggerType: 'time',
        delaySeconds: 180,
        messageTemplate: '我是之前學過這門課的學員，分享一下我的學習經歷...',
        aiPrompt: '真實分享學習經歷和收穫'
      }
    ],
    tips: [
      '先了解需求再推課程',
      '講師背書增加可信度',
      '學員見證要真實具體'
    ]
  },

  // 場景8: B2B企業合作
  {
    id: 'scenario_b2b_cooperation',
    type: 'b2b_cooperation',
    name: 'B2B企業合作',
    description: '專業的B2B商務合作流程',
    roles: [
      { roleType: 'business_manager', order: 1, isRequired: true, purpose: '合作邀約' },
      { roleType: 'solution_architect', order: 2, isRequired: true, purpose: '方案設計' },
      { roleType: 'project_manager', order: 3, isRequired: false, purpose: '項目推進' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '合作邀約',
        roleType: 'business_manager',
        triggerType: 'manual',
        messageTemplate: '您好，我是{公司}招商經理。了解到貴公司在{領域}有很好的資源，想探討一下合作機會...',
        aiPrompt: '專業的商務邀約，表達合作誠意'
      },
      {
        id: 'stage_2',
        name: '方案設計',
        roleType: 'solution_architect',
        triggerType: 'message',
        messageTemplate: '根據貴公司的情況，我們設計了這樣的合作方案...',
        aiPrompt: '設計互利共贏的合作方案'
      },
      {
        id: 'stage_3',
        name: '項目推進',
        roleType: 'project_manager',
        triggerType: 'message',
        messageTemplate: '合作方案確認後，我會負責項目的推進和落地...',
        aiPrompt: '明確項目計劃和責任分工'
      }
    ],
    tips: [
      'B2B合作要專業正式',
      '方案要體現互利共贏',
      '項目推進要有明確計劃'
    ]
  },

  // 場景9: 競品用戶轉化
  {
    id: 'scenario_competitor_conversion',
    type: 'competitor_conversion',
    name: '競品用戶轉化',
    description: '通過痛點共鳴和優勢對比，吸引競品用戶轉化',
    roles: [
      { roleType: 'competitor_analyst', order: 1, isRequired: true, purpose: '痛點共鳴，優勢對比' },
      { roleType: 'product_engineer', order: 2, isRequired: false, purpose: '技術優勢講解' },
      { roleType: 'sales_manager', order: 3, isRequired: true, purpose: '遷移優惠' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '痛點共鳴',
        roleType: 'competitor_analyst',
        triggerType: 'message',
        messageTemplate: '了解到您之前用過{競品}，是遇到了什麼問題嗎？',
        aiPrompt: '了解競品使用痛點，表達理解'
      },
      {
        id: 'stage_2',
        name: '優勢對比',
        roleType: 'product_engineer',
        triggerType: 'time',
        delaySeconds: 120,
        messageTemplate: '從技術角度來說，我們的產品在這些方面有優勢...',
        aiPrompt: '客觀對比技術優勢，不貶低競品'
      },
      {
        id: 'stage_3',
        name: '遷移優惠',
        roleType: 'sales_manager',
        triggerType: 'message',
        messageTemplate: '為了幫助您順利遷移，我們提供專屬優惠和遷移支持...',
        aiPrompt: '提供遷移激勵，降低遷移成本'
      }
    ],
    tips: [
      '不要貶低競品，客觀對比',
      '重點解決競品的痛點',
      '提供遷移支持降低門檻'
    ]
  },

  // 場景10: 流失客戶挽回
  {
    id: 'scenario_churn_recovery',
    type: 'churn_recovery',
    name: '流失客戶挽回',
    description: '通過關懷回訪和問題解決，挽回流失客戶',
    roles: [
      { roleType: 'callback_agent', order: 1, isRequired: true, purpose: '關懷回訪' },
      { roleType: 'customer_success', order: 2, isRequired: true, purpose: '問題解決' },
      { roleType: 'regional_director', order: 3, isRequired: false, purpose: '特別挽留' }
    ],
    stages: [
      {
        id: 'stage_1',
        name: '關懷回訪',
        roleType: 'callback_agent',
        triggerType: 'manual',
        messageTemplate: '{客戶名}您好！好久沒聯繫了，想關心一下您最近的情況...',
        aiPrompt: '真誠關懷，了解離開原因'
      },
      {
        id: 'stage_2',
        name: '問題解決',
        roleType: 'customer_success',
        triggerType: 'message',
        messageTemplate: '感謝您的反饋！針對您提到的問題，我們已經...',
        aiPrompt: '針對性解決問題，展示改進'
      },
      {
        id: 'stage_3',
        name: '特別挽留',
        roleType: 'regional_director',
        triggerType: 'manual',
        messageTemplate: '作為區域總監，我非常重視您的反饋。為表誠意，我們準備了...',
        aiPrompt: '高層出面，提供特別優惠'
      }
    ],
    tips: [
      '先關心再談回來',
      '認真對待離開原因',
      '提供有誠意的挽留方案'
    ]
  }
];

// 根據場景類型獲取模板
export function getScenarioByType(type: ScenarioType): PresetScenario | undefined {
  return PRESET_SCENARIOS.find(s => s.type === type);
}

// 獲取場景元數據
export function getScenarioMeta(type: ScenarioType) {
  return SCENARIO_META[type];
}
