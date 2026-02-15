import { Plugin, WorkspaceLeaf, Notice, ObsidianProtocolData } from "obsidian";
import "./tailwind.css";
import { DeepSeekAIAssistant_SettingTab } from "./setting-tab";
import {SettingsInterfaceType, DEFAULT_SETTINGS} from './settings'  // 导入设置接口类型
import { DeepSeekAIAssistant_ItemView } from "./my-itemview";

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
        this.settings = Object.assign({},DEFAULT_SETTINGS,await this.loadData());
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
}
