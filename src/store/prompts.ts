import {ref} from 'vue'
import {defineStore} from 'pinia'
import {usePluginStore} from './plugin'
import type { Conversation, FollowUpDraft } from '../settings'


export const usePromptStore = defineStore('prompts',()=>{
    const pluginStore = usePluginStore()

    const promptStats = ref<Record<string, any>>({})
    const followUpDrafts = ref<FollowUpDraft[]>([])
    const selectedDate = ref(new Date().toISOString().split('T')[0])
    const historyCard = ref<Conversation | null>(null)

    // 初始化时从插件设置里加载数据
    if (pluginStore.plugin) {
        promptStats.value = { ...pluginStore.plugin.settings.promptStats };
        followUpDrafts.value = [ ...(pluginStore.plugin.settings.followUpDrafts || []) ];
    }

    async function syncSettings(newStats = promptStats.value, newDrafts = followUpDrafts.value) {
        if (!pluginStore.plugin) return;

        pluginStore.plugin.settings.promptStats = newStats;
        pluginStore.plugin.settings.followUpDrafts = newDrafts;
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
        await syncSettings(newStats, followUpDrafts.value);
        return newPrompt;
    }

    async function addFollowUpDraft(draftQuestion: string, sourceConversationId: string, sourceSelection: string) {
        if (!pluginStore.plugin) return null;

        const draft: FollowUpDraft = {
            id: `draft-${Date.now()}`,
            draft_question: draftQuestion,
            source_conversation_id: sourceConversationId,
            source_selection: sourceSelection,
            created_at: new Date().toISOString(),
        };

        const newDrafts = [...followUpDrafts.value, draft];
        followUpDrafts.value = newDrafts;
        await syncSettings(promptStats.value, newDrafts);
        return draft;
    }

    async function removeFollowUpDraft(id: string) {
        if (!pluginStore.plugin) return;

        const newDrafts = followUpDrafts.value.filter((item) => item.id !== id);
        followUpDrafts.value = newDrafts;
        await syncSettings(promptStats.value, newDrafts);
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
        followUpDrafts,
        addPrompt,
        addFollowUpDraft,
        removeFollowUpDraft,
        selectedDate,
        updateHistoryCard,
        historyCard,
        findPromptById,
        findAndSelectPromptById
    }
})