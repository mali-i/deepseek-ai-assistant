import { Plugin, WorkspaceLeaf, Notice } from "obsidian";
import { MyPluginSettingTab } from "./setting-tab";
import {SettingsInterfaceType, DEFAULT_SETTINGS} from './settings'  // 导入设置接口类型
import { MyItemView } from "./my-itemview";

export default class MyPlugin extends Plugin {
    // private vueApp: ReturnType<typeof createApp> | null = null; // 创建vue应用实例

    settings:SettingsInterfaceType = DEFAULT_SETTINGS;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MyPluginSettingTab(this.app, this));
        this.registerView("my-view", (leaf) => new MyItemView(leaf, this));
        this.addRibbonIcon("bot", "AI Assistant", () => {
            this.activateView();
        });
        
    }
    onunload() {
    }

    async loadSettings(){
        this.settings = Object.assign({},DEFAULT_SETTINGS,await this.loadData());
    }

    async saveSettings(){
        await this.saveData(this.settings);
        
    }
    async activateView(){
        const {workspace} = this.app;
        let leaf:WorkspaceLeaf|null = workspace.getLeavesOfType("my-view")[0];
        if (!leaf){
            leaf = workspace.getRightLeaf(false);
            // let leaf = workspace.getLeaf('split', 'vertical');
            if (leaf){
                await leaf.setViewState({
                    type: "my-view",
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
