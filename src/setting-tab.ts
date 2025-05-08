import { App, PluginSettingTab, Setting } from "obsidian";

import Plugin_Deepseek_AI_Assistant from "./main";
import SettingTabTemplate from "./components/SettingTabTemplate.vue";

export class MyPluginSettingTab extends PluginSettingTab {
    plugin: Plugin_Deepseek_AI_Assistant;
    constructor(app: App, plugin: Plugin_Deepseek_AI_Assistant) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        // createApp(SettingTabTemplate,{  // 将 SampleSettingTabPage 组件作为vue应用的根组件
        //     plugin: this.plugin,   // 将 plugin 实例传递给 Vue 组件
        // }).mount(containerEl);

        containerEl.createEl('h2', {text: 'AI Assistant Settings'});

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('请输入你的 API Key. API Key的获取地址:https://platform.deepseek.com 本插件目前只集成了DeepSeek模型')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.API_KEY)
                .onChange(async (value) => {
                    this.plugin.settings.API_KEY = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('API URL')
            .setDesc('API 服务器地址. 不需要修改')
            .addText(text => text
                .setPlaceholder('https://api.openai.com/v1')
                .setValue(this.plugin.settings.API_URL)
                .onChange(async (value) => {
                    this.plugin.settings.API_URL = value;
                    await this.plugin.saveSettings();
                }));
    }
}
