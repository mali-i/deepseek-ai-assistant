<template>
    <div ref="overlayRootRef" data-follow-up-overlay-root class="absolute inset-0 flex w-full h-full overflow-hidden bg-[var(--background-primary)] text-[var(--text-normal)]">
        <!-- 左侧边栏 -->
        <div
            class="relative flex flex-none h-full overflow-hidden bg-[var(--background-secondary)]"
            :class="isSidebarOpen ? 'border-r border-[var(--apple-border)]' : 'border-r-0'"
            :style="{ width: isSidebarOpen ? asideWidth + 'px' : collapsedAsideWidth + 'px' }"
        >
            <div
                v-if="isSidebarOpen"
                class="relative flex h-full w-full flex-col"
                :style="{ flexDirection: 'column' }"
            >
                <!-- 侧边栏顶部面包屑导航栏区 -->
                <div class="flex h-10 items-center justify-between border-b border-[var(--apple-border)] px-3">
                    <div class="inline-flex items-center gap-1 overflow-hidden select-none">
                        <span class="inline-flex items-center rounded-full bg-[var(--background-modifier-hover)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                            Overview
                        </span>
                        <button
                            @click="toggleDashboardSection"
                            type="button"
                            class="inline-flex appearance-none items-center justify-center rounded-md border-0 bg-transparent p-2 text-[var(--text-muted)] shadow-none outline-none transition-all duration-150 hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] hover:shadow-sm active:scale-95 focus:outline-none focus:ring-0"
                            style="border: none; box-shadow: none;"
                            title="Toggle Overview"
                        >
                            <svg
                                class="h-3 w-3 shrink-0 text-[var(--text-faint)] transition-transform duration-150"
                                :class="isDashboardCollapsed ? '-rotate-90' : 'rotate-90'"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.75"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M6 3.5L10.5 8L6 12.5"></path>
                            </svg>
                        </button>
                        <!-- <span class="truncate text-xs font-medium text-[var(--text-muted)]">
                            Overview
                        </span> -->

                    </div>

                    <!--class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)]" -->
                    <button
                        @click="toggleSidebar"
                        type="button"
                        class="inline-flex appearance-none items-center justify-center rounded-md border-0 bg-transparent p-2 text-[var(--text-muted)] shadow-none outline-none transition-all duration-150 hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] hover:shadow-sm active:scale-95 focus:outline-none focus:ring-0"
                        style="border: none; box-shadow: none;"
                        title="Close Sidebar"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                    </button>
                </div>

                <!-- Header/Dashboard 区域：固定高度，带底部分割线 -->
                <div
                    v-show="!isDashboardCollapsed"
                    class="flex-none w-full border-b border-[var(--apple-border)] pb-0"
                >
                    <DataPanel :plugin="plugin"/>
                    <HeatMap/>
                </div>

                <!-- List 区域：自适应高度，独立滚动 -->
                <div class="flex-1 w-full min-h-0 overflow-hidden">
                    <PromptLine :plugin="plugin"/>
                </div>

                <!-- Footer 区域 (可选)：如设置按钮等，固定在底部 -->
                <!-- <div class="flex-none p-3 border-t border-[var(--apple-border)]">
                    <button>Settings</button>
                </div> -->

                <!-- 拖拽手柄 -->
                <div
                    class="absolute right-0 top-0 z-50 flex h-full w-[6px] cursor-col-resize justify-end transition-colors duration-200 hover:bg-apple-blue/10 active:bg-apple-blue/20 group"
                    @mousedown.prevent="startDrag"
                >
                    <div class="h-full w-[2px] bg-transparent transition-colors duration-200 group-hover:bg-apple-blue group-active:bg-apple-blue"></div>
                </div>
            </div>

        </div>

        <!-- 主内容区 -->
        <div class="flex h-full flex-1 flex-col overflow-hidden bg-[var(--background-secondary)]">
            <div class="flex h-11 flex-none items-center justify-between border-b border-[var(--apple-border)] px-4">
                <div class="flex min-w-0 items-center gap-2">
                    <button
                        v-if="!isSidebarOpen"
                        @click="toggleSidebar"
                        type="button"
                        class="inline-flex appearance-none items-center justify-center rounded-md border-0 bg-transparent p-2 text-[var(--text-muted)] shadow-none outline-none transition-all duration-150 hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] hover:shadow-sm active:scale-95 focus:outline-none focus:ring-0"
                        style="border: none; box-shadow: none;"
                        title="Open Sidebar"
                    >
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                     </svg>
                    </button>

                    <div class="inline-flex min-w-0 items-center gap-1 overflow-hidden select-none">
                        <span class="truncate text-xs font-medium text-[var(--text-muted)]">
                            Conversation
                        </span>
                        <svg class="h-3 w-3 shrink-0 text-[var(--text-faint)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M6 3.5L10.5 8L6 12.5"></path>
                        </svg>
                        <div v-if="selectedPromptLabel" class="group inline-flex min-w-0 items-center gap-1 overflow-hidden">
                            <span
                                class="truncate text-xs font-medium text-[var(--text-normal)] cursor-default"
                                :title="selectedPromptLabel"
                                @click="clearCurrentConversation"
                            >
                                {{ selectedPromptLabel }}
                            </span>
                            <button
                                type="button"
                                class="inline-flex h-4 w-4 shrink-0 appearance-none items-center justify-center border-0 bg-transparent p-0 text-[var(--text-muted)] opacity-0 shadow-none outline-none transition-opacity duration-150 group-hover:opacity-100 focus:outline-none focus:ring-0"
                                style="border: none;"
                                title="Clear conversation"
                                @click="clearCurrentConversation"
                            >
                                <div class="flex h-4 w-4 items-center justify-center rounded-none transition-all duration-150 hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] hover:shadow-sm">
                                    <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" aria-hidden="true">
                                        <path d="M4.5 4.5l7 7"></path>
                                        <path d="M11.5 4.5l-7 7"></path>
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">
                    Workspace
                </div>
            </div>

            <div class="min-h-0 flex-1 overflow-hidden">
                <AICard :plugin="plugin" :overlay-target="overlayRootRef"/>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import AICard from "./AICard.vue";
import HeatMap from "./HeatMap.vue";
import DataPanel from "./DataPanel.vue";
import PromptLine from "./PromptLine.vue";
import { computed, ref, onUnmounted } from 'vue';
import { usePluginStore } from "../store/plugin";
import { usePromptStore } from "../store/prompts";
import { storeToRefs } from "pinia";

const props = defineProps<{
    plugin: any
}>();

const pluginStore = usePluginStore();
const promptStore = usePromptStore();
const { isSidebarOpen } = storeToRefs(pluginStore);
const isDashboardCollapsed = ref(false);
const overlayRootRef = ref<HTMLElement | null>(null);

const selectedPromptLabel = computed(() => {
    const prompt = promptStore.historyCard?.prompt?.replace(/\s+/g, ' ').trim();
    if (!prompt) {
        return '';
    }

    return prompt.length > 60 ? `${prompt.slice(0, 60)}...` : prompt;
});

const toggleSidebar = () => {
    pluginStore.toggleSidebar();
};

const toggleDashboardSection = () => {
    isDashboardCollapsed.value = !isDashboardCollapsed.value;
};

const clearCurrentConversation = () => {
    promptStore.updateHistoryCard(null);
};

// 侧边栏宽度控制
const asideWidth = ref(260); // 默认宽度稍微调大一点
const collapsedAsideWidth = 0;
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

