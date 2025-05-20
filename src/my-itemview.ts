import { getIcon, ItemView, WorkspaceLeaf } from "obsidian";
import Plugin_Deepseek_AI_Assistant from "./main";
import { createApp } from "vue";
import MainTemplate from "./components/MainTemplate.vue";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'  // 添加样式
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createPinia} from 'pinia'
import { usePluginStore } from "./store/plugin";

export class MyItemView extends ItemView{
    plugin: Plugin_Deepseek_AI_Assistant;
    constructor(leaf: WorkspaceLeaf, plugin: Plugin_Deepseek_AI_Assistant) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType(): string {
        return "deepseek-ai-assistant-itemview"
    }
    getDisplayText(): string {
        return "AI Assistant"
    }
    getIcon():string {
        return "bot"
    }
    async onOpen(){
        const { containerEl } = this;
        containerEl.empty();

        const vueApp = createApp(MainTemplate, {
            plugin: this.plugin
        })
        vueApp.use(ElementPlus);
        // 注册element-ui所有图标
        for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
            vueApp.component(key, component);
        }
        // 注册pinia
        const pinia = createPinia()
        vueApp.use(pinia)  
        
        const pluginStore = usePluginStore(pinia)  
        pluginStore.setPlugin(this.plugin)

        vueApp.mount(containerEl);
        
    }
}