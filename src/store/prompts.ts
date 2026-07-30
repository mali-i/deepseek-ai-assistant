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

    const normalizeText = (text?: string) => text?.replace(/\s+/g, ' ').trim() || '';

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

    const findPromptLocationById = (id: string) => {
        if (!promptStats.value) return null;

        for (const date in promptStats.value) {
            const dayStats = promptStats.value[date];
            if (!dayStats?.prompt_content) {
                continue;
            }

            const found = dayStats.prompt_content.find((item: Conversation) => item.id_timestamp === id);
            if (found) {
                return { date, item: found };
            }
        }

        return null;
    };

    const findPromptLocationBySourceSelection = (sourceSelection: string, preferredId?: string) => {
        const normalizedSelection = normalizeText(sourceSelection);
        if (!normalizedSelection) {
            const preferred = preferredId ? findPromptLocationById(preferredId) : null;
            return preferred ? { ...preferred, matchedSelection: false } : null;
        }

        const preferred = preferredId ? findPromptLocationById(preferredId) : null;
        if (preferred && normalizeText(preferred.item.answer).includes(normalizedSelection)) {
            return { ...preferred, matchedSelection: true };
        }

        for (const date in promptStats.value) {
            const dayStats = promptStats.value[date];
            if (!dayStats?.prompt_content) {
                continue;
            }

            const found = dayStats.prompt_content.find((item: Conversation) => {
                return normalizeText(item.answer).includes(normalizedSelection);
            });

            if (found) {
                return { date, item: found, matchedSelection: true };
            }
        }

        return preferred ? { ...preferred, matchedSelection: false } : null;
    };

    const updatePromptSourceConversationId = async (targetId: string, sourceConversationId: string) => {
        const target = findPromptLocationById(targetId);
        if (!target || target.item.source_conversation_id === sourceConversationId) {
            return;
        }

        const newStats = { ...promptStats.value };
        const dayStats = newStats[target.date];
        if (!dayStats?.prompt_content) {
            return;
        }

        newStats[target.date] = {
            ...dayStats,
            prompt_content: dayStats.prompt_content.map((item: Conversation) => {
                if (item.id_timestamp !== targetId) {
                    return item;
                }

                return {
                    ...item,
                    source_conversation_id: sourceConversationId,
                };
            }),
        };

        promptStats.value = newStats;
        await syncSettings(newStats);
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

    const cleanupContextSourceConversationIds = async () => {
        if (!pluginStore.plugin) {
            return;
        }

        let hasChanges = false;
        const newStats = { ...promptStats.value };

        Object.keys(newStats).forEach((date) => {
            const dayStats = newStats[date];
            if (!dayStats?.prompt_content) {
                return;
            }

            let dayChanged = false;
            const promptContent = dayStats.prompt_content.map((item: Conversation) => {
                let nextItem = item;

                if (item.source_conversation_id && !item.source_selection) {
                    hasChanges = true;
                    dayChanged = true;
                    const { source_conversation_id, ...rest } = nextItem;
                    nextItem = rest;
                }

                return nextItem;
            });

            if (dayChanged) {
                newStats[date] = {
                    ...dayStats,
                    prompt_content: promptContent,
                };
            }
        });

        if (!hasChanges) {
            return;
        }

        promptStats.value = newStats;
        await syncSettings(newStats);
    };

    const initializePromptStats = async () => {
        await migrateLegacyFollowUps();
        await cleanupContextSourceConversationIds();
    };

    // 初始化时从插件设置里加载数据
    if (pluginStore.plugin) {
        promptStats.value = { ...pluginStore.plugin.settings.promptStats };
        void initializePromptStats();
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

    async function deletePrompt(id: string) {
        const found = findPromptLocationById(id);
        if (!found) {
            return false;
        }

        const newStats = { ...promptStats.value };
        const dayStats = newStats[found.date];
        const promptContent = dayStats.prompt_content.filter(
            (item: Conversation) => item.id_timestamp !== id
        );

        if (promptContent.length === 0) {
            delete newStats[found.date];
        } else {
            newStats[found.date] = {
                ...dayStats,
                num: promptContent.length,
                prompt_content: promptContent,
            };
        }

        promptStats.value = newStats;
        if (historyCard.value?.id_timestamp === id) {
            updateHistoryCard(null);
        }
        await syncSettings(newStats);
        return true;
    }

    function updateHistoryCard(item: Conversation | null){
        historyCard.value = item
        // console.log('item被点击')
    }

    function findPromptById(id: string) {
        return findPromptLocationById(id)?.item || null;
    }

    function findAndSelectPromptById(id: string) {
        const found = findPromptLocationById(id);
        if (found) {
            selectedDate.value = found.date;
            updateHistoryCard(found.item);
        }
        return found?.item || null;
    }

    async function findAndSelectPromptBySourceSelection(sourceSelection: string, sourceConversationId?: string, targetId?: string) {
        const found = findPromptLocationBySourceSelection(sourceSelection, sourceConversationId);
        if (found) {
            if (targetId && found.matchedSelection && found.item.id_timestamp !== sourceConversationId) {
                await updatePromptSourceConversationId(targetId, found.item.id_timestamp);
            }
            selectedDate.value = found.date;
            updateHistoryCard(found.item);
        }
        return found?.item || null;
    }

    return {
        promptStats,
        addPrompt,
        deletePrompt,
        selectedDate,
        updateHistoryCard,
        historyCard,
        findPromptById,
        findAndSelectPromptById,
        findAndSelectPromptBySourceSelection
    }
})
