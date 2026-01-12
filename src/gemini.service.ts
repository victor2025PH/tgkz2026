import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { CapturedLead } from './models';

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
  
  constructor() {
    // Try to get API key from environment variable first
    const envApiKey = process?.env?.API_KEY;
    if (envApiKey) {
      this.setApiKey(envApiKey);
    } else {
      // Try to get from localStorage
      const savedKey = localStorage.getItem('ai_api_key');
      if (savedKey) {
        this.setApiKey(savedKey);
      } else {
        console.warn('Gemini API Key not found. AI features will be disabled until configured.');
      }
    }
  }

  setApiKey(apiKey: string) {
    if (!apiKey) return;
    this.apiKey = apiKey;
    this.genAI = new GoogleGenAI({ apiKey });
    // Save to localStorage for persistence
    localStorage.setItem('ai_api_key', apiKey);
    console.log('[GeminiService] API key configured successfully');
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
