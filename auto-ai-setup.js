/**
 * TG-Matrix AI 自動設置模塊
 * 負責首次啟動時自動檢測和配置本地 AI 服務
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class AutoAiSetup {
    constructor() {
        this.ollamaEndpoint = 'http://localhost:11434';
        this.configPath = path.join(__dirname, 'default-config', 'ai-config.json');
        this.userConfigPath = '';
        this.isFirstRun = false;
        this.detectedModels = [];
        this.selectedModel = null;
        this.ollamaAvailable = false;
    }

    /**
     * 初始化設置
     */
    async initialize(userDataPath) {
        this.userConfigPath = path.join(userDataPath, 'ai-config.json');
        this.isFirstRun = !fs.existsSync(this.userConfigPath);

        if (this.isFirstRun) {
            console.log('[AutoAiSetup] 首次運行，開始自動配置...');
            await this.runAutoSetup();
        } else {
            console.log('[AutoAiSetup] 載入現有配置...');
            await this.loadExistingConfig();
        }
    }

    /**
     * 運行自動設置
     */
    async runAutoSetup() {
        console.log('[AutoAiSetup] 開始 AI 自動設置...');

        // 1. 檢測 Ollama
        this.ollamaAvailable = await this.checkOllama();
        
        if (this.ollamaAvailable) {
            console.log('[AutoAiSetup] ✓ Ollama 服務可用');
            
            // 2. 獲取可用模型
            this.detectedModels = await this.getOllamaModels();
            console.log(`[AutoAiSetup] 發現 ${this.detectedModels.length} 個模型:`, this.detectedModels);
            
            // 3. 自動選擇最佳模型
            this.selectedModel = this.selectBestModel(this.detectedModels);
            console.log(`[AutoAiSetup] 自動選擇模型: ${this.selectedModel}`);
        } else {
            console.log('[AutoAiSetup] ✗ Ollama 服務不可用，將使用雲端備選');
        }

        // 4. 創建用戶配置
        await this.createUserConfig();
        
        return {
            ollamaAvailable: this.ollamaAvailable,
            models: this.detectedModels,
            selectedModel: this.selectedModel,
            isFirstRun: this.isFirstRun
        };
    }

    /**
     * 檢測 Ollama 服務是否運行
     */
    checkOllama() {
        return new Promise((resolve) => {
            const url = new URL('/api/version', this.ollamaEndpoint);
            
            const req = http.get({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                timeout: 5000
            }, (res) => {
                if (res.statusCode === 200) {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const version = JSON.parse(data);
                            console.log(`[AutoAiSetup] Ollama 版本: ${version.version}`);
                            resolve(true);
                        } catch (e) {
                            resolve(true);
                        }
                    });
                } else {
                    resolve(false);
                }
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    /**
     * 獲取 Ollama 可用模型列表
     */
    getOllamaModels() {
        return new Promise((resolve) => {
            const url = new URL('/api/tags', this.ollamaEndpoint);
            
            const req = http.get({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                timeout: 10000
            }, (res) => {
                if (res.statusCode === 200) {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            const models = (result.models || []).map(m => m.name);
                            resolve(models);
                        } catch (e) {
                            resolve([]);
                        }
                    });
                } else {
                    resolve([]);
                }
            });

            req.on('error', () => resolve([]));
            req.on('timeout', () => {
                req.destroy();
                resolve([]);
            });
        });
    }

    /**
     * 選擇最佳模型
     * 優先順序：qwen2 > qwen > llama3 > llama2 > mistral > 其他
     */
    selectBestModel(models) {
        if (!models || models.length === 0) {
            return 'qwen2:7b';  // 默認推薦
        }

        const priority = [
            'qwen2:7b', 'qwen2:14b', 'qwen2',
            'qwen:7b', 'qwen:14b', 'qwen',
            'llama3:8b', 'llama3:70b', 'llama3',
            'llama2:7b', 'llama2:13b', 'llama2',
            'mistral:7b', 'mistral',
            'gemma:7b', 'gemma:2b', 'gemma'
        ];

        for (const preferred of priority) {
            const found = models.find(m => 
                m === preferred || m.startsWith(preferred.split(':')[0])
            );
            if (found) {
                return found;
            }
        }

        // 返回第一個可用的模型
        return models[0];
    }

    /**
     * 創建用戶配置文件
     */
    async createUserConfig() {
        try {
            // 讀取默認配置
            let defaultConfig = {};
            if (fs.existsSync(this.configPath)) {
                defaultConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }

            // 更新配置
            const userConfig = {
                ...defaultConfig,
                localAi: {
                    ...defaultConfig.localAi,
                    endpoint: this.ollamaEndpoint,
                    model: this.selectedModel || 'qwen2:7b',
                    detectedModels: this.detectedModels,
                    lastDetected: new Date().toISOString()
                },
                _meta: {
                    createdAt: new Date().toISOString(),
                    ollamaAvailable: this.ollamaAvailable,
                    autoConfigured: true
                }
            };

            // 確保目錄存在
            const configDir = path.dirname(this.userConfigPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // 寫入配置
            fs.writeFileSync(this.userConfigPath, JSON.stringify(userConfig, null, 2), 'utf8');
            console.log(`[AutoAiSetup] 配置已保存到: ${this.userConfigPath}`);

            return userConfig;
        } catch (error) {
            console.error('[AutoAiSetup] 創建配置失敗:', error);
            return null;
        }
    }

    /**
     * 載入現有配置
     */
    async loadExistingConfig() {
        try {
            if (fs.existsSync(this.userConfigPath)) {
                const config = JSON.parse(fs.readFileSync(this.userConfigPath, 'utf8'));
                
                // 檢查 Ollama 是否仍可用
                if (config.localAi && config.localAi.autoDetect) {
                    this.ollamaAvailable = await this.checkOllama();
                    if (this.ollamaAvailable) {
                        this.detectedModels = await this.getOllamaModels();
                    }
                }
                
                return config;
            }
        } catch (error) {
            console.error('[AutoAiSetup] 載入配置失敗:', error);
        }
        return null;
    }

    /**
     * 獲取設置狀態
     */
    getStatus() {
        return {
            isFirstRun: this.isFirstRun,
            ollamaAvailable: this.ollamaAvailable,
            detectedModels: this.detectedModels,
            selectedModel: this.selectedModel,
            endpoint: this.ollamaEndpoint
        };
    }

    /**
     * 測試 AI 連接
     */
    async testConnection(endpoint, model) {
        return new Promise((resolve) => {
            const url = new URL('/api/generate', endpoint || this.ollamaEndpoint);
            
            const postData = JSON.stringify({
                model: model || this.selectedModel || 'qwen2:7b',
                prompt: 'Hello',
                stream: false
            });

            const req = http.request({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 30000
            }, (res) => {
                if (res.statusCode === 200) {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            resolve({
                                success: true,
                                response: result.response,
                                model: result.model
                            });
                        } catch (e) {
                            resolve({ success: false, error: 'Invalid response' });
                        }
                    });
                } else {
                    resolve({ success: false, error: `HTTP ${res.statusCode}` });
                }
            });

            req.on('error', (e) => resolve({ success: false, error: e.message }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Timeout' });
            });

            req.write(postData);
            req.end();
        });
    }
}

module.exports = AutoAiSetup;
