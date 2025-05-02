<template>
  <div class="prompt-line-container" @click="clearSelection">
    <h3 class="date-title">{{ selectedDate }}</h3>
    <el-timeline class="custom-timeline">
      <el-timeline-item 
        v-for="item in sortedPromptContent"
        :key="item.id_timestamp"
        :timestamp="formatTime(item.id_timestamp)"
        placement="top"
        class="timeline-item"
      >
        <div class="prompt-card" @click="clickItem(item.answer)">
          <div class="prompt-content">{{item.prompt}}</div>
          <!-- <div class="prompt-meta">
            <span class="prompt-time">{{formatTime(item.id_timestamp)}}</span>
          </div> -->
        </div>
      </el-timeline-item>
    </el-timeline>     
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {usePromptStore} from '../store/prompts'

const promptStore = usePromptStore()


const props = defineProps<{
    plugin: any
}>();

const selectedDate = computed(()=>{
  console.log(promptStore.selectedDate)
  return promptStore.selectedDate
})

let selectedPromptStats = computed(()=>{
  const promptStats = promptStore.promptStats
  console.log('promptLine:',promptStats[promptStore.selectedDate] )
  return promptStats[promptStore.selectedDate] 
})

const sortedPromptContent = computed(() => {

  if(!selectedPromptStats.value){
    console.log('!!')
    return {}
  }
  // 创建副本避免修改原始数据
  const content = [...selectedPromptStats.value.prompt_content];
  
  // 按时间戳从新到旧排序（降序）
  return content.sort((a, b) => {
    // 确保时间戳为数字（如字符串需转换）
    const timeA = Number(a.id_timestamp);
    const timeB = Number(b.id_timestamp);
    return timeB - timeA; // 降序
  })
})

const formatTime = (timestamp: string) => {
  try {
    if (!isNaN(Number(timestamp))) {
      return new Date(Number(timestamp)).toLocaleTimeString();
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '无效时间';
    }
    return date.toLocaleTimeString();
  } catch (error) {
    console.error('时间格式化错误:', error);
    return '无效时间';
  }
}

const clickItem = (answer: any)=>{
  promptStore.updateHistoryCard(answer)
}

// 添加清除选中文本的函数
const clearSelection = (event: MouseEvent) => {
  // 检查点击是否发生在文本内容之外
  const target = event.target as HTMLElement;
  if (!target.closest('.prompt-content')) {
    window.getSelection()?.removeAllRanges();
  }
}
</script>

<style scoped>
.prompt-line-container {
  padding: 12px;
  background: var(--background-primary); /* 使用 Obsidian 的背景色 */
  height: 100%;
  overflow-y: auto;
}

.date-title {
  font-size: 16px;
  color: var(--text-normal); /* 使用 Obsidian 的文本颜色 */
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--background-modifier-border); /* 使用 Obsidian 的边框颜色 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.custom-timeline {
  padding: 0 8px;
}

.timeline-item {
  margin-bottom: 12px;
}

.prompt-card {
  background: var(--background-primary-alt); /* 使用 Obsidian 的次要背景色 */
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: text;          /* 允许卡片内容选择 */
  -webkit-user-select: text;  /* Safari 支持 */
  -moz-user-select: text;     /* Firefox 支持 */
  -ms-user-select: text;      /* IE/Edge 支持 */
  
  /* 添加选中文本的样式 */
  & *::selection {
    background-color: var(--text-selection);
    color: var(--text-normal);
  }
}

.prompt-card:hover {
  background: var(--background-secondary); /* 悬浮时使用不同的背景色 */
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.prompt-content {
  color: var(--text-normal);
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
  user-select: text;          /* 允许文本选择 */
  -webkit-user-select: text;  /* Safari 支持 */
  -moz-user-select: text;     /* Firefox 支持 */
  -ms-user-select: text;      /* IE/Edge 支持 */
  cursor: text;               /* 显示文本选择光标 */
  
  /* 添加选中文本的样式 */
  &::selection {
    background-color: var(--text-selection);       /* 使用 Obsidian 的选中背景色 */
    color: var(--text-normal);                     /* 使用 Obsidian 的文本颜色 */
  }
}

/* Element Plus 时间线样式调整 */
:deep(.el-timeline-item__node) {
  /* background-color: var(--interactive-accent); 使用 Obsidian 的强调色 */
  background-color: #2C82C9;
}

:deep(.el-timeline-item__tail) {
  border-left: 2px solid var(--background-modifier-border);
}

:deep(.el-timeline-item__timestamp) {
  color: var(--text-muted); /* 使用 Obsidian 的次要文本颜色 */
  font-size: 12px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 滚动条样式 */
.prompt-line-container::-webkit-scrollbar {
  width: 4px;
}

.prompt-line-container::-webkit-scrollbar-track {
  background: var(--background-primary);
}

.prompt-line-container::-webkit-scrollbar-thumb {
  background-color: var(--background-modifier-border);
  border-radius: 2px;
}

.prompt-line-container::-webkit-scrollbar-thumb:hover {
  background-color: var(--background-modifier-border-hover);
}

/* 响应式设计保持不变 */
@media (max-width: 768px) {
  .prompt-line-container {
    padding: 8px;
  }
  
  .prompt-card {
    padding: 10px;
  }
}

/* 添加卡片激活状态样式 */
.prompt-card:active {
  transform: translateY(0);
  background: var(--background-modifier-hover);
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

/* 添加时间线项目的hover效果 */
:deep(.el-timeline-item:hover .el-timeline-item__node) {
  transform: scale(1.2);
  transition: transform 0.2s ease;
}

/* 优化时间戳的可读性 */
:deep(.el-timeline-item__timestamp.is-top) {
  padding-bottom: 8px;
  margin-bottom: 8px;
}
</style>