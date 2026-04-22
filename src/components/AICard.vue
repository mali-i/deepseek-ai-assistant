<template>
    <div class="flex flex-col h-full p-2 max-w-[900px] mx-auto w-full">
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
                @open="openFollowUpComposer"
                @close="closeFollowUpComposer"
                @save="saveFollowUpConversation"
                @send="sendFollowUpQuestionNow"
                @update:follow-up-question-text="followUpQuestionText = $event"
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
                        class="w-full p-4 pb-14 border-none rounded-xl resize-none text-[15px] leading-relaxed bg-[var(--background-primary)] text-[var(--text-normal)] min-h-[120px] max-h-[250px] overflow-y-auto font-sans outline-none placeholder:text-[var(--text-muted)]" 
                        v-model="inputContent" 
                        placeholder="Ask anything...Use @ to reference past conversations from today as context for this session."
                        @input="adjustHeight"
                        @click="handleCaretChange"
                        @keyup="handleCaretChange"
                        @keydown="handleMentionKeydown"
                        @scroll="handleCaretChange"
                    ></textarea>

                    <!-- 历史上下文弹层 -->
                    <div
                        v-if="showMentionMenu"
                        ref="mentionMenuRef"
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
                    <div class="absolute bottom-3 right-3 left-3 flex justify-between items-center">
                        <!-- Model Selector -->
                        <div class="relative group">
                            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[var(--apple-border)]">
                                <select 
                                    v-model="chatModel" 
                                    class="appearance-none bg-transparent border-none text-[12px] font-medium text-[var(--text-normal)] cursor-pointer pr-4 focus:outline-none font-sans"
                                >
                                    <option v-for="model in availableModels" :key="model.id" :value="model.id">
                                        {{ model.name }}
                                    </option>
                                </select>
                                <div class="absolute right-2.5 pointer-events-none text-[var(--text-muted)]">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M6 9l6 6 6-6"/>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <!-- Send Button -->
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
import { ref, computed , watch, nextTick, onMounted, onUnmounted} from 'vue';
import { OpenAI } from 'openai';
import {MarkdownRenderer, Notice} from 'obsidian';
import {usePromptStore} from '../store/prompts'
import ThinkingClue from './ThinkingClue.vue'
import FollowUpQuestionCard from './FollowUpQuestionCard.vue'
import { DEFAULT_SETTINGS } from '../settings'

interface PromptReference {
    id_timestamp: string;
    prompt: string;
    answer: string;
    model?: string;
}

interface MentionState {
    query: string;
    start: number;
    end: number;
}

interface MentionMenuPosition {
    top: number;
    left: number;
    maxWidth: number;
}

interface SelectionActionState {
    text: string;
    top: number;
    left: number;
}

const props = defineProps<{
    plugin: any
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
const mentionMenuRef = ref<HTMLElement | null>(null);
const selectedReferences = ref<PromptReference[]>([]);
const mentionState = ref<MentionState | null>(null);
const activeMentionIndex = ref(0);
const mentionMenuPosition = ref<MentionMenuPosition | null>(null);
const selectionAction = ref<SelectionActionState | null>(null);
const isFollowUpComposerOpen = ref(false);
const followUpQuestionText = ref('');

const historyItem = computed(() => promptStore.historyCard)
const historyAnswer = computed(()=>{
    return historyItem.value?.answer || ''
})
const activeSourceConversation = computed<PromptReference | null>(() => {
    if (!historyItem.value?.id_timestamp) {
        return null;
    }

    return {
        id_timestamp: historyItem.value.id_timestamp,
        prompt: historyItem.value.prompt,
        answer: historyItem.value.answer,
        model: historyItem.value.model,
    };
})

const todayPromptItems = computed<PromptReference[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const promptStats = promptStore.promptStats;
    const items = promptStats?.[today]?.prompt_content || [];
    return [...items].sort((left: PromptReference, right: PromptReference) => Number(right.id_timestamp) - Number(left.id_timestamp));
});

const filteredTodayPrompts = computed<PromptReference[]>(() => {
    if (!mentionState.value) {
        return [];
    }

    const query = mentionState.value.query.trim().toLowerCase();
    return todayPromptItems.value.filter((item) => {
        if (selectedReferences.value.some((selected) => selected.id_timestamp === item.id_timestamp)) {
            return false;
        }

        if (!query) {
            return true;
        }

        return item.prompt.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query);
    });
});

const showMentionMenu = computed(() => {
    return Boolean(mentionState.value);
});

const emptyMentionText = computed(() => {
    if (!mentionState.value) {
        return '';
    }

    if (!todayPromptItems.value.length) {
        return 'Today has no history conversations yet.';
    }

    return mentionState.value.query.trim()
        ? 'No matching history conversations found for the current @ search.'
        : 'No remaining history conversations are available to be selected.';
});

const mentionMenuStyle = computed(() => {
    if (!mentionMenuPosition.value) {
        return { 
            left: '16px',
            top: '0px',
            width: '360px',
            maxWidth: 'calc(100% - 32px)',
            transform: 'translateY(calc(-100% - 4px))',
        };
    }
    // 返回弹层位置的css样式对象
    return {
        left: `${mentionMenuPosition.value.left}px`,
        top: `${mentionMenuPosition.value.top}px`,
        width: '360px',
        maxWidth: `${mentionMenuPosition.value.maxWidth}px`,
        transform: 'translateY(calc(-100% - 4px))',
    };
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
answerContainerRef.value;
watch(historyAnswer,async ()=>{
    // console.log('监听answerContainerRef.value;
    const container = document.querySelector('.answer-field') as HTMLElement
    if(container && historyAnswer.value) {
        container.empty();
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

watch(filteredTodayPrompts, (items) => {
    if (!items.length) {
        activeMentionIndex.value = 0;
        return;
    }

    if (activeMentionIndex.value >= items.length) {
        activeMentionIndex.value = 0;
    }

    nextTick(updateMentionMenuPosition);
});

watch(showMentionMenu, (visible) => {
    if (!visible) {
        mentionMenuPosition.value = null;
        return;
    }

    nextTick(updateMentionMenuPosition);
});

const buildPromptPreview = (text: string, maxLength = 36) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return 'Untitled prompt';
    }
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const clearMentionState = () => {
    mentionState.value = null;
    activeMentionIndex.value = 0;
    mentionMenuPosition.value = null;
};

const clearSelectionAction = () => {
    selectionAction.value = null;
    isFollowUpComposerOpen.value = false;
    followUpQuestionText.value = '';
};

const updateAnswerSelection = () => {
    if (isFollowUpComposerOpen.value) {
        return;
    }

    const container = answerContainerRef.value;
    const host = container?.parentElement;
    const selection = window.getSelection();

    if (!container || !host || !selection || selection.rangeCount === 0 || selection.isCollapsed || !activeSourceConversation.value) {
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
    const hostRect = host.getBoundingClientRect();
    if (!rangeRect.width && !rangeRect.height) {
        selectionAction.value = null;
        return;
    }

    selectionAction.value = {
        text,
        left: Math.min(Math.max(rangeRect.left - hostRect.left + rangeRect.width / 2, 32), hostRect.width - 32),
        top: Math.max(rangeRect.top - hostRect.top - 12, 12),
    };
};

const openFollowUpComposer = () => {
    if (!selectionAction.value) {
        return;
    }

    isFollowUpComposerOpen.value = true;
    followUpQuestionText.value = '';
};

const closeFollowUpComposer = () => {
    clearSelectionAction();
    window.getSelection()?.removeAllRanges();
};

const getTextareaCaretCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
    const computedStyle = window.getComputedStyle(textarea);
    const mirror = document.createElement('div');
    const propertiesToCopy = [
        'boxSizing',
        'width',
        'height',
        'overflowX',
        'overflowY',
        'borderTopWidth',
        'borderRightWidth',
        'borderBottomWidth',
        'borderLeftWidth',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'fontStyle',
        'fontVariant',
        'fontWeight',
        'fontStretch',
        'fontSize',
        'fontSizeAdjust',
        'lineHeight',
        'fontFamily',
        'textAlign',
        'textTransform',
        'textIndent',
        'textDecoration',
        'letterSpacing',
        'wordSpacing',
        'tabSize',
        'MozTabSize',
    ] as const;

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.overflow = 'hidden';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';

    propertiesToCopy.forEach((property) => {
        mirror.style[property as any] = computedStyle[property as any];
    });

    mirror.textContent = textarea.value.slice(0, position);

    const marker = document.createElement('span');
    marker.textContent = textarea.value.slice(position) || '.';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const coordinates = {
        left: marker.offsetLeft - textarea.scrollLeft,
        top: marker.offsetTop - textarea.scrollTop,
        lineHeight: parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.4,
    };

    document.body.removeChild(mirror);
    return coordinates;
};

const updateMentionMenuPosition = () => {
    const textarea = textareaRef.value;
    if (!textarea || !mentionState.value) {
        mentionMenuPosition.value = null;
        return;
    }

    const container = textarea.parentElement;
    if (!container) {
        mentionMenuPosition.value = null;
        return;
    }

    const caret = getTextareaCaretCoordinates(textarea, mentionState.value.end);
    const horizontalPadding = 16;
    const preferredWidth = 360;
    const availableWidth = Math.max(240, container.clientWidth - horizontalPadding * 2);
    const popupWidth = Math.min(preferredWidth, availableWidth);
    const maxLeft = Math.max(horizontalPadding, container.clientWidth - popupWidth - horizontalPadding);
    const caretLeft = textarea.offsetLeft + caret.left;
    const caretTop = textarea.offsetTop + caret.top;

    mentionMenuPosition.value = {
        left: Math.min(Math.max(caretLeft, horizontalPadding), maxLeft),
        top: caretTop,
        maxWidth: availableWidth,
    };
};

const updateMentionState = () => {
    const textarea = textareaRef.value;
    if (!textarea) {
        clearMentionState();
        return;
    }

    const caretIndex = textarea.selectionStart ?? inputContent.value.length;
    const contentBeforeCaret = inputContent.value.slice(0, caretIndex);
    const match = contentBeforeCaret.match(/(^|\s)@([^\s@]*)$/);

    if (!match) {
        clearMentionState();
        return;
    }

    const leadingPart = match[1] || '';
    const tokenStart = contentBeforeCaret.length - match[0].length + leadingPart.length;

    mentionState.value = {
        query: match[2] || '',
        start: tokenStart,
        end: caretIndex,
    };

    nextTick(updateMentionMenuPosition);
};

const handleCaretChange = () => {
    updateMentionState();
};

const selectMention = async (item: PromptReference) => {
    if (!mentionState.value) {
        return;
    }

    if (!selectedReferences.value.some((selected) => selected.id_timestamp === item.id_timestamp)) {
        selectedReferences.value = [...selectedReferences.value, item];
    }

    const before = inputContent.value.slice(0, mentionState.value.start);
    const after = inputContent.value.slice(mentionState.value.end);
    const needsSpace = after.length > 0 && !after.startsWith(' ') && !before.endsWith(' ') ? ' ' : '';
    inputContent.value = `${before}${needsSpace}${after}`;
    clearMentionState();

    await nextTick();

    const nextCaret = before.length + needsSpace.length;
    textareaRef.value?.focus();
    textareaRef.value?.setSelectionRange(nextCaret, nextCaret);
    updateMentionMenuPosition();
};

const removeReference = (id: string) => {
    selectedReferences.value = selectedReferences.value.filter((item) => item.id_timestamp !== id);
};

const handleMentionKeydown = (event: KeyboardEvent) => {
    if (!showMentionMenu.value) {
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeMentionIndex.value = (activeMentionIndex.value + 1) % filteredTodayPrompts.value.length;
        return;
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeMentionIndex.value = (activeMentionIndex.value - 1 + filteredTodayPrompts.value.length) % filteredTodayPrompts.value.length;
        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        const activeItem = filteredTodayPrompts.value[activeMentionIndex.value];
        if (activeItem) {
            void selectMention(activeItem);
        }
        return;
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        clearMentionState();
    }
};

const handleCommand = (command: string | number | object) => {
  new Notice(`click on item ${command}`)
}

const submitPrompt = async (
    promptText: string,
    references: PromptReference[] = selectedReferences.value,
    sourceConversationId?: string
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
                sourceConversationId || orderedReferences[0]?.id_timestamp
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

const saveFollowUpConversation = async () => {
    const promptText = followUpQuestionText.value.trim();
    const sourceConversation = activeSourceConversation.value;

    if (!promptText || !selectionAction.value || !sourceConversation) {
        return;
    }

    await promptStore.addFollowUpConversation(promptText, sourceConversation.id_timestamp, selectionAction.value.text)
    new Notice('Follow-up saved')
    closeFollowUpComposer();
}

const sendFollowUpQuestionNow = async () => {
    const promptText = followUpQuestionText.value.trim();
    const sourceConversation = activeSourceConversation.value;

    if (!promptText || !selectionAction.value || !sourceConversation) {
        return;
    }

    await submitPrompt(promptText, [sourceConversation], sourceConversation.id_timestamp);
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

