import {ref} from 'vue'
import {defineStore} from 'pinia'
import {usePluginStore} from './plugin'
import type { Conversation } from '../settings'

interface LegacyFollowUpConversation {
    id: string;
    question: string;
    source_conversation_id: string;
    source_selection: string;
    created_at: string;
    response_conversation_id?: string;
}

export const usePromptStore = defineStore('prompts',()=>{
    const pluginStore = usePluginStore()

    const promptStats = ref<Record<string, any>>({})
    const selectedDate = ref(new Date().toISOString().split('T')[0])
    const historyCard = ref<Conversation | null>(null)

    const findPromptByIdInStats = (stats: Record<string, any>, id: string) => {
        for (const date in stats) {
            const dayStats = stats[date];
            if (!dayStats?.prompt_content) {
                continue;
            }

            const found = dayStats.prompt_content.find((item: Conversation) => item.id_timestamp === id);
            if (found) {
                return found;
            }
        }

        return null;
    };

    const migrateLegacyFollowUps = async () => {
        if (!pluginStore.plugin) {
            return;
        }

        const legacyFollowUps = ((pluginStore.plugin.settings as any).followUpConversations || []) as LegacyFollowUpConversation[];
        if (!legacyFollowUps.length) {
            return;
        }

        const newStats = { ...promptStats.value };

        legacyFollowUps.forEach((item) => {
            const responseConversation = item.response_conversation_id
                ? findPromptByIdInStats(newStats, item.response_conversation_id)
                : null;

            if (responseConversation) {
                if (!responseConversation.source_selection) {
                    responseConversation.source_selection = item.source_selection;
                }
                if (!responseConversation.source_conversation_id) {
                    responseConversation.source_conversation_id = item.source_conversation_id;
                }
                return;
            }

            const existingDraft = findPromptByIdInStats(newStats, item.id);
            if (existingDraft) {
                return;
            }

            const createdDate = item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
            if (!newStats[createdDate]) {
                newStats[createdDate] = { num: 0, prompt_content: [] };
            }

            newStats[createdDate].prompt_content.push({
                id_timestamp: item.id,
                prompt: item.question,
                answer: '',
                source_conversation_id: item.source_conversation_id,
                source_selection: item.source_selection,
            });
            newStats[createdDate].num += 1;
        });

        promptStats.value = newStats;
        delete (pluginStore.plugin.settings as any).followUpConversations;
        await syncSettings(newStats);
    };

    // 初始化时从插件设置里加载数据
    if (pluginStore.plugin) {
        promptStats.value = { ...pluginStore.plugin.settings.promptStats };
        void migrateLegacyFollowUps();
    }

    async function syncSettings(newStats = promptStats.value) {
        if (!pluginStore.plugin) return;

        pluginStore.plugin.settings.promptStats = newStats;
        delete (pluginStore.plugin.settings as any).followUpConversations;
        await pluginStore.plugin.saveSettings();
    }
   
    async function addPrompt(
        prompt: string,
        answer:string,
        modelName?: string,
        contextRefs?: string[],
        sourceConversationId?: string,
        sourceSelection?: string
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
            ...(sourceSelection ? { source_selection: sourceSelection } : {}),
            ...(contextRefs && contextRefs.length > 0 ? { context_refs: contextRefs } : {})
        };
        
        // 更新数据
        newStats[today].num += 1;
        newStats[today].prompt_content.push(newPrompt);

        // 更新响应式数据
        promptStats.value = newStats;
        
        // 同步到插件设置
        await syncSettings(newStats);
        return newPrompt;
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
        addPrompt,
        selectedDate,
        updateHistoryCard,
        historyCard,
        findPromptById,
        findAndSelectPromptById
    }
})