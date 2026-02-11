import { Plugin, WorkspaceLeaf, Notice, ObsidianProtocolData } from "obsidian";
import "./tailwind.css";
import { DeepSeekAIAssistant_SettingTab } from "./setting-tab";
import { SettingsInterfaceType, DEFAULT_SETTINGS, Conversation } from "./settings";
import { DeepSeekAIAssistant_ItemView } from "./my-itemview";

export default class Plugin_Deepseek_AI_Assistant extends Plugin {
    // private vueApp: ReturnType<typeof createApp> | null = null; // 创建vue应用实例

    settings:SettingsInterfaceType = DEFAULT_SETTINGS;
    private hasConversationsFieldInRawData = false;

    async onload() {
        await this.loadSettings();
        await this.migrateDataIfNeeded();
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
        const loadedSettings = await this.loadData();
        this.hasConversationsFieldInRawData = !!loadedSettings && Object.prototype.hasOwnProperty.call(loadedSettings, "conversations");
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
    }

    async saveSettings(){
        await this.saveData(this.settings);
        
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

    private generateTitle(prompt: string): string {
        const singleLine = (prompt || "").replace(/[\r\n]+/g, " ").trim();
        if (!singleLine) {
            return "New chat";
        }
        return singleLine.length > 40 ? `${singleLine.slice(0, 40)}...` : singleLine;
    }

    async migrateDataIfNeeded() {
        const hasLegacyData = !!this.settings.promptStats && Object.keys(this.settings.promptStats).length > 0;
        const hasNewData = Array.isArray(this.settings.conversations) && this.settings.conversations.length > 0;

        if (this.hasConversationsFieldInRawData || !hasLegacyData || hasNewData) {
            return;
        }

        this.settings.conversations = [];
        this.settings.currentConversationId = null;

        for (const date in this.settings.promptStats) {
            const dateData = this.settings.promptStats[date];
            if (!dateData?.prompt_content?.length) {
                continue;
            }

            for (const oldPrompt of dateData.prompt_content) {
                const timestamp = Number(oldPrompt.id_timestamp) || Date.now();
                const newConversation: Conversation = {
                    id: oldPrompt.id_timestamp || `${timestamp}`,
                    title: this.generateTitle(oldPrompt.prompt),
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    model: this.settings.DEFAULT_MODEL || "deepseek-reasoner",
                    messages: [
                        {
                            id: `${oldPrompt.id_timestamp}_user`,
                            timestamp,
                            role: "user",
                            content: oldPrompt.prompt
                        },
                        {
                            id: `${oldPrompt.id_timestamp}_assistant`,
                            timestamp: timestamp + 1,
                            role: "assistant",
                            content: oldPrompt.answer
                        }
                    ],
                    messageCount: 2
                };
                this.settings.conversations.push(newConversation);
            }
        }

        this.settings.conversations.sort((a, b) => b.updatedAt - a.updatedAt);

        if (this.settings.conversations.length > 0) {
            this.settings.currentConversationId = this.settings.conversations[0].id;
        }

        await this.saveSettings();
    }
}
