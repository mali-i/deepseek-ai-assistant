import {ref, computed} from 'vue'
import {defineStore} from 'pinia'
import {usePluginStore} from './plugin'


export const usePromptStore = defineStore('prompts',()=>{
    const pluginStore = usePluginStore()

    const promptStats = ref()
    const selectedDate = ref(new Date().toISOString().split('T')[0])
    const historyCard = ref<any>(null)

    // 初始化时从插件设置里加载数据
    if (pluginStore.plugin) {
        promptStats.value = { ...pluginStore.plugin.settings.promptStats };
    }
   
    async function addPrompt(prompt: string, answer:string, modelName?: string){
        if(!pluginStore.plugin) return;
            // 获取当前日期作为键
        const today = new Date().toISOString().split('T')[0];

        // 深拷贝当前状态避免直接修改
        const newStats = { ...promptStats.value };
        
        if (!newStats[today]) {
            newStats[today] = { num: 0, prompt_content: [] };
        }
        
        // 更新数据
        newStats[today].num += 1;
        newStats[today].prompt_content.push({
            id_timestamp: Date.now().toString(),
            prompt,
            answer,
            model: modelName
        });

        // 更新响应式数据
        promptStats.value = newStats;
        
        // 同步到插件设置
        pluginStore.plugin.settings.promptStats = newStats;
        await pluginStore.plugin.saveSettings();
    }

    function updateHistoryCard(item: any){
        historyCard.value = item
        // console.log('item被点击')
    }

    function findAndSelectPromptById(id: string) {
        if (!promptStats.value) return;
        
        for (const date in promptStats.value) {
            const dayStats = promptStats.value[date];
            if (dayStats && dayStats.prompt_content) {
                const found = dayStats.prompt_content.find((p: any) => p.id_timestamp === id);
                if (found) {
                    updateHistoryCard(found);
                    return found;
                }
            }
        }
        return null;
    }

    return {promptStats, addPrompt, selectedDate, updateHistoryCard, historyCard, findAndSelectPromptById}
})