<template>
    <div class="flex flex-col h-full p-2 pb-4 max-w-[900px] mx-auto w-full">
        <!-- Answer Area -->
        <div class="flex-1 overflow-hidden relative rounded-xl bg-transparent mb-6 group/answer">
            <div v-if="!historyAnswer && !isLoading && !hasResponse" class="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50 pointer-events-none">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-4 overflow-visible">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="text-sm font-medium">Start a conversation</span>
            </div>
            <div v-if="isThinking" class="absolute inset-0 z-10">
                <ThinkingClue />
            </div>
            <div ref="answerContainerRef" class="answer-field absolute inset-0 overflow-y-auto p-6 font-sans leading-relaxed select-text cursor-text prose dark:prose-invert max-w-none"></div>
            <FollowUpQuestionCard
                :selection-action="selectionAction"
                :is-follow-up-composer-open="isFollowUpComposerOpen"
                :follow-up-question-text="followUpQuestionText"
                :follow-up-references="followUpSelectedReferences"
                :today-prompt-items="todayPromptItems"
                :available-models="availableModels"
                :selected-model-id="chatModel"
                :overlay-target="overlayTarget"
                @open="openFollowUpComposer"
                @close="closeFollowUpComposer"
                @send="sendFollowUpQuestionNow"
                @update:follow-up-question-text="followUpQuestionText = $event"
                @update:follow-up-references="followUpSelectedReferences = $event"
                @update:selected-model-id="chatModel = $event"
            />
        </div>

        <!-- Input Area -->
        <div class="flex-none">
            <div class="w-full flex flex-col gap-3">
                <!-- 外层输入容器边框（会把已选标签和 textarea 一起框进去） -->
                <div class="relative w-full rounded-xl bg-transparent transition-all duration-300">
                    <!-- 已选历史上下文标签 -->
                    <div v-if="selectedReferences.length" class="flex flex-wrap gap-2 px-4 pt-4 pb-1">
                        <!-- 单条历史对话 已选标签 -->
                        <button
                            v-for="item in selectedReferences"
                            :key="item.id_timestamp"
                            class="max-w-full inline-flex items-center gap-2 border border-[var(--apple-border)] bg-[var(--background-primary)] px-3 py-1 text-xs text-[var(--text-normal)] transition-colors hover:border-apple-blue"
                            @click="removeReference(item.id_timestamp)"
                            type="button"
                            :title="item.prompt"
                        >
                            <span class="truncate max-w-[280px]">@ {{ buildPromptPreview(item.prompt) }}</span>
                            <span class="text-[var(--text-muted)]">×</span>
                        </button>
                    </div>

                    <textarea 
                        ref="textareaRef"
                        class="w-full p-4 pb-14 border-none rounded-xl resize-none text-[15px] leading-relaxed bg-[var(--background-primary)] text-[var(--text-normal)] min-h-[120px] max-h-[250px] overflow-y-auto font-sans outline-none placeholder:text-[12px] placeholder:text-[var(--text-muted)]" 
                        v-model="inputContent" 
                        placeholder="Use @ to reference past conversations from today as context for this session."
                        @input="adjustHeight"
                        @click="handleCaretChange"
                        @keyup="handleCaretChange"
                        @keydown="handleMentionKeydown"
                        @scroll="handleCaretChange"
                    ></textarea>

                    <!-- 历史上下文弹层 -->
                    <div
                        v-if="showMentionMenu"
                        class="absolute z-20 overflow-hidden rounded-xl border border-[var(--apple-border)] bg-[var(--background-primary)] shadow-xl"
                        :style="mentionMenuStyle"
                    >
                        <div class="border-b border-[var(--apple-border)] px-3 py-2 text-xs text-[var(--text-muted)]">
                            Today conversations
                        </div>
                        <div class="mention-menu-scroll max-h-64 overflow-y-auto overflow-x-auto py-1">
                            <button
                                v-for="(item, index) in filteredTodayPrompts"
                                :key="item.id_timestamp"
                                type="button"
                                class="flex w-full min-w-0 flex-col items-start gap-1 px-3 py-2 text-left transition-colors"
                                :class="index === activeMentionIndex ? 'bg-[var(--background-modifier-hover)]' : 'hover:bg-[var(--background-modifier-hover)]'"
                                @mousedown.prevent="selectMention(item)"
                            >
                                <div class="flex w-full min-w-0 flex-col items-start gap-1 text-left">
                                    <span class="block w-full break-words text-sm text-[var(--text-normal)]">{{ buildPromptPreview(item.prompt, 80) }}</span>
                                </div>
                                <div class="w-full break-words text-left text-xs text-[var(--text-muted)] line-clamp-2">{{ item.answer }}</div>
                            </button>
                            <div v-if="!filteredTodayPrompts.length" class="px-3 py-3 text-left text-sm text-[var(--text-muted)] break-words">
                                {{ emptyMentionText }}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Controls Bar -->
                     <!-- 目前使用了绝对定位 -->
                    <div class="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between rounded-md border border-[var(--background-modifier-border)]/35 bg-[var(--background-primary)]/88 px-2 py-1 backdrop-blur-[2px]">
                        <!-- Model Selector -->
                        <div class="relative group">
                            <div class="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[var(--text-muted)] transition-colors cursor-pointer hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)]">
                                <select 
                                    v-model="chatModel" 
                                    class="appearance-none bg-transparent border-none shadow-none ring-0 outline-none text-[11px] font-medium text-[var(--text-normal)] cursor-pointer pr-3 focus:border-none focus:shadow-none focus:ring-0 focus:outline-none font-sans"
                                >
                                    <option v-for="model in availableModels" :key="model.id" :value="model.id">
                                        {{ model.name }}
                                    </option>
                                </select>
                                <div class="absolute right-0 pointer-events-none text-[var(--text-muted)]">
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M6 9l6 6 6-6"/>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <!-- Send Button -->
                        <button 
                            class="h-6 min-w-6 px-2 bg-transparent text-[var(--text-muted)] border border-transparent rounded-md cursor-pointer text-[11px] font-medium transition-all duration-200 flex items-center justify-center hover:bg-apple-blue/10 hover:text-apple-blue active:scale-95 disabled:bg-transparent disabled:text-[var(--text-muted)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100" 
                            @click="submit"
                            title="Send"
                            aria-label="Send"
                            :disabled="isLoading || !inputContent.trim()"
                        >
                            <span v-if="!isLoading" class="flex items-center gap-1">
                                <span class="text-[11px] leading-none">Send</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </span>
                            <span v-else class="flex items-center gap-1">
                                <svg class="animate-spin h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span class="text-[11px] leading-none">Thinking</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed , watch, nextTick, onMounted, onUnmounted} from 'vue';
import { OpenAI } from 'openai';
import {MarkdownRenderer, Notice} from 'obsidian';
import {usePromptStore} from '../store/prompts'
import ThinkingClue from './ThinkingClue.vue'
import FollowUpQuestionCard from './FollowUpQuestionCard.vue'
import { DEFAULT_SETTINGS, type Conversation } from '../settings'
import { buildPromptPreview, usePromptMentions } from '../composables/usePromptMentions'

interface SelectionActionState {
    text: string;
    top: number;
    left: number;
    placement: 'above' | 'below';
}

const props = defineProps<{
    plugin: any
    overlayTarget?: HTMLElement | null
}>();

const availableModels = ref<any[]>([]);

const updateModels = () => {
    // Create a shallow copy to ensure Vue detects the change if the array reference is the same but contents changed
    const models = props.plugin.settings?.models || DEFAULT_SETTINGS.models;
    availableModels.value = [...models];
    
    // ensure current model is valid
    const exists = availableModels.value.some((m:any) => m.id === chatModel.value);
    if (!exists && availableModels.value.length > 0) {
        chatModel.value = availableModels.value[0].id;
    }
}

onMounted(() => {
    updateModels(); // Initialize
    if (props.plugin.registerSettingsListener) {
        props.plugin.registerSettingsListener(updateModels);
    }

    document.addEventListener('selectionchange', updateAnswerSelection);
});

onUnmounted(() => {
    if (props.plugin.unregisterSettingsListener) {
        props.plugin.unregisterSettingsListener(updateModels);
    }

    document.removeEventListener('selectionchange', updateAnswerSelection);
});

const inputContent = ref('');
const isLoading = ref(false);
const isThinking = ref(false);
const hasResponse = ref(false);
const promptStore = usePromptStore()
const chatModel = ref(availableModels.value[0]?.id || 'deepseek-reasoner')
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const answerContainerRef = ref<HTMLElement | null>(null);
const selectedReferences = ref<Conversation[]>([]);
const selectionAction = ref<SelectionActionState | null>(null);
const isFollowUpComposerOpen = ref(false);
const followUpQuestionText = ref('');
const followUpSelectedReferences = ref<Conversation[]>([]);

const historyItem = computed(() => promptStore.historyCard)
const historyAnswer = computed(()=>{
    return historyItem.value?.answer || ''
})
const activeSourceConversation = computed<Conversation | null>(() => {
    if (!historyItem.value) {
        return null;
    }

    const sourceConversation = historyItem.value.source_conversation_id
        ? promptStore.findPromptById(historyItem.value.source_conversation_id)
        : historyItem.value;

    return sourceConversation?.id_timestamp ? sourceConversation : null;
})

const todayPromptItems = computed<Conversation[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const promptStats = promptStore.promptStats;
    const items = promptStats?.[today]?.prompt_content || [];
    return [...items].sort((left: Conversation, right: Conversation) => Number(right.id_timestamp) - Number(left.id_timestamp));
});

const {
    activeMentionIndex,
    filteredTodayPrompts,
    showMentionMenu,
    emptyMentionText,
    mentionMenuStyle,
    clearMentionState,
    updateMentionState,
    handleCaretChange,
    selectMention,
    removeReference,
    handleMentionKeydown,
} = usePromptMentions({
    inputContent,
    textareaRef,
    todayPromptItems,
    selectedReferences,
});

const adjustHeight = () => {
    const textarea = textareaRef.value;
    if (textarea) {
        // Use setTimeout to defer resize and avoid ResizeObserver loop errors
        setTimeout(() => {
            textarea.style.height = 'auto'; 
            textarea.style.height = textarea.scrollHeight + 'px';
        }, 0);
    }
}

watch(inputContent, () => {
    nextTick(adjustHeight);
    nextTick(updateMentionState);
});

watch(historyItem, (item) => {
    if (item) {
        return;
    }

    hasResponse.value = false;
    clearSelectionAction();
});

watch(historyAnswer,async ()=>{
    // console.log('监听answerContainerRef.value;
    const container = document.querySelector('.answer-field') as HTMLElement
    if(container) {
        container.empty();
    }
    if(container && historyAnswer.value) {
        await MarkdownRenderer.render(
                props.plugin.app,
                historyAnswer.value,
                container,
                '/',
                props.plugin.app.workspace.getLeavesOfType("deepseek-ai-assistant-itemview")[0].view
        );
    }
    // console.log('watch', historyAnswer.value)
})

const clearSelectionAction = () => {
    selectionAction.value = null;
    isFollowUpComposerOpen.value = false;
    followUpQuestionText.value = '';
    followUpSelectedReferences.value = [];
};

const updateAnswerSelection = () => {
    if (isFollowUpComposerOpen.value) {
        return;
    }

    const container = answerContainerRef.value;
    const overlayRoot = props.overlayTarget ?? container?.closest('[data-follow-up-overlay-root]') as HTMLElement | null;
    const selection = window.getSelection();

    if (!container || !overlayRoot || !selection || selection.rangeCount === 0 || selection.isCollapsed || !activeSourceConversation.value) {
        selectionAction.value = null;
        return;
    }

    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;

    if (!ancestor || !container.contains(ancestor)) {
        selectionAction.value = null;
        return;
    }

    const text = selection.toString().replace(/\s+/g, ' ').trim();
    if (!text) {
        selectionAction.value = null;
        return;
    }

    const rangeRect = range.getBoundingClientRect();
    const overlayRect = overlayRoot.getBoundingClientRect();
    if (!rangeRect.width && !rangeRect.height) {
        selectionAction.value = null;
        return;
    }

    const composerHeight = 236;
    const floatingGap = 12;
    const viewportPadding = 16;
    const spaceAbove = rangeRect.top - overlayRect.top - viewportPadding;
    const spaceBelow = overlayRect.bottom - rangeRect.bottom - viewportPadding;
    const placement = spaceAbove >= composerHeight + floatingGap
        ? 'above'
        : spaceBelow >= composerHeight + floatingGap
            ? 'below'
            : spaceAbove > spaceBelow
                ? 'above'
                : 'below';
    const anchorTop = placement === 'above'
        ? Math.max(rangeRect.top - overlayRect.top, viewportPadding + floatingGap)
        : Math.min(rangeRect.bottom - overlayRect.top, overlayRect.height - viewportPadding - floatingGap);

    selectionAction.value = {
        text,
        left: Math.min(Math.max(rangeRect.left - overlayRect.left + rangeRect.width / 2, 32), overlayRect.width - 32),
        top: anchorTop,
        placement,
    };
};

const openFollowUpComposer = () => {
    if (!selectionAction.value) {
        return;
    }

    isFollowUpComposerOpen.value = true;
    followUpQuestionText.value = '';
    followUpSelectedReferences.value = [];
};

const closeFollowUpComposer = () => {
    clearSelectionAction();
    window.getSelection()?.removeAllRanges();
};

const mergeReferences = (...groups: Conversation[][]) => {
    const uniqueReferences = new Map<string, Conversation>();

    groups.flat().forEach((item) => {
        if (!item?.id_timestamp || uniqueReferences.has(item.id_timestamp)) {
            return;
        }

        uniqueReferences.set(item.id_timestamp, item);
    });

    return Array.from(uniqueReferences.values());
};

const submitPrompt = async (
    promptText: string,
    references: Conversation[] = selectedReferences.value,
    sourceConversationId?: string,
    sourceSelection?: string
) => {
    const container = answerContainerRef.value;
    if(container) container.empty();
    isLoading.value = true;  // 开始加载
    isThinking.value = true;
    hasResponse.value = false;

    try {
        // Find the configuration for the selected model ID (which is the internal UUID now)
        const selectedModelConfig = availableModels.value.find((m: any) => m.id === chatModel.value) || availableModels.value[0];
        
        if (!selectedModelConfig) {
            throw new Error('No model configuration found.');
        }

        if (!selectedModelConfig.apiKey) {
            new Notice('API Key is missing for the selected model. Please configure it in the settings.');
            throw new Error('API Key is missing. Please configure it in the settings.');
        }

        const openai = new OpenAI({
            apiKey: selectedModelConfig.apiKey,
            baseURL: selectedModelConfig.apiUrl,
            dangerouslyAllowBrowser: true
        });

        let fullResponse = '';
        const orderedReferences = [...references].sort((left, right) => Number(left.id_timestamp) - Number(right.id_timestamp));
        const messages = [
            {role: 'system' as const, content:'你是一个AI助手，请根据用户的问题给出回答'},
            ...orderedReferences.flatMap((item) => {
                return [
                    { role: 'user' as const, content: item.prompt },
                    { role: 'assistant' as const, content: item.answer },
                ];
            }),
            ...(sourceSelection
                ? [{
                    role: 'system' as const,
                    content: [
                        '当前用户正在基于上一轮回答中的一个选中片段继续追问。',
                        '回答后续问题时，请遵守以下规则：',
                        '1. 如果用户的问题是在追问原因、细节、边界条件或示例，回答时要直接对应到选中片段，不要泛泛重述整段历史对话。',
                        '',
                        '用户选中的片段：',
                        sourceSelection,
                    ].join('\n')
                }]
                : []),
            {role: 'user' as const, content: promptText}
        ];

        // openAI的Chat Completions API，定义了现代聊天式大模型交互的基本格式
        const completion = await openai.chat.completions.create({
            messages,
            model: selectedModelConfig.modelId, // Use the API Model ID from config
            stream: true
        });

        // 处理流式响应
        for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                if (isThinking.value) {
                    isThinking.value = false;
                }
                fullResponse += content;
                // 实时渲染 Markdown 内容
                if(container) {
                    container.empty();
                    await MarkdownRenderer.render(
                        props.plugin.app,
                        fullResponse,
                        container,
                        '/',
                        props.plugin.app.workspace.getLeavesOfType("deepseek-ai-assistant-itemview")[0].view
                    );
                }
            }
        }

        if (fullResponse) {
            const contextRefIds = orderedReferences.map((item) => item.id_timestamp);
            const savedPrompt = await promptStore.addPrompt(
                promptText,
                fullResponse,
                selectedModelConfig.id,
                contextRefIds,
                sourceConversationId || orderedReferences[0]?.id_timestamp,
                sourceSelection
            )

            if (savedPrompt) {
                promptStore.updateHistoryCard(savedPrompt)
            }

            hasResponse.value = true;
            return savedPrompt;
        }
    } catch (error: any) {
        isThinking.value = false;
        // console.log('---Error:', error);
        
        let displayMessage = error.message;
        if (error.status === 401) {
            displayMessage = "**API Error 401 (Unauthorized):**\nThe API Key provided is invalid, expired, or missing. Please check your settings and ensure the correct API Key is entered.";
            new Notice("DeepSeek API Error: Invalid API Key (401)");
        } else if (error.status === 429) {
             displayMessage = "**API Error 429 (Too Many Requests):**\nYou have exceeded your rate limit or quota. Please check your API provider usage.";
             new Notice("DeepSeek API Error: Rate Limit Exceeded (429)");
        }
        
        if(container) {
            await MarkdownRenderer.render(
                props.plugin.app,
                displayMessage,
                container,
                '/',
                props.plugin.app.workspace.getLeavesOfType("deepseek-ai-assistant-itemview")[0].view
            );
        }
    } finally {
        isLoading.value = false;  // 结束加载
        isThinking.value = false;
    }
}

const submit = async () => {
    const promptText = inputContent.value.trim();
    if (!promptText) {
        return;
    }

    const references = [...selectedReferences.value];
    await submitPrompt(promptText, references, references[0]?.id_timestamp);
    inputContent.value = '';
    selectedReferences.value = [];
    clearMentionState();
    clearSelectionAction();
}

const sendFollowUpQuestionNow = async () => {
    const promptText = followUpQuestionText.value.trim();
    const sourceConversation = activeSourceConversation.value;
    const sourceSelection = selectionAction.value?.text?.trim();

    if (!promptText || !sourceSelection || !sourceConversation) {
        return;
    }

    const references = mergeReferences([sourceConversation], followUpSelectedReferences.value);
    await submitPrompt(promptText, references, sourceConversation.id_timestamp, sourceSelection);
    closeFollowUpComposer();
}
</script>

<style scoped>
/* 确保 Markdown 内容也可以选择 */
.answer-field :deep(*) {
    user-select: text;
    -webkit-user-select: text;
}

/* 滚动条样式 */
.answer-field::-webkit-scrollbar {
    width: 6px;
}
.answer-field::-webkit-scrollbar-track {
    background: transparent;
}
.answer-field::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
}

.mention-menu-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.mention-menu-scroll::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
}
</style>

