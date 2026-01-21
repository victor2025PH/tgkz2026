import { Injectable, inject } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { CapturedLead } from './models';
import { ElectronIpcService } from './electron-ipc.service';

// In a real Applet environment, this would be provided.
declare const process: {
  env: {
    API_KEY: string;
  }
};


@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private apiKey: string = '';
  private ipc = inject(ElectronIpcService);
  private isInitialized = false;
  
  constructor() {
    // 優先從後端數據庫加載 API Key
    this.loadApiKeyFromBackend();
  }
  
  /**
   * 從後端數據庫加載 API Key
   */
  private loadApiKeyFromBackend(): void {
    // 首先嘗試從 localStorage 快速加載（作為緩存）
    const cachedKey = localStorage.getItem('ai_api_key');
    if (cachedKey) {
      this.setApiKeyInternal(cachedKey);
    }
    
    // 然後從後端獲取最新的配置
    this.ipc.on('ai-settings-loaded', (data: any) => {
      if (data?.geminiApiKey) {
        this.setApiKeyInternal(data.geminiApiKey);
        // 同步到 localStorage 作為緩存
        localStorage.setItem('ai_api_key', data.geminiApiKey);
        console.log('[GeminiService] API key loaded from backend');
      }
    });
    
    // 請求加載 AI 設置
    this.ipc.send('get-ai-settings', {});
    
    // 如果沒有找到任何 key，顯示警告
    setTimeout(() => {
      if (!this.isConfigured()) {
        console.warn('Gemini API Key not found. AI features will be disabled until configured.');
      }
    }, 2000);
  }
  
  /**
   * 內部設置 API Key（不保存到後端）
   */
  private setApiKeyInternal(apiKey: string): void {
    if (!apiKey) return;
    this.apiKey = apiKey;
    this.genAI = new GoogleGenAI({ apiKey });
    this.isInitialized = true;
  }

  /**
   * 設置 API Key 並保存到後端數據庫
   */
  setApiKey(apiKey: string) {
    if (!apiKey) return;
    this.setApiKeyInternal(apiKey);
    
    // 保存到 localStorage 作為緩存
    localStorage.setItem('ai_api_key', apiKey);
    
    // 保存到後端數據庫進行持久化
    this.ipc.send('save-ai-settings', { geminiApiKey: apiKey });
    console.log('[GeminiService] API key configured and saved to backend');
  }

  isConfigured(): boolean {
    return this.genAI !== null && this.apiKey.length > 0;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  async generateOutreachMessage(lead: CapturedLead, basePrompt: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API is not initialized. Please ensure the API_KEY environment variable is set.');
    }

    const model = 'gemini-2.5-flash';
    
    // FIX: Use systemInstruction for persona and context, which is a Gemini API best practice.
    const systemInstruction = `You are an expert marketing assistant for a tool called TG-AI智控王. You write friendly, professional, and short direct messages (DMs). Do not use markdown formatting. Just return the plain text of the message.`;
    
    const userPrompt = `
      A user was found in the Telegram group "${lead.sourceGroup}" because they mentioned the keyword "${lead.triggeredKeyword}".
      Their username is @${lead.username}.

      Based on the following instruction, write a direct message to this user.

      Instruction: "${basePrompt}"
    `;

    try {
      const response = await this.genAI.models.generateContent({
          model: model,
          contents: userPrompt,
          config: {
            systemInstruction: systemInstruction
          }
      });
      return response.text;
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      throw new Error('Failed to generate message. Check console for details.');
    }
  }
}
