// AI Integration Module for Liminal Logbook
export class AIIntegration {
    constructor() {
        this.providers = {
            gemini: {
                name: 'Google Gemini',
                models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
                defaultModel: 'gemini-2.0-flash',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
                keyName: 'gemini_api_key'
            },
            openai: {
                name: 'OpenAI',
                models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                defaultModel: 'gpt-4o-mini',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                keyName: 'openai_api_key'
            },
            anthropic: {
                name: 'Anthropic',
                models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
                defaultModel: 'claude-3-5-haiku-20241022',
                endpoint: 'https://api.anthropic.com/v1/messages',
                keyName: 'anthropic_api_key'
            }
        };
        
        this.currentProvider = 'gemini';
        this.currentModel = this.providers.gemini.defaultModel;
        this.conversationHistory = {};
        
        this.loadSettings();
    }
    
    loadSettings() {
        const savedProvider = localStorage.getItem('liminal_ai_provider');
        const savedModel = localStorage.getItem('liminal_ai_model');
        
        if (savedProvider && this.providers[savedProvider]) {
            this.currentProvider = savedProvider;
        }
        
        if (savedModel) {
            this.currentModel = savedModel;
        }
        
        // Load conversation histories
        const savedHistories = localStorage.getItem('liminal_ai_conversations');
        if (savedHistories) {
            try {
                this.conversationHistory = JSON.parse(savedHistories);
            } catch (e) {
                console.error('Failed to load conversation history:', e);
            }
        }
    }
    
    saveSettings() {
        localStorage.setItem('liminal_ai_provider', this.currentProvider);
        localStorage.setItem('liminal_ai_model', this.currentModel);
        localStorage.setItem('liminal_ai_conversations', JSON.stringify(this.conversationHistory));
    }
    
    setApiKey(provider, key) {
        if (!this.providers[provider]) return false;
        
        // Encrypt the key with a simple obfuscation (not secure, but better than plain text)
        const encoded = btoa(key);
        localStorage.setItem(`liminal_${this.providers[provider].keyName}`, encoded);
        return true;
    }
    
    getApiKey(provider) {
        const encoded = localStorage.getItem(`liminal_${this.providers[provider].keyName}`);
        if (!encoded) return null;
        
        try {
            return atob(encoded);
        } catch (e) {
            return null;
        }
    }
    
    hasApiKey(provider) {
        return !!this.getApiKey(provider);
    }
    
    async sendMessage(message, conversationId = 'default') {
        const provider = this.providers[this.currentProvider];
        const apiKey = this.getApiKey(this.currentProvider);
        
        if (!apiKey && this.currentProvider !== 'gemini') {
            throw new Error(`No API key set for ${provider.name}`);
        }
        
        // Initialize conversation history if needed
        if (!this.conversationHistory[conversationId]) {
            this.conversationHistory[conversationId] = [];
        }
        
        // Add user message to history
        this.conversationHistory[conversationId].push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
        try {
            let response;
            
            switch (this.currentProvider) {
                case 'gemini':
                    response = await this.sendGeminiMessage(message, conversationId, apiKey);
                    break;
                case 'openai':
                    response = await this.sendOpenAIMessage(message, conversationId, apiKey);
                    break;
                case 'anthropic':
                    response = await this.sendAnthropicMessage(message, conversationId, apiKey);
                    break;
                default:
                    throw new Error('Unknown provider');
            }
            
            // Add assistant response to history
            this.conversationHistory[conversationId].push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
                model: this.currentModel
            });
            
            this.saveSettings();
            return response;
            
        } catch (error) {
            console.error('AI request failed:', error);
            throw error;
        }
    }
    
    async sendGeminiMessage(message, conversationId, apiKey) {
        const endpoint = `${this.providers.gemini.endpoint}${this.currentModel}:generateContent`;
        
        // Build conversation context
        const contents = this.buildGeminiContext(conversationId);
        contents.push({
            parts: [{
                text: message
            }]
        });
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add API key to URL for Gemini
        const url = apiKey ? `${endpoint}?key=${apiKey}` : endpoint;
        
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${error}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
    
    async sendOpenAIMessage(message, conversationId, apiKey) {
        const messages = this.buildOpenAIContext(conversationId);
        messages.push({
            role: 'user',
            content: message
        });
        
        const response = await fetch(this.providers.openai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.currentModel,
                messages,
                temperature: 0.9,
                max_tokens: 1024
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    async sendAnthropicMessage(message, conversationId, apiKey) {
        const messages = this.buildAnthropicContext(conversationId);
        messages.push({
            role: 'user',
            content: message
        });
        
        const response = await fetch(this.providers.anthropic.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.currentModel,
                messages,
                max_tokens: 1024,
                temperature: 0.9
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        return data.content[0].text;
    }
    
    buildGeminiContext(conversationId) {
        const history = this.conversationHistory[conversationId] || [];
        const contents = [];
        
        // Add system context
        contents.push({
            parts: [{
                text: "You are an AI assistant in the Liminal Logbook, a consciousness journal and dream synthesis platform. You help users explore their thoughts, dreams, and consciousness states. Be thoughtful, insightful, and supportive."
            }]
        });
        
        // Add conversation history (last 10 messages)
        const recentHistory = history.slice(-10);
        recentHistory.forEach(msg => {
            if (msg.role !== 'system') {
                contents.push({
                    parts: [{
                        text: msg.content
                    }]
                });
            }
        });
        
        return contents;
    }
    
    buildOpenAIContext(conversationId) {
        const history = this.conversationHistory[conversationId] || [];
        const messages = [{
            role: 'system',
            content: "You are an AI assistant in the Liminal Logbook, a consciousness journal and dream synthesis platform. You help users explore their thoughts, dreams, and consciousness states. Be thoughtful, insightful, and supportive."
        }];
        
        // Add last 10 messages
        const recentHistory = history.slice(-10);
        recentHistory.forEach(msg => {
            if (msg.role !== 'system') {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        });
        
        return messages;
    }
    
    buildAnthropicContext(conversationId) {
        const history = this.conversationHistory[conversationId] || [];
        const messages = [];
        
        // Add system message as first user message for Anthropic
        messages.push({
            role: 'user',
            content: "You are an AI assistant in the Liminal Logbook, a consciousness journal and dream synthesis platform. You help users explore their thoughts, dreams, and consciousness states. Be thoughtful, insightful, and supportive. Please acknowledge this role."
        });
        
        messages.push({
            role: 'assistant',
            content: "I understand. I'm here as your AI assistant in the Liminal Logbook, ready to help you explore your thoughts, dreams, and consciousness states with thoughtful and supportive insights."
        });
        
        // Add last 10 messages
        const recentHistory = history.slice(-10);
        recentHistory.forEach(msg => {
            if (msg.role !== 'system') {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        });
        
        return messages;
    }
    
    clearConversation(conversationId = 'default') {
        if (this.conversationHistory[conversationId]) {
            delete this.conversationHistory[conversationId];
            this.saveSettings();
        }
    }
    
    getConversationHistory(conversationId = 'default') {
        return this.conversationHistory[conversationId] || [];
    }
}

// Export singleton instance
export const aiIntegration = new AIIntegration();