<script setup lang="ts">
import { computed} from 'vue';
import { usePromptStore } from '../store/prompts';
import { Notice, WorkspaceLeaf } from 'obsidian';

const promptStore = usePromptStore();

const props = defineProps<{
    plugin: any
}>();

// 统计总prompts数量
const totalPrompts = computed(() => {
   if (!promptStore.promptStats) return 0;
   let total = 0;
   const stats = promptStore.promptStats;
   if (!stats || typeof stats !== 'object') return 0;
   for (const day in stats) {
      if (stats[day]?.prompt_content) {
         total += stats[day].prompt_content.length;
      }
   }
   return total;
});

// 统计有AI处理的天数
const aiDays = computed(() => {
   if (!promptStore.promptStats) return 0;
   const stats = promptStore.promptStats;
   if (!stats || typeof stats !== 'object') return 0;
   return Object.keys(stats).length;
});

const onTotalPromptsClick = async () => {
   // 这里可以自定义点击后的行为
   new Notice(`Total Prompts: ${totalPrompts.value}`);
   
};

</script>

<template>
   <div class="w-full px-4 py-2">
      <div class="flex justify-between items-center bg-[var(--background-secondary)] rounded-lg px-3 py-2 border border-[var(--apple-border)] shadow-sm">
         <div class="flex flex-col items-center flex-1 border-r border-[var(--apple-border)] cursor-pointer hover:bg-[var(--apple-bg-secondary)] transition-colors rounded-l-md py-0.5 gap-1" @click="onTotalPromptsClick">
            <span class="inline-flex items-center rounded-full bg-[var(--background-modifier-hover)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Prompts</span>
            <b class="text-lg font-semibold leading-none text-[var(--text-normal)]">{{ totalPrompts }}</b>
         </div>
         <div class="flex flex-col items-center flex-1 cursor-default py-0.5 gap-1">
            <span class="inline-flex items-center rounded-full bg-[var(--background-modifier-hover)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Days</span>
            <b class="text-lg font-semibold leading-none text-[var(--text-normal)]">{{ aiDays }}</b>
         </div>
      </div>
   </div>
</template>