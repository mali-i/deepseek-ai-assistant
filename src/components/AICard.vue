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
        </div>

        <!-- Input Area -->
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
import { DEFAULT_SETTINGS } from '../settings'

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
});

onUnmounted(() => {
    if (props.plugin.unregisterSettingsListener) {
        props.plugin.unregisterSettingsListener(updateModels);
    }
});

const inputContent = ref('');
const isLoading = ref(false);
const isThinking = ref(false);
const hasResponse = ref(false);
const promptStore = usePromptStore()
const chatModel = ref(availableModels.value[0]?.id || 'deepseek-reasoner')
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const answerContainerRef = ref<HTMLElement | null>(null);

const historyItem = computed(() => promptStore.historyCard)
const historyAnswer = computed(()=>{
    return historyItem.value?.answer || ''
})

const adjustHeight = () => {
    const textarea = textareaRef.value;
    if (textarea) {
        // 使用 requestAnimationFrame 避免 ResizeObserver loop 错误
        window.requestAnimationFrame(() => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });
    }
}

watch(inputContent, () => {
    nextTick(adjustHeight);
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


const handleCommand = (command: string | number | object) => {
  new Notice(`click on item ${command}`)
}

const submit = async () => {
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

        const openai = new OpenAI({
            apiKey: selectedModelConfig.apiKey,
            baseURL: selectedModelConfig.apiUrl,
            dangerouslyAllowBrowser: true
        });

        let fullResponse = '';
        const completion = await openai.chat.completions.create({
            messages: [
                {role: "system", content:'你是一个AI助手，请根据用户的问题给出回答'},
                {role: "user", content: inputContent.value}
            ],
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
            // 保存对话到 store
            promptStore.addPrompt(inputContent.value, fullResponse)
            // 清空输入框
            inputContent.value = '';
            hasResponse.value = true;
        }
    } catch (error: any) {
        isThinking.value = false;
        // console.log('---Error:', error);
        if(container) {
            await MarkdownRenderer.render(
                props.plugin.app,
                error.message,
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
</style>

