<template>
    <div class="flex flex-col h-full p-2 max-w-[900px] mx-auto w-full">
        <div class="flex-none px-2 pb-2">
            <div class="text-xs text-[var(--text-muted)] truncate flex items-center gap-2">
                <span class="truncate">{{ currentConversation?.title || "New conversation" }}</span>
                <span class="px-2 py-0.5 rounded bg-[var(--background-modifier-form-field)] text-[10px]">
                    {{ chatModel }}
                </span>
            </div>
        </div>

        <div class="flex-1 overflow-hidden relative rounded-xl bg-transparent mb-4 group/answer">
            <div
                v-if="displayMessages.length === 0 && !isLoading"
                class="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50 pointer-events-none"
            >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-4 overflow-visible">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="text-sm font-medium">Start a conversation</span>
            </div>

            <div v-if="isThinking" class="absolute inset-0 z-10">
                <ThinkingClue />
            </div>

            <div
                ref="messageListRef"
                class="absolute inset-0 overflow-y-auto p-4 space-y-3"
            >
                <div
                    v-for="message in displayMessages"
                    :key="message.id"
                    class="rounded-xl border px-4 py-3"
                    :class="message.role === 'user'
                        ? 'bg-[var(--background-primary)] border-[var(--apple-border)]'
                        : 'bg-[var(--background-secondary)] border-[var(--background-modifier-border)]'"
                >
                    <div class="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-2">
                        {{ message.role === "user" ? "You" : "Assistant" }}
                    </div>
                    <div
                        :ref="(el) => setMessageRef(message.id, el as HTMLElement | null)"
                        class="message-content prose dark:prose-invert max-w-none text-[var(--text-normal)] leading-relaxed"
                    ></div>
                </div>
            </div>
        </div>

        <div class="flex-none">
            <div class="w-full flex flex-col gap-3">
                <div class="relative w-full bg-[var(--background-primary)] rounded-xl shadow-sm border border-[var(--apple-border)] transition-all duration-300 focus-within:ring-2 focus-within:ring-apple-blue/20 focus-within:border-apple-blue hover:shadow-md">
                    <textarea
                        ref="textareaRef"
                        class="w-full p-4 pb-14 border-none rounded-xl resize-none text-[15px] leading-relaxed bg-transparent text-[var(--text-normal)] min-h-[120px] max-h-[250px] overflow-y-auto font-sans outline-none placeholder:text-[var(--text-muted)]"
                        v-model="inputContent"
                        placeholder="Ask anything..."
                        @input="adjustHeight"
                    ></textarea>

                    <div class="absolute bottom-3 right-3 left-3 flex justify-between items-center">
                        <div class="relative group">
                            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[var(--apple-border)]">
                                <select
                                    v-model="chatModel"
                                    class="appearance-none bg-transparent border-none text-[12px] font-medium text-[var(--text-normal)] cursor-pointer pr-4 focus:outline-none font-sans"
                                >
                                    <option
                                        v-for="model in availableModels"
                                        :key="model"
                                        :value="model"
                                    >
                                        {{ model }}
                                    </option>
                                </select>
                                <div class="absolute right-2.5 pointer-events-none text-[var(--text-muted)]">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <button
                            class="h-8 px-4 bg-apple-blue text-white border-none rounded-full cursor-pointer text-[13px] font-semibold transition-all duration-200 flex items-center justify-center shadow-sm hover:bg-blue-600 hover:shadow-md active:scale-95 disabled:bg-[var(--background-modifier-border)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
                            @click="submit"
                            :disabled="isLoading || !inputContent.trim()"
                        >
                            <span v-if="!isLoading" class="flex items-center gap-1">
                                Send
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </span>
                            <span v-else class="flex items-center gap-2">
                                <svg class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Thinking
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { OpenAI } from "openai";
import { MarkdownRenderer } from "obsidian";
import { usePromptStore } from "../store/prompts";
import ThinkingClue from "./ThinkingClue.vue";

const props = defineProps<{
    plugin: any;
}>();

const inputContent = ref("");
const isLoading = ref(false);
const isThinking = ref(false);
const chatModel = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const messageListRef = ref<HTMLElement | null>(null);
const streamingAssistantText = ref("");

const promptStore = usePromptStore();
const messageRefs = new Map<string, HTMLElement>();

const currentConversation = computed(() => promptStore.currentConversation);
const currentMessages = computed(() => promptStore.currentMessages);
const availableModels = computed<string[]>(() => {
    const configured = props.plugin.settings.MODEL_OPTIONS;
    if (Array.isArray(configured) && configured.length > 0) {
        return configured;
    }
    return ["deepseek-reasoner", "deepseek-chat"];
});
const systemPrompt = computed(() => {
    const prompt = props.plugin.settings.SYSTEM_PROMPT?.trim();
    return prompt || "你是一个AI助手，请根据用户的问题给出回答";
});

const displayMessages = computed(() => {
    const messages = [...currentMessages.value];
    if (streamingAssistantText.value) {
        messages.push({
            id: "__streaming_assistant__",
            timestamp: Date.now(),
            role: "assistant",
            content: streamingAssistantText.value
        });
    }
    return messages;
});

const adjustHeight = () => {
    const textarea = textareaRef.value;
    if (!textarea) {
        return;
    }
    window.requestAnimationFrame(() => {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    });
};

const setMessageRef = (id: string, element: HTMLElement | null) => {
    if (!element) {
        messageRefs.delete(id);
        return;
    }
    messageRefs.set(id, element);
};

const renderMessages = async () => {
    const view = props.plugin.app.workspace.getLeavesOfType("deepseek-ai-assistant-itemview")[0]?.view;

    for (const message of displayMessages.value) {
        const container = messageRefs.get(message.id);
        if (!container) {
            continue;
        }
        container.empty();
        await MarkdownRenderer.render(
            props.plugin.app,
            message.content || "",
            container,
            "/",
            view
        );
    }
};

const scrollToBottom = () => {
    const container = messageListRef.value;
    if (!container) {
        return;
    }
    container.scrollTop = container.scrollHeight;
};

watch(inputContent, async () => {
    await nextTick();
    adjustHeight();
});

watch(
    availableModels,
    (models) => {
        const defaultModel = props.plugin.settings.DEFAULT_MODEL;
        if (chatModel.value && models.includes(chatModel.value)) {
            return;
        }
        if (defaultModel && models.includes(defaultModel)) {
            chatModel.value = defaultModel;
            return;
        }
        chatModel.value = models[0];
    },
    { immediate: true }
);

watch(
    currentConversation,
    (conversation) => {
        if (!conversation?.model) {
            return;
        }
        if (availableModels.value.includes(conversation.model)) {
            chatModel.value = conversation.model;
        }
    },
    { immediate: true }
);

watch(chatModel, async (value) => {
    if (!value) {
        return;
    }
    if (props.plugin.settings.DEFAULT_MODEL === value) {
        return;
    }
    props.plugin.settings.DEFAULT_MODEL = value;
    const options = Array.isArray(props.plugin.settings.MODEL_OPTIONS)
        ? props.plugin.settings.MODEL_OPTIONS
        : [];
    if (!options.includes(value)) {
        props.plugin.settings.MODEL_OPTIONS = [value, ...options];
    }
    await props.plugin.saveSettings();
});

watch(
    displayMessages,
    async () => {
        await nextTick();
        await renderMessages();
        scrollToBottom();
    },
    { deep: true, immediate: true }
);

const submit = async () => {
    const content = inputContent.value.trim();
    if (!content || isLoading.value) {
        return;
    }

    isLoading.value = true;
    isThinking.value = true;
    streamingAssistantText.value = "";

    try {
        const openai = new OpenAI({
            apiKey: props.plugin.settings.API_KEY,
            baseURL: props.plugin.settings.API_URL,
            dangerouslyAllowBrowser: true
        });

        await promptStore.addUserMessage(content, chatModel.value);
        inputContent.value = "";

        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: systemPrompt.value }
        ];

        const recentMessages = [...promptStore.currentMessages].slice(-20);
        for (const message of recentMessages) {
            messages.push({
                role: message.role === "user" ? "user" : "assistant",
                content: message.content
            });
        }

        const completion = await openai.chat.completions.create({
            messages,
            model: chatModel.value,
            stream: true
        });

        let fullResponse = "";

        for await (const chunk of completion) {
            const chunkContent = chunk.choices[0]?.delta?.content || "";
            if (!chunkContent) {
                continue;
            }
            if (isThinking.value) {
                isThinking.value = false;
            }
            fullResponse += chunkContent;
            streamingAssistantText.value = fullResponse;
        }

        if (fullResponse.trim()) {
            await promptStore.addAssistantMessage(fullResponse);
        }
        streamingAssistantText.value = "";
    } catch (error: any) {
        isThinking.value = false;
        streamingAssistantText.value = error?.message || "Request failed.";
    } finally {
        isLoading.value = false;
        isThinking.value = false;
    }
};
</script>

<style scoped>
.message-content :deep(*) {
    user-select: text;
    -webkit-user-select: text;
}
</style>
