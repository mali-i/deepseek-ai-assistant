<template>
    <div class="ai-card">
        <div class="input-section">
            <div class="input-wrapper">
                <div class="textarea-container">
                    <textarea 
                        class="input-field" 
                        v-model="inputContent" 
                        placeholder="请输入内容..."
                    ></textarea>
                    <div class="button-container">
                        <select name="model-select" v-model="chatModel" class="model-select">
                            <option value="deepseek-reasoner">Deepseek-R1</option>
                            <option value="deepseek-chat">Deepseek-V3</option>
                        </select>
                        <button 
                            class="submit-button" 
                            @click="submit"
                            :disabled="isLoading"
                        >
                            <span v-if="!isLoading">发送</span>
                            <span v-else class="loading-dots">处理中...</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="answer-section">
            <div class="answer-field"></div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed , watch} from 'vue';
import { OpenAI } from 'openai';
import {MarkdownRenderer} from 'obsidian';
import {usePromptStore} from '../store/prompts'
import { ElMessage } from 'element-plus'

const props = defineProps<{
    plugin: any
}>();

let inputContent = ref('');
let isLoading = ref(false);
const promptStore = usePromptStore()
var chatModel = ref('deepseek-reasoner')

let historyAnswer = computed(()=>{
    return promptStore.historyCard
})

watch(historyAnswer,async ()=>{
    console.log('监听到historyAnswer改变')
    const container = document.querySelector('.answer-field') as HTMLElement
    container.innerHTML = '';
    await MarkdownRenderer.render(
                props.plugin.app,
                historyAnswer.value,
                container,
                '/',
                props.plugin
        );
    console.log('watch', historyAnswer.value)
})


const handleCommand = (command: string | number | object) => {
  ElMessage(`click on item ${command}`)
}

const submit = async () => {
    const container = document.querySelector('.answer-field') as HTMLElement;
    container.innerHTML = '';
    isLoading.value = true;  // 开始加载

    try {
        const openai = new OpenAI({
            apiKey: props.plugin.settings.API_KEY,
            baseURL: props.plugin.settings.API_URL,
            dangerouslyAllowBrowser: true
        });

        const completion = await openai.chat.completions.create({
            messages: [
                {role: "system", content:'你是一个AI助手，请根据用户的问题给出回答'},
                {role: "user", content: inputContent.value}
            ],
            model: chatModel.value,
            stream: false
        });

        const response = completion.choices[0].message.content;
        if (response) {
            await MarkdownRenderer.render(
                props.plugin.app,
                response,
                container,
                '/',
                props.plugin
            );

            // 保存对话到 store
            promptStore.addPrompt(inputContent.value, response)
            // 清空输入框
            inputContent.value = '';
        }
    } catch (error: any) {
        console.error('Error:', error);
        container.innerHTML = `<div class="error-message">错误: ${error.message}</div>`;
    } finally {
        isLoading.value = false;  // 结束加载
    }
}
</script>

<style scoped>
.ai-card {
    display: flex;
    flex-direction: column;
    height: 100%;  /* 使用全部可用高度 */
    padding: 20px;
}

.input-section {
    margin-bottom: 20px;
}

.input-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.textarea-container {
    position: relative;
    width: 100%;
}

.input-field {
    width: 100%;
    padding: 8px 12px;
    padding-bottom: 40px; /* 为按钮留出空间 */
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    resize: vertical;
    font-size: 14px;
    background: var(--background-primary);
    color: var(--text-normal);
    min-height: 100px;
}

.button-container {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
} 



.submit-button, .model-select {
    height: 28px;
    padding: 0 12px;
    background-color: var(--interactive-normal);
    color: var(--text-normal);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    min-width: 50px;
    opacity: 0.8;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
}

.submit-button:hover, .model-select:hover {
    opacity: 1;
    background-color: var(--interactive-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.submit-button:active {
    transform: translateY(0);
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
}

.submit-button:disabled {
    background-color: var(--interactive-normal);
    opacity: 0.5;
    cursor: wait;
    transform: none;
    box-shadow: none;
}

.loading-dots {
    color: var(--text-muted);
}

.answer-section {
    flex: 1;  /* 占用剩余空间 */
    overflow: hidden;  /* 防止溢出 */
    position: relative;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    background: var(--background-primary-alt);
    margin-bottom: 20px;
}

.answer-field {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow-y: auto;
    padding: 16px;
    user-select: text;  /* 允许文本选择 */
    cursor: text;       /* 显示文本选择光标 */
    -webkit-user-select: text; /* 兼容 Webkit 浏览器 */
    -moz-user-select: text;    /* 兼容 Firefox */
    -ms-user-select: text;     /* 兼容 IE/Edge */
}

/* 确保 Markdown 内容也可以选择 */
.answer-field :deep(*) {
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
}

/* 自定义滚动条样式 */
.answer-field::-webkit-scrollbar {
    width: 8px;
}

.answer-field::-webkit-scrollbar-track {
    background: var(--background-primary);
}

.answer-field::-webkit-scrollbar-thumb {
    background-color: var(--background-modifier-border);
    border-radius: 4px;
}
</style>

