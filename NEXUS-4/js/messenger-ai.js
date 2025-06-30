// Messenger AI Enhancement Module
import { aiIntegration } from './ai-integration.js';

export class MessengerAI {
    constructor() {
        this.aiContacts = [
            {
                id: 'ai-assistant-gemini',
                name: 'Nexus AI (Gemini)',
                avatarInitial: '✦',
                online: true,
                lastMessage: 'Ready to explore consciousness patterns...',
                timestamp: 'Now',
                isAI: true,
                provider: 'gemini'
            },
            {
                id: 'ai-assistant-openai',
                name: 'Nexus AI (GPT)',
                avatarInitial: '◈',
                online: true,
                lastMessage: 'Analyzing dream sequences...',
                timestamp: 'Now',
                isAI: true,
                provider: 'openai'
            },
            {
                id: 'ai-assistant-anthropic',
                name: 'Nexus AI (Claude)',
                avatarInitial: '◇',
                online: true,
                lastMessage: 'Interpreting liminal states...',
                timestamp: 'Now',
                isAI: true,
                provider: 'anthropic'
            }
        ];
        
        this.isTyping = false;
        this.activeAIConversation = null;
    }
    
    // Inject AI contacts into the contact list
    injectAIContacts(contacts) {
        return [...this.aiContacts, ...contacts];
    }
    
    // Create AI settings modal HTML
    createSettingsModal() {
        return `
        <div id="ai-settings-modal" class="fixed inset-0 z-[1003] bg-black/50 backdrop-blur-sm items-center justify-center p-4 hidden">
            <div class="glass-panel p-6 md:p-8 rounded-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                <h2 class="text-2xl font-light mb-6 text-text-primary">AI Assistant Settings</h2>
                
                <div class="mb-8">
                    <h3 class="text-lg font-light mb-4 text-text-secondary">Default Provider</h3>
                    <div class="flex gap-4 mb-4">
                        <button data-provider="gemini" class="provider-btn active">
                            <span class="text-2xl mb-2">✦</span>
                            <span>Google Gemini</span>
                            <span class="text-xs text-text-quaternary">Free with optional API key</span>
                        </button>
                        <button data-provider="openai" class="provider-btn">
                            <span class="text-2xl mb-2">◈</span>
                            <span>OpenAI GPT</span>
                            <span class="text-xs text-text-quaternary">Requires API key</span>
                        </button>
                        <button data-provider="anthropic" class="provider-btn">
                            <span class="text-2xl mb-2">◇</span>
                            <span>Anthropic Claude</span>
                            <span class="text-xs text-text-quaternary">Requires API key</span>
                        </button>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <!-- Gemini Settings -->
                    <div id="gemini-settings" class="provider-settings">
                        <h3 class="text-lg font-light mb-4 text-text-secondary flex items-center gap-2">
                            <span class="text-2xl">✦</span> Google Gemini Settings
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-text-tertiary mb-2">API Key (Optional)</label>
                                <input type="password" id="gemini-api-key" class="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-text-primary placeholder-text-quaternary focus:outline-none focus:ring-2 focus:ring-current-accent" placeholder="Enter your Gemini API key for better limits">
                                <p class="text-xs text-text-quaternary mt-2">Works without API key but with rate limits. Get key from <a href="https://makersuite.google.com/app/apikey" target="_blank" class="text-current-accent hover:underline">Google AI Studio</a></p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-text-tertiary mb-2">Model</label>
                                <select id="gemini-model" class="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-text-primary focus:outline-none focus:ring-2 focus:ring-current-accent">
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- OpenAI Settings -->
                    <div id="openai-settings" class="provider-settings hidden">
                        <h3 class="text-lg font-light mb-4 text-text-secondary flex items-center gap-2">
                            <span class="text-2xl">◈</span> OpenAI Settings
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-text-tertiary mb-2">API Key (Required)</label>
                                <input type="password" id="openai-api-key" class="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-text-primary placeholder-text-quaternary focus:outline-none focus:ring-2 focus:ring-current-accent" placeholder="sk-...">
                                <p class="text-xs text-text-quaternary mt-2">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" class="text-current-accent hover:underline">OpenAI Platform</a></p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-text-tertiary mb-2">Model</label>
                                <select id="openai-model" class="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-text-primary focus:outline-none focus:ring-2 focus:ring-current-accent">
                                    <option value="gpt-4o-mini">GPT-4o Mini (Cheapest)</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Anthropic Settings -->
                    <div id="anthropic-settings" class="provider-settings hidden">
                        <h3 class="text-lg font-light mb-4 text-text-secondary flex items-center gap-2">
                            <span class="text-2xl">◇</span> Anthropic Settings
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-text-tertiary mb-2">API Key (Required)</label>
                                <input type="password" id="anthropic-api-key" class="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-text-primary placeholder-text-quaternary focus:outline-none focus:ring-2 focus:ring-current-accent" placeholder="sk-ant-...">
                                <p class="text-xs text-text-quaternary mt-2">Get your API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" class="text-current-accent hover:underline">Anthropic Console</a></p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-text-tertiary mb-2">Model</label>
                                <select id="anthropic-model" class="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-text-primary focus:outline-none focus:ring-2 focus:ring-current-accent">
                                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Cheapest)</option>
                                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-8 flex justify-end gap-4">
                    <button id="cancel-ai-settings-btn" class="btn btn-secondary">Cancel</button>
                    <button id="save-ai-settings-btn" class="btn btn-primary">Save Settings</button>
                </div>
                
                <button class="absolute top-4 right-4 text-text-quaternary hover:text-text-primary transition-colors" id="close-ai-settings-btn">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
        
        <style>
        .provider-btn {
            flex: 1;
            padding: 1rem;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(20, 25, 35, 0.4);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
            cursor: pointer;
            text-align: center;
        }
        
        .provider-btn:hover {
            background: rgba(25, 30, 42, 0.6);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .provider-btn.active {
            background: rgba(var(--current-accent-rgb), 0.1);
            border-color: var(--current-accent);
            box-shadow: 0 0 20px rgba(var(--current-accent-rgb), 0.3);
        }
        
        .provider-settings {
            padding: 1.5rem;
            border-radius: 12px;
            background: rgba(20, 25, 35, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        @media (max-width: 768px) {
            .provider-btn {
                padding: 0.75rem;
                font-size: 0.875rem;
            }
            
            .provider-btn span:last-child {
                display: none;
            }
        }
        </style>
        `;
    }
    
    // Create typing indicator for AI
    createTypingIndicator(contact) {
        return `
        <div class="message-entry ai-typing-indicator flex items-center gap-2 p-3 self-start w-full">
            <div class="message-bubble message-received flex items-center gap-1.5 px-3 py-2">
                <div class="typing-dot"></div>
                <div class="typing-dot" style="animation-delay: 0.2s"></div>
                <div class="typing-dot" style="animation-delay: 0.4s"></div>
            </div>
            <span class="text-xs text-text-quaternary">${contact.name} is thinking...</span>
        </div>
        `;
    }
    
    // Initialize AI messenger features
    initialize() {
        // Add settings modal to body
        document.body.insertAdjacentHTML('beforeend', this.createSettingsModal());
        
        // Load saved settings
        this.loadSettings();
        
        // Bind settings modal events
        this.bindSettingsEvents();
        
        // Add settings button to messenger header
        this.addSettingsButton();
    }
    
    loadSettings() {
        const savedProvider = localStorage.getItem('liminal_ai_provider') || 'gemini';
        const savedModel = localStorage.getItem('liminal_ai_model');
        
        // Set active provider button
        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.provider === savedProvider);
        });
        
        // Show correct settings panel
        document.querySelectorAll('.provider-settings').forEach(panel => {
            panel.classList.add('hidden');
        });
        document.getElementById(`${savedProvider}-settings`)?.classList.remove('hidden');
        
        // Load API keys
        ['gemini', 'openai', 'anthropic'].forEach(provider => {
            const key = aiIntegration.getApiKey(provider);
            const input = document.getElementById(`${provider}-api-key`);
            if (input && key) {
                input.value = key;
            }
        });
        
        // Load models
        if (savedModel) {
            const select = document.getElementById(`${savedProvider}-model`);
            if (select) {
                select.value = savedModel;
            }
        }
    }
    
    bindSettingsEvents() {
        // Provider selection
        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const provider = btn.dataset.provider;
                document.querySelectorAll('.provider-settings').forEach(panel => {
                    panel.classList.add('hidden');
                });
                document.getElementById(`${provider}-settings`)?.classList.remove('hidden');
            });
        });
        
        // Save settings
        document.getElementById('save-ai-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Cancel/close
        ['cancel-ai-settings-btn', 'close-ai-settings-btn'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                document.getElementById('ai-settings-modal')?.classList.add('hidden');
            });
        });
        
        // Close on backdrop click
        document.getElementById('ai-settings-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'ai-settings-modal') {
                e.target.classList.add('hidden');
            }
        });
    }
    
    saveSettings() {
        const activeProvider = document.querySelector('.provider-btn.active')?.dataset.provider;
        if (!activeProvider) return;
        
        // Save provider
        aiIntegration.currentProvider = activeProvider;
        localStorage.setItem('liminal_ai_provider', activeProvider);
        
        // Save API key
        const apiKeyInput = document.getElementById(`${activeProvider}-api-key`);
        if (apiKeyInput && apiKeyInput.value) {
            aiIntegration.setApiKey(activeProvider, apiKeyInput.value);
        }
        
        // Save model
        const modelSelect = document.getElementById(`${activeProvider}-model`);
        if (modelSelect) {
            aiIntegration.currentModel = modelSelect.value;
            localStorage.setItem('liminal_ai_model', modelSelect.value);
        }
        
        aiIntegration.saveSettings();
        
        // Close modal
        document.getElementById('ai-settings-modal')?.classList.add('hidden');
        
        // Show success message
        this.showNotification('AI settings saved successfully');
    }
    
    addSettingsButton() {
        // This will be called when messenger is opened
        const messengerHeader = document.querySelector('#messenger-header-container');
        if (!messengerHeader) return;
        
        const settingsBtn = messengerHeader.querySelector('.ai-settings-btn');
        if (!settingsBtn) {
            messengerHeader.insertAdjacentHTML('beforeend', `
                <button class="ai-settings-btn text-text-quaternary hover:text-text-primary interactive-icon ml-auto" title="AI Settings">
                    <i data-lucide="settings" class="w-5 h-5"></i>
                </button>
            `);
            
            messengerHeader.querySelector('.ai-settings-btn')?.addEventListener('click', () => {
                document.getElementById('ai-settings-modal')?.classList.remove('hidden');
                document.getElementById('ai-settings-modal')?.style.display = 'flex';
            });
        }
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 glass-panel p-4 rounded-lg shadow-level-3 z-[1004] animate-fade-in';
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <i data-lucide="check-circle" class="w-5 h-5 text-emerald-400"></i>
                <span class="text-sm text-text-secondary">${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('animate-fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    async handleAIMessage(message, contactId) {
        const contact = this.aiContacts.find(c => c.id === contactId);
        if (!contact) return;
        
        // Update provider if different
        if (aiIntegration.currentProvider !== contact.provider) {
            aiIntegration.currentProvider = contact.provider;
        }
        
        const messageArea = document.getElementById('messenger-message-area');
        if (!messageArea) return;
        
        // Show typing indicator
        messageArea.insertAdjacentHTML('afterbegin', this.createTypingIndicator(contact));
        if (window.lucide) window.lucide.createIcons();
        
        try {
            // Send message to AI
            const response = await aiIntegration.sendMessage(message, contactId);
            
            // Remove typing indicator
            messageArea.querySelector('.ai-typing-indicator')?.remove();
            
            // Add AI response
            const aiMessage = {
                sender: contact.id,
                content: response,
                timestamp: 'Now'
            };
            
            messageArea.insertAdjacentHTML('afterbegin', this.createAIMessageBubble(aiMessage, contact));
            
            // Update last message in contact list
            const contactElement = document.querySelector(`[data-contact-id="${contactId}"]`);
            if (contactElement) {
                const lastMessageEl = contactElement.querySelector('.text-sm.text-text-tertiary');
                if (lastMessageEl) {
                    lastMessageEl.textContent = response.substring(0, 50) + '...';
                }
            }
            
        } catch (error) {
            // Remove typing indicator
            messageArea.querySelector('.ai-typing-indicator')?.remove();
            
            // Show error message
            this.showNotification(`Error: ${error.message}`);
        }
    }
    
    createAIMessageBubble(message, contact) {
        return `
        <div class="message-entry flex flex-col gap-1 w-full items-start">
            <div class="message-bubble message-received">
                ${message.content}
            </div>
            <span class="text-xs text-muted px-2">${contact.name} • ${message.timestamp}</span>
        </div>
        `;
    }
}

// Export singleton instance
export const messengerAI = new MessengerAI();