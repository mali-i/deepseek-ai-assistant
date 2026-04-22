<template>
    <Teleport :to="overlayTarget || 'body'" :disabled="!overlayTarget">
        <div
            v-if="selectionAction"
            ref="rootRef"
            class="absolute z-[1000]"
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
            <div class="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Follow-up Questions</div>
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
                <div ref="mentionMenuListRef" class="mention-menu-scroll h-56 overflow-y-auto overflow-x-auto py-0.5">
                    <button
                        v-for="(item, index) in filteredTodayPrompts"
                        :key="item.id_timestamp"
                        type="button"
                        :data-mention-index="index"
                        class="flex w-full min-w-0 appearance-none flex-col items-start gap-0.5 border-0 bg-transparent px-3 py-1.5 text-left shadow-none transition-colors"
                        :class="index === activeMentionIndex ? 'bg-[var(--background-modifier-hover)]' : 'hover:bg-[var(--background-modifier-hover)]'"
                        @mousedown.prevent="selectMention(item)"
                    >
                        <div class="flex w-full min-w-0 flex-col items-start gap-0.5 text-left">
                            <span class="block w-full break-words text-[13px] leading-5 text-[var(--text-normal)]">{{ buildPromptPreview(item.prompt, 80) }}</span>
                        </div>
                        <div class="w-full break-words text-left text-[11px] leading-4 text-[var(--text-muted)] line-clamp-2">{{ item.answer }}</div>
                    </button>
                    <div v-if="!filteredTodayPrompts.length" class="px-3 py-3 text-left text-sm text-[var(--text-muted)] break-words">
                        {{ emptyMentionText }}
                    </div>
                </div>
            </div>
            <div class="mt-3 flex items-center gap-2">
                <div class="relative min-w-0 flex-1">
                    <select
                        :value="selectedModelId"
                        class="w-full appearance-none rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-1.5 pr-8 text-xs font-medium text-[var(--text-normal)] outline-none transition-colors focus:border-apple-blue"
                        @change="emit('update:selectedModelId', ($event.target as HTMLSelectElement).value)"
                    >
                        <option
                            v-for="model in availableModels"
                            :key="model.id"
                            :value="model.id"
                        >
                            {{ model.name }}
                        </option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-muted)]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 9l6 6 6-6"></path>
                        </svg>
                    </div>
                </div>
                <button
                    class="rounded-lg bg-apple-blue px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
                    @click.stop="$emit('send')"
                >
                    Ask now
                </button>
            </div>
        </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, Teleport } from 'vue';
import type { Conversation, ModelConfig } from '../settings';
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
    availableModels: ModelConfig[];
    selectedModelId: string;
    overlayTarget?: HTMLElement | null;
}>();

const rootRef = ref<HTMLElement | null>(null);
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
    mentionMenuListRef,
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
    'update:selectedModelId': [value: string];
}>();

let isDocumentPointerDownBound = false;

const handleDocumentPointerDown = (event: MouseEvent) => {
    if (!props.selectionAction) {
        return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
        return;
    }

    if (rootRef.value?.contains(target)) {
        return;
    }

    emit('close');
};

const bindDocumentPointerDown = () => {
    if (isDocumentPointerDownBound) {
        return;
    }

    document.addEventListener('mousedown', handleDocumentPointerDown, true);
    isDocumentPointerDownBound = true;
};

const unbindDocumentPointerDown = () => {
    if (!isDocumentPointerDownBound) {
        return;
    }

    document.removeEventListener('mousedown', handleDocumentPointerDown, true);
    isDocumentPointerDownBound = false;
};

watch(
    () => props.selectionAction,
    (value) => {
        if (value) {
            bindDocumentPointerDown();
            return;
        }

        unbindDocumentPointerDown();
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    unbindDocumentPointerDown();
});
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