<template>
  <div class="flex flex-col h-full bg-transparent overflow-hidden" @click="clearSelection">
    <div class="flex-none px-4 pt-2 pb-2">
      <div class="flex items-center gap-2 h-8">
        <div v-if="!isSearchActive" class="ml-1 flex flex-1 items-center gap-1 overflow-hidden select-none">
          <span class="inline-flex items-center rounded-full bg-[var(--background-modifier-hover)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Date
          </span>
          <!-- “>”符号 -->
          <!-- <svg class="h-3 w-3 shrink-0 text-[var(--text-faint)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3.5L10.5 8L6 12.5"></path>
          </svg> -->
          <span class="truncate rounded-full border border-[var(--background-modifier-border)]px-2.5 py-1 text-[11px] font-medium text-[var(--text-normal)]">
            {{ selectedDate }}
          </span>
        </div>

        <div
          v-else
          class="flex-1 flex items-center bg-[var(--background-modifier-form-field)] rounded-md px-2 py-1 animate-in fade-in slide-in-from-right-2 duration-200 transition-all"
          :style="{
            border: isInputFocused ? '1px solid #007AFF' : '1px solid var(--background-modifier-border)',
            boxShadow: isInputFocused ? '0 0 0 1px #007AFF' : 'none'
          }"
        >
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="w-full bg-transparent border-none p-0 text-sm text-[var(--text-normal)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0"
            placeholder="Search prompts..."
            @keydown.esc="closeSearch"
            @blur="handleBlur"
            @focus="isInputFocused = true"
          />
        </div>

        <button
          @click="toggleSearch"
          class="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] transition-colors"
          :class="{'bg-[var(--background-modifier-hover)] text-[var(--text-normal)]': isSearchActive}"
          title="Search"
        >
          <svg v-if="!isSearchActive" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
      <div class="pl-2">
        <div class="relative ml-2 space-y-6 pb-2">
          <div v-if="sortedPromptContent.length === 0" class="pl-6 text-sm text-[var(--text-muted)] italic">
            No prompts found.
          </div>
          <div
            v-for="(item, index) in sortedPromptContent"
            :key="item.id_timestamp"
            class="relative pl-6 group"
          >
            <div v-if="index !== sortedPromptContent.length - 1" class="absolute left-0 top-3 h-[calc(100%+24px)] w-[2px] bg-[var(--background-modifier-border)]"></div>
            <div class="absolute -left-[4.5px] top-3 w-[11px] h-[11px] rounded-full bg-[#007AFF]/50 border-2 border-[#007AFF]/50 group-hover:scale-125 group-hover:shadow-[0_0_0_3px_rgba(0,122,255,0.2)] transition-all duration-200 z-10"></div>

            <div class="flex justify-between items-center mb-2">
              <div class="font-sans text-xs text-[var(--text-muted)] select-none group-hover:text-[#007AFF] transition-colors duration-200">
                {{ formatTime(item.id_timestamp) }}
              </div>

              <button
                @click.stop="copyLink(item)"
                class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--background-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-all duration-200"
                title="Copy Link to Note"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </button>
            </div>

            <div class="prompt-content bg-[var(--background-primary)] rounded-lg p-3 cursor-pointer transition-all duration-300 border border-[var(--background-modifier-border)] select-text group-hover:border-apple-blue group-hover:shadow-md group-active:border-apple-blue group-active:shadow-lg relative" @click="clickItem(item)">
              <div class="font-sans text-[13px] leading-relaxed text-[var(--text-normal)] line-clamp-3 group-hover:line-clamp-none overflow-hidden select-text transition-all duration-300">{{ item.prompt }}</div>
              <div
                v-if="item.source_selection"
                class="mt-3 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 py-2 transition-colors hover:border-apple-blue hover:bg-[var(--background-modifier-hover)]"
                @click.stop="clickSourceSelection(item)"
              >
                <!-- <div class="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Selected excerpt
                </div> -->
                <div class="text-xs leading-relaxed text-[var(--text-muted)] line-clamp-3 group-hover:line-clamp-none overflow-hidden transition-all duration-300">
                  {{ item.source_selection }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { Notice } from 'obsidian';
import { usePromptStore } from '../store/prompts'
import type { Conversation } from '../settings'

const isInputFocused = ref(false);
const promptStore = usePromptStore()

defineProps<{
  plugin: any
}>();

const isSearchActive = ref(false);
const searchQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  if (searchInputRef.value) {
    searchInputRef.value.focus();
  }
});

const selectedDate = computed(() => {
  if (!promptStore.selectedDate) return '';
  const date = new Date(promptStore.selectedDate);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
})

const selectedPromptStats = computed(() => {
  const promptStats = promptStore.promptStats
  return promptStats[promptStore.selectedDate]
})

const sortedPromptContent = computed(() => {
  let content: Conversation[] = [];

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    const allStats = promptStore.promptStats;

    if (allStats) {
      Object.keys(allStats).forEach((date) => {
        const dayStats = allStats[date];
        if (dayStats && dayStats.prompt_content) {
          const matches = dayStats.prompt_content.filter((item: Conversation) => {
            return item.prompt && item.prompt.toLowerCase().includes(query);
          });
          content.push(...matches);
        }
      });
    }
  } else {
    content = selectedPromptStats.value?.prompt_content ? [...selectedPromptStats.value.prompt_content] : [];
  }

  return content.sort((a, b) => Number(b.id_timestamp) - Number(a.id_timestamp))
})

const toggleSearch = () => {
  if (isSearchActive.value) {
    closeSearch();
  } else {
    isSearchActive.value = true;
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
}

const closeSearch = () => {
  isSearchActive.value = false;
  searchQuery.value = '';
  isInputFocused.value = false;
}

const handleBlur = () => {
  isInputFocused.value = false;
  if (!searchQuery.value) {
    isSearchActive.value = false;
  }
}

const formatTime = (timestamp: string, forceFull = false) => {
  try {
    const date = !isNaN(Number(timestamp)) ? new Date(Number(timestamp)) : new Date(timestamp);

    if (isNaN(date.getTime())) {
      return '无效时间';
    }

    if (forceFull || searchQuery.value.trim()) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${year}/${month}/${day} ${time}`;
    }

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '无效时间';
  }
}

const clickItem = (item: Conversation) => {
  promptStore.updateHistoryCard(item)
}

const clickSourceSelection = (item: Conversation) => {
  if (!item.source_conversation_id) {
    return;
  }

  promptStore.findAndSelectPromptById(item.source_conversation_id)
}

const copyLink = (item: Conversation) => {
  let linkText = 'AI Chat';
  if (item && item.prompt) {
    const promptText = item.prompt.replace(/[\r\n]+/g, ' ').trim();
    linkText = promptText.length > 30 ? promptText.substring(0, 30) + '...' : promptText;
    linkText = linkText.replace(/[\[\]]/g, '');
  }
  const link = `[${linkText}](obsidian://deepseek-ai-assistant?id=${item.id_timestamp} "Open plugin:deepseek-ai-assistant")`;
  navigator.clipboard.writeText(link);
  new Notice('Chat link copied to clipboard!');
}

const clearSelection = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input') || target.closest('button')) {
    return;
  }

  if (!target.closest('.prompt-content')) {
    window.getSelection()?.removeAllRanges();
  }
}
</script>