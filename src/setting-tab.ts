import { App, PluginSettingTab, Setting } from "obsidian";

import Plugin_Deepseek_AI_Assistant from "./main";
// import SettingTabTemplate from "./components/SettingTabTemplate.vue";

export class DeepSeekAIAssistant_SettingTab extends PluginSettingTab {
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


        new Setting(containerEl)
            .setName('API key')
            .setDesc('Get your API key from https://platform.deepseek.com')
            .addText(text => text
                .setValue(this.plugin.settings.API_KEY)
                .onChange(async (value) => {
                    this.plugin.settings.API_KEY = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('API URL')
            .setDesc('The default API server address does not require modification.')
            .addText(text => text
                .setPlaceholder('https://api.openai.com/v1')
                .setValue(this.plugin.settings.API_URL)
                .onChange(async (value) => {
                    this.plugin.settings.API_URL = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("System prompt")
            .setDesc("Used as the system role content for every chat request.")
            .addTextArea((text) =>
                text
                    .setPlaceholder("You are an AI assistant...")
                    .setValue(this.plugin.settings.SYSTEM_PROMPT)
                    .onChange(async (value) => {
                        this.plugin.settings.SYSTEM_PROMPT = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Default model")
            .setDesc("Model used when starting a new conversation.")
            .addText((text) =>
                text
                    .setPlaceholder("deepseek-reasoner")
                    .setValue(this.plugin.settings.DEFAULT_MODEL)
                    .onChange(async (value) => {
                        const next = value.trim();
                        if (!next) {
                            return;
                        }
                        this.plugin.settings.DEFAULT_MODEL = next;
                        if (!this.plugin.settings.MODEL_OPTIONS.includes(next)) {
                            this.plugin.settings.MODEL_OPTIONS = [next, ...this.plugin.settings.MODEL_OPTIONS];
                        }
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Model options")
            .setDesc("Comma or newline separated model names shown in selector.")
            .addTextArea((text) =>
                text
                    .setPlaceholder("deepseek-reasoner, deepseek-chat")
                    .setValue((this.plugin.settings.MODEL_OPTIONS || []).join(", "))
                    .onChange(async (value) => {
                        const models = parseModelOptions(value);
                        if (models.length === 0) {
                            return;
                        }
                        this.plugin.settings.MODEL_OPTIONS = models;
                        if (!models.includes(this.plugin.settings.DEFAULT_MODEL)) {
                            this.plugin.settings.DEFAULT_MODEL = models[0];
                        }
                        await this.plugin.saveSettings();
                    })
            );
    }
}
        const parseModelOptions = (value: string): string[] => {
            return value
                .split(/[,\n]/)
                .map((item) => item.trim())
                .filter((item, index, array) => !!item && array.indexOf(item) === index);
        };
