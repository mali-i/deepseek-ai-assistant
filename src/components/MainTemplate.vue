<template>
    <el-container>
        <el-aside>
            <HeatMap/>
            <!-- <ContributionsHeatMap/> -->
            <PromptLine :plugin="plugin"/>
        </el-aside>
        <el-main>
            <!-- 拖拽手柄移到这里 -->
            <div 
                class="drag-handle"
                @mousedown.prevent="startDrag"
            ></div>
            <AICard :plugin="plugin"/>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import AICard from "./AICard.vue";
// import ContributionsHeatMap from "./ContributionsHeatMap.vue";
import HeatMap from "./HeatMap.vue";
import PromptLine from "./PromptLine.vue";
import { ref, onUnmounted } from 'vue';

const props = defineProps<{
    plugin: any
}>();

// 侧边栏宽度控制
const asideWidth = ref(220);
const isDragging = ref(false);
let startX = 0;
let startWidth = 0;

// 开始拖拽
const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  startX = e.clientX;
  startWidth = asideWidth.value;

  // 全局事件监听
  window.addEventListener('mousemove', handleDrag);
  window.addEventListener('mouseup', stopDrag);
  
  // 防止文本选中
  document.body.style.userSelect = 'none';
};

// 处理拖拽
const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  const delta = e.clientX - startX;
  const newWidth = startWidth + delta;
  
  // 限制最小宽度
  asideWidth.value = Math.max(150, Math.min(newWidth, 400)); 
};

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false;
  document.body.style.userSelect = '';
  
  // 清理事件
  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('mouseup', stopDrag);
};

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('mouseup', stopDrag);
});

</script>

<style scoped>
.el-container {
    width: 100%;
    height: 100%;
}

.el-aside {
    position: relative;
    width: v-bind(asideWidth + 'px');
    transition: width 0.1s;
    overflow-x: hidden;
    overflow-y: scroll; /* 确保可以滚动 */
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
}

/* Webkit浏览器（Chrome、Safari等）隐藏滚动条 */
.el-aside::-webkit-scrollbar {
    display: none;
}

.el-main {
    position: relative;
    padding-left: 2px !important; /* 减小左侧padding */
}

.el-aside, .el-main {
    overflow-y: auto;
}

/* 拖拽手柄样式 */
.drag-handle {
    position: absolute;
    left: 0;
    top: 0;
    width: 2px; /* 减小手柄宽度 */
    height: 100%;
    background: #dcdfe6;
    cursor: col-resize;
    transition: all 0.1s;
}

.drag-handle:hover, 
.drag-handle:active {
    width: 4px; /* 悬停和拖拽时稍微增加宽度，提供更好的视觉反馈 */
    background: #409eff;
}

.drag-handle:active {
    background: #337ecc;
}

/* 覆盖 Element Plus 默认样式 */
:deep(.el-aside) {
    flex: 0 0 auto !important; /* 禁用默认 flex 行为 */
}

:deep(.el-main) {
    padding: 0 !important; /* 移除默认 padding */
}
</style>
