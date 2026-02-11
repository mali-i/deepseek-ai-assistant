<template>
    <div class="absolute inset-0 flex w-full h-full overflow-hidden bg-[var(--background-primary)] text-[var(--text-normal)]">
        <!-- 侧边栏 -->
        <div 
            v-show="isSidebarOpen"
            class="relative flex flex-col flex-none h-full bg-[var(--background-secondary)] border-r border-[var(--apple-border)]"
            :style="{ width: asideWidth + 'px', flexDirection: 'column' }"
        >
            <!-- Header/Dashboard 区域：固定高度，带底部分割线 -->
            <div class="flex-none w-full border-b border-[var(--apple-border)] pb-0">
                <DataPanel :plugin="plugin"/>
                <HeatMap/>
            </div>
            
            <!-- List 区域：自适应高度，独立滚动 -->
            <div class="flex-1 w-full min-h-0 overflow-hidden">
                <ConversationList :plugin="plugin" />
            </div>
            
            <!-- Footer 区域 (可选)：如设置按钮等，固定在底部 -->
            <!-- <div class="flex-none p-3 border-t border-[var(--apple-border)]">
                <button>Settings</button>
            </div> -->
            
            <!-- 拖拽手柄 -->
            <div 
                class="absolute right-0 top-0 w-[6px] h-full cursor-col-resize z-50 hover:bg-apple-blue/10 active:bg-apple-blue/20 transition-colors duration-200 flex justify-end group"
                @mousedown.prevent="startDrag"
            >
                <div class="w-[2px] h-full bg-transparent group-hover:bg-apple-blue group-active:bg-apple-blue transition-colors duration-200"></div>
            </div>
        </div>

        <!-- 主内容区 -->
        <div class="flex-1 h-full overflow-hidden relative bg-[var(--background-secondary)]">
            <!-- Sidebar Toggle Button -->
            <button 
                @click="toggleSidebar"
                class="absolute top-3 left-3 z-20 p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] transition-colors"
                :title="isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
            </button>
            <AICard :plugin="plugin"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import AICard from "./AICard.vue";
import HeatMap from "./HeatMap.vue";
import DataPanel from "./DataPanel.vue";
import ConversationList from "./ConversationList.vue";
import { ref, onUnmounted } from 'vue';
import { usePluginStore } from "../store/plugin";
import { storeToRefs } from "pinia";

const props = defineProps<{
    plugin: any
}>();

const pluginStore = usePluginStore();
const { isSidebarOpen } = storeToRefs(pluginStore);

const toggleSidebar = () => {
    pluginStore.toggleSidebar();
};

// 侧边栏宽度控制
const asideWidth = ref(260); // 默认宽度稍微调大一点
const isDragging = ref(false);
let startX = 0;
let startWidth = 0;

// 开始拖拽
const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  startX = e.clientX;
  startWidth = asideWidth.value;
  document.body.style.cursor = 'col-resize'; // 强制全局鼠标样式

  // 全局事件监听
  window.addEventListener('mousemove', handleDrag);
  window.addEventListener('mouseup', stopDrag);
};

// 处理拖拽
const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  const delta = e.clientX - startX;
  const newWidth = startWidth + delta;
  
  // 限制最小宽度和最大宽度
  asideWidth.value = Math.max(200, Math.min(newWidth, 600)); 
};

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false;
  document.body.style.cursor = ''; // 恢复鼠标样式

  // 清理事件
  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('mouseup', stopDrag);
};

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
});

</script>
