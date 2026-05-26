import { Plugin, WorkspaceLeaf, Notice, ObsidianProtocolData } from "obsidian";
import "./tailwind.css";
import { DeepSeekAIAssistant_SettingTab } from "./setting-tab";
import {SettingsInterfaceType, DEFAULT_SETTINGS, type Conversation, type DataStructure, type ModelConfig} from './settings'  // 导入设置接口类型
import { DeepSeekAIAssistant_ItemView } from "./my-itemview";

type LegacyMessage = {
    timestamp?: number;
    role?: string;
    content?: string;
    model?: string;
};

type LegacyConversation = {
    id?: string;
    title?: string;
    createdAt?: number;
    updatedAt?: number;
    model?: string;
    messages?: LegacyMessage[];
};

export default class Plugin_Deepseek_AI_Assistant extends Plugin {
    // private vueApp: ReturnType<typeof createApp> | null = null; // 创建vue应用实例

    settings:SettingsInterfaceType = DEFAULT_SETTINGS;
    private settingsListeners: (() => void)[] = [];

    registerSettingsListener(listener: () => void) {
        this.settingsListeners.push(listener);
    }

    unregisterSettingsListener(listener: () => void) {
        this.settingsListeners = this.settingsListeners.filter(l => l !== listener);
    }

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new DeepSeekAIAssistant_SettingTab(this.app, this));
        this.registerView("deepseek-ai-assistant-itemview", (leaf) => new DeepSeekAIAssistant_ItemView(leaf, this));
        this.addRibbonIcon("bot", "Open deepseek AI assistant", () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-deepseek-ai-assistant',
            name: 'Open deepseek AI assistant',
            callback: () => {
                this.activateView();
            }
        });

        this.registerObsidianProtocolHandler("deepseek-ai-assistant", async (params: ObsidianProtocolData) => {
            if (params.action === "deepseek-ai-assistant" && params.id) {
                this.handleOpenChat(params.id);
            }
        });
        
    }
    onunload() {
    }

    async handleOpenChat(id: string) {
        await this.activateView();
        const leaf = this.app.workspace.getLeavesOfType("deepseek-ai-assistant-itemview")[0];
        if (leaf && leaf.view instanceof DeepSeekAIAssistant_ItemView) {
            leaf.view.openChat(id);
        }
    }

    async loadSettings(){
        const loadedData = await this.loadData();
        const { settings, shouldSave } = this.migrateSettings(loadedData);
        this.settings = settings;

        if (shouldSave) {
            await this.saveData(this.settings);
        }
    }

    async saveSettings(){
        await this.saveData(this.settings);
        this.settingsListeners.forEach(l => l());
    }
    async activateView(){
        const {workspace} = this.app;
        let leaf:WorkspaceLeaf|null = workspace.getLeavesOfType("deepseek-ai-assistant-itemview")[0];
        if (!leaf){
            leaf = workspace.getRightLeaf(false);
            // let leaf = workspace.getLeaf('split', 'vertical');
            if (leaf){
                await leaf.setViewState({
                    type: "deepseek-ai-assistant-itemview",
                    active: true,
                });
            }
        }
        if (leaf){
            workspace.revealLeaf(leaf); // 聚焦到视图
        }else{
            new Notice("无法找到视图");
        }
        
    }

    private migrateSettings(loadedData: any): { settings: SettingsInterfaceType; shouldSave: boolean } {
        const loaded = loadedData || {};
        const models = this.migrateModels(loaded);
        const promptStats = this.migratePromptStats(loaded, models);
        const settings: SettingsInterfaceType = { models, promptStats };
        const allowedKeys = new Set(['models', 'promptStats']);
        const hasDeprecatedFields = Object.keys(loaded).some((key) => !allowedKeys.has(key));

        return {
            settings,
            shouldSave: hasDeprecatedFields || Boolean(loaded.promptStatus) || !loaded.promptStats,
        };
    }

    private migrateModels(loaded: any): ModelConfig[] {
        const loadedModels = Array.isArray(loaded.models) ? loaded.models : null;
        const legacyCustomModels = Array.isArray(loaded.customModels) ? loaded.customModels : null;
        const sourceModels = loadedModels?.length
            ? loadedModels
            : legacyCustomModels?.length
                ? legacyCustomModels
                : DEFAULT_SETTINGS.models;
        const legacyApiKey = typeof loaded.API_KEY === 'string' ? loaded.API_KEY : '';
        const legacyApiUrl = typeof loaded.API_URL === 'string' ? loaded.API_URL : '';

        return sourceModels.map((model: any, index: number) => ({
            id: String(model.id || model.uuid || model.name || model.modelId || model.model || `legacy-model-${index}`),
            name: String(model.name || model.modelId || model.model || `Legacy Model ${index + 1}`),
            modelId: String(model.modelId || model.model || model.id || DEFAULT_SETTINGS.models[0].modelId),
            apiKey: model.apiKey || model.api_key || legacyApiKey,
            apiUrl: model.apiUrl || model.api_url || model.baseURL || model.baseUrl || legacyApiUrl || DEFAULT_SETTINGS.models[0].apiUrl,
            providerUrl: model.providerUrl || model.provider_url || '',
        }));
    }

    private migratePromptStats(loaded: any, models: ModelConfig[]): DataStructure {
        const promptStats = this.clonePromptStats(loaded.promptStats || loaded.promptStatus || {});
        const existingIds = new Set<string>();
        const existingContentKeys = new Set<string>();

        Object.values(promptStats).forEach((dayStats: any) => {
            const promptContent = Array.isArray(dayStats?.prompt_content) ? dayStats.prompt_content : [];
            promptContent.forEach((item: Conversation) => {
                if (item.id_timestamp) {
                    existingIds.add(item.id_timestamp);
                }
                existingContentKeys.add(this.buildConversationContentKey(item.prompt, item.answer));
            });
        });

        if (!Array.isArray(loaded.conversations)) {
            return promptStats;
        }

        loaded.conversations.forEach((legacyConversation: LegacyConversation) => {
            const messages = Array.isArray(legacyConversation.messages) ? legacyConversation.messages : [];

            messages.forEach((message, index) => {
                if (message.role !== 'user' || !message.content) {
                    return;
                }

                const assistantMessage = this.findNextAssistantMessage(messages, index + 1);
                const prompt = message.content;
                const answer = assistantMessage?.content || '';
                const contentKey = this.buildConversationContentKey(prompt, answer);
                if (existingContentKeys.has(contentKey)) {
                    return;
                }

                const timestamp = this.normalizeTimestamp(
                    assistantMessage?.timestamp || message.timestamp || legacyConversation.updatedAt || legacyConversation.createdAt
                );
                const idTimestamp = this.createUniqueTimestampId(timestamp, existingIds);
                const dateKey = new Date(timestamp).toISOString().split('T')[0];

                if (!promptStats[dateKey]) {
                    promptStats[dateKey] = { num: 0, prompt_content: [] };
                }

                promptStats[dateKey].prompt_content.push({
                    id_timestamp: idTimestamp,
                    prompt,
                    answer,
                    model: this.resolveModelValue(message.model || legacyConversation.model, models),
                });
                promptStats[dateKey].num = promptStats[dateKey].prompt_content.length;
                existingContentKeys.add(contentKey);
            });
        });

        return promptStats;
    }

    private clonePromptStats(promptStats: any): DataStructure {
        const clonedStats: DataStructure = {};

        Object.keys(promptStats || {}).forEach((date) => {
            const dayStats = promptStats[date];
            const promptContent = Array.isArray(dayStats?.prompt_content) ? dayStats.prompt_content : [];
            clonedStats[date] = {
                num: promptContent.length,
                prompt_content: promptContent.map((item: Conversation) => ({ ...item })),
            };
        });

        return clonedStats;
    }

    private findNextAssistantMessage(messages: LegacyMessage[], startIndex: number): LegacyMessage | null {
        for (let index = startIndex; index < messages.length; index += 1) {
            const message = messages[index];
            if (message.role === 'user') {
                return null;
            }
            if (message.role === 'assistant') {
                return message;
            }
        }

        return null;
    }

    private normalizeTimestamp(timestamp?: number): number {
        if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
            return timestamp > 100000000000 ? timestamp : timestamp * 1000;
        }

        return Date.now();
    }

    private createUniqueTimestampId(timestamp: number, existingIds: Set<string>): string {
        let candidate = timestamp;
        while (existingIds.has(String(candidate))) {
            candidate += 1;
        }

        const id = String(candidate);
        existingIds.add(id);
        return id;
    }

    private buildConversationContentKey(prompt = '', answer = ''): string {
        return `${prompt.replace(/\s+/g, ' ').trim()}\n---\n${answer.replace(/\s+/g, ' ').trim()}`;
    }

    private resolveModelValue(model: string | undefined, models: ModelConfig[]): string | undefined {
        if (!model) {
            return undefined;
        }

        const found = models.find((item) => item.id === model || item.modelId === model || item.name === model);
        return found?.modelId || model;
    }
}
