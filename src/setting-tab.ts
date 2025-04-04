import { App, PluginSettingTab } from "obsidian";
import { createApp } from "vue";
import SamplePlugin from "./main";
import SampleSettingTabPage from "./SettingTabPage.vue";


export class SampleSettingTab extends PluginSettingTab {
    plugin: SamplePlugin;
    constructor(app: App, plugin: SamplePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        createApp(SampleSettingTabPage).mount(containerEl);
    }
}
