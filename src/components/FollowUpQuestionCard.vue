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
            <textarea
                :value="followUpQuestionText"
                class="min-h-[88px] w-full resize-none rounded-xl border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-sm leading-relaxed text-[var(--text-normal)] outline-none transition-colors focus:border-apple-blue"
                placeholder="Capture the next question from this answer..."
                @input="$emit('update:followUpQuestionText', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
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
import { computed } from 'vue';

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
}>();

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

defineEmits<{
    open: [];
    close: [];
    send: [];
    'update:followUpQuestionText': [value: string];
}>();
</script>