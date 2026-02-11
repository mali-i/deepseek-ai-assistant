import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { usePluginStore } from "./plugin";
import type { Conversation, ConversationMessage, DataStructure } from "../settings";

function getDateKey(timestamp: number): string {
    return new Date(timestamp).toISOString().split("T")[0];
}

function generateTitle(content: string): string {
    const singleLine = (content || "").replace(/[\r\n]+/g, " ").trim();
    if (!singleLine) {
        return "New chat";
    }
    return singleLine.length > 40 ? `${singleLine.slice(0, 40)}...` : singleLine;
}

function createId(suffix: "user" | "assistant"): string {
    return `${Date.now()}_${suffix}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneConversation(conversation: Conversation): Conversation {
    return {
        ...conversation,
        messages: (conversation.messages || []).map((message) => ({ ...message }))
    };
}

export const usePromptStore = defineStore("prompts", () => {
    const pluginStore = usePluginStore();

    const conversations = ref<Conversation[]>([]);
    const currentConversationId = ref<string | null>(null);

    // 兼容旧版组件（HeatMap/DataPanel 等）
    const selectedDate = ref(new Date().toISOString().split("T")[0]);
    const historyCard = ref<any>(null);

    function getDefaultModel() {
        return pluginStore.plugin?.settings.DEFAULT_MODEL || "deepseek-reasoner";
    }

    if (pluginStore.plugin) {
        const pluginConversations = pluginStore.plugin.settings.conversations || [];
        conversations.value = pluginConversations.map((conversation) => cloneConversation(conversation));
        currentConversationId.value = pluginStore.plugin.settings.currentConversationId;
    }

    const currentConversation = computed<Conversation | null>(() => {
        if (!currentConversationId.value) {
            return null;
        }
        return conversations.value.find((conversation) => conversation.id === currentConversationId.value) || null;
    });

    const currentMessages = computed<ConversationMessage[]>(() => {
        return currentConversation.value?.messages || [];
    });

    // 兼容旧数据面板：从 conversations 聚合出按日期统计
    const promptStats = computed<DataStructure>(() => {
        const stats: DataStructure = {};

        for (const conversation of conversations.value) {
            const messages = conversation.messages || [];
            for (let index = 0; index < messages.length; index += 1) {
                const message = messages[index];
                if (message.role !== "user") {
                    continue;
                }

                const dateKey = getDateKey(message.timestamp);
                if (!stats[dateKey]) {
                    stats[dateKey] = { num: 0, prompt_content: [] };
                }

                const assistant = messages.slice(index + 1).find((item) => item.role === "assistant");
                stats[dateKey].prompt_content.push({
                    id_timestamp: `${message.timestamp}`,
                    prompt: message.content,
                    answer: assistant?.content || ""
                });
                stats[dateKey].num = stats[dateKey].prompt_content.length;
            }
        }

        return stats;
    });

    async function persistConversationState() {
        if (!pluginStore.plugin) {
            return;
        }
        pluginStore.plugin.settings.conversations = conversations.value.map((conversation) => cloneConversation(conversation));
        pluginStore.plugin.settings.currentConversationId = currentConversationId.value;
        await pluginStore.plugin.saveSettings();
    }

    function moveToTopLocal(id: string) {
        const index = conversations.value.findIndex((conversation) => conversation.id === id);
        if (index <= 0) {
            return;
        }
        const [target] = conversations.value.splice(index, 1);
        conversations.value.unshift(target);
    }

    async function createNewConversation(firstPrompt?: string, model?: string) {
        const targetModel = model || getDefaultModel();
        const now = Date.now();
        const id = `${now}`;
        const messages: ConversationMessage[] = [];

        if (firstPrompt && firstPrompt.trim()) {
            messages.push({
                id: createId("user"),
                timestamp: now,
                role: "user",
                content: firstPrompt,
                model: targetModel
            });
        }

        const conversation: Conversation = {
            id,
            title: firstPrompt?.trim() ? generateTitle(firstPrompt) : "New chat",
            createdAt: now,
            updatedAt: now,
            messages,
            model: targetModel,
            messageCount: messages.length
        };

        conversations.value.unshift(conversation);
        currentConversationId.value = conversation.id;
        await persistConversationState();
        return conversation;
    }

    async function addUserMessage(prompt: string, model?: string) {
        const targetModel = model || getDefaultModel();
        const content = prompt.trim();
        if (!content) {
            return null;
        }

        let conversation = currentConversation.value;
        if (!conversation) {
            conversation = await createNewConversation(content, targetModel);
            return conversation;
        }

        const now = Date.now();
        conversation.messages.push({
            id: createId("user"),
            timestamp: now,
            role: "user",
            content,
            model: targetModel
        });
        conversation.updatedAt = now;
        conversation.model = targetModel;
        conversation.messageCount = conversation.messages.length;

        if (!conversation.title || conversation.title === "New chat") {
            conversation.title = generateTitle(content);
        }

        moveToTopLocal(conversation.id);
        await persistConversationState();
        return conversation;
    }

    async function addAssistantMessage(content: string) {
        const conversation = currentConversation.value;
        if (!conversation || !content.trim()) {
            return;
        }

        const now = Date.now();
        conversation.messages.push({
            id: createId("assistant"),
            timestamp: now,
            role: "assistant",
            content
        });
        conversation.updatedAt = now;
        conversation.messageCount = conversation.messages.length;

        moveToTopLocal(conversation.id);
        await persistConversationState();
    }

    async function selectConversation(id: string) {
        const found = conversations.value.find((conversation) => conversation.id === id);
        if (!found) {
            return;
        }
        currentConversationId.value = id;
        await persistConversationState();
    }

    async function updateConversationTitle(id: string, title: string) {
        const found = conversations.value.find((conversation) => conversation.id === id);
        if (!found) {
            return;
        }
        const nextTitle = title.trim();
        found.title = nextTitle || "New chat";
        found.updatedAt = Date.now();
        moveToTopLocal(id);
        await persistConversationState();
    }

    async function deleteConversation(id: string) {
        const index = conversations.value.findIndex((conversation) => conversation.id === id);
        if (index < 0) {
            return;
        }
        conversations.value.splice(index, 1);

        if (currentConversationId.value === id) {
            currentConversationId.value = conversations.value[0]?.id || null;
        }

        await persistConversationState();
    }

    async function moveToTop(id: string) {
        moveToTopLocal(id);
        await persistConversationState();
    }

    function updateHistoryCard(item: any) {
        historyCard.value = item;
    }

    function findAndSelectPromptById(id: string) {
        if (!id) {
            return null;
        }

        const exactConversation = conversations.value.find((conversation) => conversation.id === id);
        if (exactConversation) {
            currentConversationId.value = exactConversation.id;
            void persistConversationState();
            return exactConversation;
        }

        for (const conversation of conversations.value) {
            const foundMessage = conversation.messages.find((message) => {
                if (message.id === id) {
                    return true;
                }
                // 兼容旧版 id_timestamp（迁移后会话 id 与旧 id 一致）
                return `${message.timestamp}` === id;
            });
            if (foundMessage) {
                currentConversationId.value = conversation.id;
                void persistConversationState();
                return foundMessage;
            }
        }

        return null;
    }

    return {
        conversations,
        currentConversationId,
        currentConversation,
        currentMessages,
        selectedDate,
        historyCard,
        promptStats,
        addUserMessage,
        addAssistantMessage,
        createNewConversation,
        selectConversation,
        updateConversationTitle,
        deleteConversation,
        moveToTop,
        updateHistoryCard,
        findAndSelectPromptById
    };
});
