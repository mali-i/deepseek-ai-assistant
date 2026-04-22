<template>
    <div
        v-if="selectionAction"
        class="absolute z-20"
        :style="floatingStyle"
    >
        <button
            v-if="!isFollowUpComposerOpen"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--apple-border)] bg-[var(--background-primary)] text-[var(--text-normal)] shadow-lg transition-colors hover:border-apple-blue hover:text-apple-blue"
            title="Create follow-up"
            @mousedown.prevent
            @click.stop="$emit('open')"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14"></path>
                <path d="M5 12h14"></path>
            </svg>
        </button>

        <div
            v-else
            class="w-[320px] rounded-2xl border border-[var(--apple-border)] bg-[var(--background-primary)] p-3 shadow-2xl"
            @mousedown.stop
        >
            <div class="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Follow-up branch</div>
            <div class="mb-3 rounded-xl bg-[var(--background-secondary)] px-3 py-2 text-xs text-[var(--text-muted)] line-clamp-3">
                {{ selectionAction.text }}
            </div>
            <div v-if="followUpReferences.length" class="mb-2 flex flex-wrap gap-2">
                <button
                    v-for="item in followUpReferences"
                    :key="item.id_timestamp"
                    class="max-w-full inline-flex items-center gap-2 rounded-lg border border-[var(--apple-border)] bg-[var(--background-primary)] px-3 py-1 text-xs text-[var(--text-normal)] transition-colors hover:border-apple-blue"
                    @click="removeReference(item.id_timestamp)"
                    type="button"
                    :title="item.prompt"
                >
                    <span class="truncate max-w-[220px]">@ {{ buildPromptPreview(item.prompt) }}</span>
                    <span class="text-[var(--text-muted)]">×</span>
                </button>
            </div>
            <textarea
                ref="textareaRef"
                :value="followUpQuestionText"
                class="min-h-[88px] w-full resize-none rounded-xl border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-sm leading-relaxed text-[var(--text-normal)] outline-none transition-colors focus:border-apple-blue"
                placeholder="Capture the next question from this answer..."
                @input="$emit('update:followUpQuestionText', ($event.target as HTMLTextAreaElement).value)"
                @click="handleCaretChange"
                @keyup="handleCaretChange"
                @keydown="handleMentionKeydown"
                @scroll="handleCaretChange"
            ></textarea>
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
            <div class="mt-3 flex items-center justify-end gap-2">
                <button
                    class="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)]"
                    @click.stop="$emit('close')"
                >
                    Cancel
                </button>
                <button
                    class="rounded-lg bg-apple-blue px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
                    @click.stop="$emit('send')"
                >
                    Ask now
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Conversation } from '../settings';
import { buildPromptPreview, usePromptMentions } from '../composables/usePromptMentions';

interface SelectionActionState {
    text: string;
    top: number;
    left: number;
    placement: 'above' | 'below';
}

const props = defineProps<{
    selectionAction: SelectionActionState | null;
    isFollowUpComposerOpen: boolean;
    followUpQuestionText: string;
    followUpReferences: Conversation[];
    todayPromptItems: Conversation[];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

const followUpQuestionTextModel = computed({
    get: () => props.followUpQuestionText,
    set: (value: string) => emit('update:followUpQuestionText', value),
});

const followUpReferencesModel = computed({
    get: () => props.followUpReferences,
    set: (value: Conversation[]) => emit('update:followUpReferences', value),
});

const todayPromptItemsModel = computed(() => props.todayPromptItems);

const {
    activeMentionIndex,
    filteredTodayPrompts,
    showMentionMenu,
    emptyMentionText,
    mentionMenuStyle,
    handleCaretChange,
    selectMention,
    removeReference,
    handleMentionKeydown,
} = usePromptMentions({
    inputContent: followUpQuestionTextModel,
    textareaRef,
    todayPromptItems: todayPromptItemsModel,
    selectedReferences: followUpReferencesModel,
});

const floatingStyle = computed(() => {
    if (!props.selectionAction) {
        return {};
    }

    const isComposer = props.isFollowUpComposerOpen;
    const horizontalPadding = isComposer ? 172 : 24;
    const verticalOffset = isComposer ? 12 : 10;
    const translateY = props.selectionAction.placement === 'above'
        ? `calc(-100% - ${verticalOffset}px)`
        : `${verticalOffset}px`;

    return {
        top: `${props.selectionAction.top}px`,
        left: `clamp(${horizontalPadding}px, ${props.selectionAction.left}px, calc(100% - ${horizontalPadding}px))`,
        transform: `translate(-50%, ${translateY})`,
    };
});

const emit = defineEmits<{
    open: [];
    close: [];
    send: [];
    'update:followUpQuestionText': [value: string];
    'update:followUpReferences': [value: Conversation[]];
}>();
</script>

<style scoped>
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