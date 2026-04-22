import {ref} from 'vue'
import {defineStore} from 'pinia'
import {usePluginStore} from './plugin'
import type { Conversation, FollowUpConversation } from '../settings'


export const usePromptStore = defineStore('prompts',()=>{
    const pluginStore = usePluginStore()

    const promptStats = ref<Record<string, any>>({})
    const followUpConversations = ref<FollowUpConversation[]>([])
    const selectedDate = ref(new Date().toISOString().split('T')[0])
    const historyCard = ref<Conversation | null>(null)

    // 初始化时从插件设置里加载数据
    if (pluginStore.plugin) {
        promptStats.value = { ...pluginStore.plugin.settings.promptStats };
        followUpConversations.value = [ ...(pluginStore.plugin.settings.followUpConversations || []) ];
    }

    async function syncSettings(newStats = promptStats.value, newFollowUpConversations = followUpConversations.value) {
        if (!pluginStore.plugin) return;

        pluginStore.plugin.settings.promptStats = newStats;
        pluginStore.plugin.settings.followUpConversations = newFollowUpConversations;
        await pluginStore.plugin.saveSettings();
    }
   
    async function addPrompt(
        prompt: string,
        answer:string,
        modelName?: string,
        contextRefs?: string[],
        sourceConversationId?: string
    ){
        if(!pluginStore.plugin) return null;
            // 获取当前日期作为键
        const today = new Date().toISOString().split('T')[0];

        // 深拷贝当前状态避免直接修改
        const newStats = { ...promptStats.value };
        
        if (!newStats[today]) {
            newStats[today] = { num: 0, prompt_content: [] };
        }

        const newPrompt: Conversation = {
            id_timestamp: Date.now().toString(),
            prompt,
            answer,
            model: modelName,
            ...(sourceConversationId ? { source_conversation_id: sourceConversationId } : {}),
            ...(contextRefs && contextRefs.length > 0 ? { context_refs: contextRefs } : {})
        };
        
        // 更新数据
        newStats[today].num += 1;
        newStats[today].prompt_content.push(newPrompt);

        // 更新响应式数据
        promptStats.value = newStats;
        
        // 同步到插件设置
        await syncSettings(newStats, followUpConversations.value);
        return newPrompt;
    }

    async function addFollowUpConversation(question: string, sourceConversationId: string, sourceSelection: string) {
        if (!pluginStore.plugin) return null;

        const followUpConversation: FollowUpConversation = {
            id: Date.now().toString(),
            question,
            source_conversation_id: sourceConversationId,
            source_selection: sourceSelection,
            created_at: new Date().toISOString(),
        };

        const newFollowUpConversations = [...followUpConversations.value, followUpConversation];
        followUpConversations.value = newFollowUpConversations;
        await syncSettings(promptStats.value, newFollowUpConversations);
        return followUpConversation;
    }

    async function removeFollowUpConversation(id: string) {
        if (!pluginStore.plugin) return;

        const newFollowUpConversations = followUpConversations.value.filter((item) => item.id !== id);
        followUpConversations.value = newFollowUpConversations;
        await syncSettings(promptStats.value, newFollowUpConversations);
    }

    function updateHistoryCard(item: Conversation | null){
        historyCard.value = item
        // console.log('item被点击')
    }

    function findPromptById(id: string) {
        if (!promptStats.value) return null;
        
        for (const date in promptStats.value) {
            const dayStats = promptStats.value[date];
            if (dayStats && dayStats.prompt_content) {
                const found = dayStats.prompt_content.find((p: Conversation) => p.id_timestamp === id);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    function findAndSelectPromptById(id: string) {
        const found = findPromptById(id);
        if (found) {
            updateHistoryCard(found);
        }
        return found;
    }

    return {
        promptStats,
        followUpConversations,
        addPrompt,
        addFollowUpConversation,
        removeFollowUpConversation,
        selectedDate,
        updateHistoryCard,
        historyCard,
        findPromptById,
        findAndSelectPromptById
    }
})