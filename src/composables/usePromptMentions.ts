import { computed, nextTick, ref, watch, type Ref } from 'vue';
import type { Conversation } from '../settings';

interface MentionState {
    query: string;
    start: number;
    end: number;
}

interface MentionMenuPosition {
    top: number;
    left: number;
    maxWidth: number;
}

interface UsePromptMentionsOptions {
    inputContent: Ref<string>;
    textareaRef: Ref<HTMLTextAreaElement | null>;
    todayPromptItems: Ref<Conversation[]>;
    selectedReferences: Ref<Conversation[]>;
}

export const buildPromptPreview = (text: string, maxLength = 36) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return 'Untitled prompt';
    }

    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

export function usePromptMentions({
    inputContent,
    textareaRef,
    todayPromptItems,
    selectedReferences,
}: UsePromptMentionsOptions) {
    const mentionState = ref<MentionState | null>(null);
    const activeMentionIndex = ref(0);
    const mentionMenuPosition = ref<MentionMenuPosition | null>(null);

    const filteredTodayPrompts = computed<Conversation[]>(() => {
        if (!mentionState.value) {
            return [];
        }

        const query = mentionState.value.query.trim().toLowerCase();
        return todayPromptItems.value.filter((item) => {
            if (selectedReferences.value.some((selected) => selected.id_timestamp === item.id_timestamp)) {
                return false;
            }

            if (!query) {
                return true;
            }

            return item.prompt.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query);
        });
    });

    const showMentionMenu = computed(() => Boolean(mentionState.value));

    const emptyMentionText = computed(() => {
        if (!mentionState.value) {
            return '';
        }

        if (!todayPromptItems.value.length) {
            return 'Today has no history conversations yet.';
        }

        return mentionState.value.query.trim()
            ? 'No matching history conversations found for the current @ search.'
            : 'No remaining history conversations are available to be selected.';
    });

    const mentionMenuStyle = computed(() => {
        if (!mentionMenuPosition.value) {
            return {
                left: '16px',
                top: '0px',
                width: '360px',
                maxWidth: 'calc(100% - 32px)',
                transform: 'translateY(calc(-100% - 4px))',
            };
        }

        return {
            left: `${mentionMenuPosition.value.left}px`,
            top: `${mentionMenuPosition.value.top}px`,
            width: '360px',
            maxWidth: `${mentionMenuPosition.value.maxWidth}px`,
            transform: 'translateY(calc(-100% - 4px))',
        };
    });

    const clearMentionState = () => {
        mentionState.value = null;
        activeMentionIndex.value = 0;
        mentionMenuPosition.value = null;
    };

    const getTextareaCaretCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
        const computedStyle = window.getComputedStyle(textarea);
        const mirror = document.createElement('div');
        const propertiesToCopy = [
            'boxSizing',
            'width',
            'height',
            'overflowX',
            'overflowY',
            'borderTopWidth',
            'borderRightWidth',
            'borderBottomWidth',
            'borderLeftWidth',
            'paddingTop',
            'paddingRight',
            'paddingBottom',
            'paddingLeft',
            'fontStyle',
            'fontVariant',
            'fontWeight',
            'fontStretch',
            'fontSize',
            'fontSizeAdjust',
            'lineHeight',
            'fontFamily',
            'textAlign',
            'textTransform',
            'textIndent',
            'textDecoration',
            'letterSpacing',
            'wordSpacing',
            'tabSize',
            'MozTabSize',
        ] as const;

        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';
        mirror.style.overflow = 'hidden';
        mirror.style.top = '0';
        mirror.style.left = '-9999px';

        propertiesToCopy.forEach((property) => {
            mirror.style[property as any] = computedStyle[property as any];
        });

        mirror.textContent = textarea.value.slice(0, position);

        const marker = document.createElement('span');
        marker.textContent = textarea.value.slice(position) || '.';
        mirror.appendChild(marker);
        document.body.appendChild(mirror);

        const coordinates = {
            left: marker.offsetLeft - textarea.scrollLeft,
            top: marker.offsetTop - textarea.scrollTop,
            lineHeight: parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.4,
        };

        document.body.removeChild(mirror);
        return coordinates;
    };

    const updateMentionMenuPosition = () => {
        const textarea = textareaRef.value;
        if (!textarea || !mentionState.value) {
            mentionMenuPosition.value = null;
            return;
        }

        const container = textarea.parentElement;
        if (!container) {
            mentionMenuPosition.value = null;
            return;
        }

        const caret = getTextareaCaretCoordinates(textarea, mentionState.value.end);
        const horizontalPadding = 16;
        const preferredWidth = 360;
        const availableWidth = Math.max(240, container.clientWidth - horizontalPadding * 2);
        const popupWidth = Math.min(preferredWidth, availableWidth);
        const maxLeft = Math.max(horizontalPadding, container.clientWidth - popupWidth - horizontalPadding);
        const caretLeft = textarea.offsetLeft + caret.left;
        const caretTop = textarea.offsetTop + caret.top;

        mentionMenuPosition.value = {
            left: Math.min(Math.max(caretLeft, horizontalPadding), maxLeft),
            top: caretTop,
            maxWidth: availableWidth,
        };
    };

    const updateMentionState = () => {
        const textarea = textareaRef.value;
        if (!textarea) {
            clearMentionState();
            return;
        }

        const caretIndex = textarea.selectionStart ?? inputContent.value.length;
        const contentBeforeCaret = inputContent.value.slice(0, caretIndex);
        const match = contentBeforeCaret.match(/(^|\s)@([^\s@]*)$/);

        if (!match) {
            clearMentionState();
            return;
        }

        const leadingPart = match[1] || '';
        const tokenStart = contentBeforeCaret.length - match[0].length + leadingPart.length;

        mentionState.value = {
            query: match[2] || '',
            start: tokenStart,
            end: caretIndex,
        };

        nextTick(updateMentionMenuPosition);
    };

    const handleCaretChange = () => {
        updateMentionState();
    };

    const selectMention = async (item: Conversation) => {
        if (!mentionState.value) {
            return;
        }

        if (!selectedReferences.value.some((selected) => selected.id_timestamp === item.id_timestamp)) {
            selectedReferences.value = [...selectedReferences.value, item];
        }

        const before = inputContent.value.slice(0, mentionState.value.start);
        const after = inputContent.value.slice(mentionState.value.end);
        const needsSpace = after.length > 0 && !after.startsWith(' ') && !before.endsWith(' ') ? ' ' : '';
        inputContent.value = `${before}${needsSpace}${after}`;
        clearMentionState();

        await nextTick();

        const nextCaret = before.length + needsSpace.length;
        textareaRef.value?.focus();
        textareaRef.value?.setSelectionRange(nextCaret, nextCaret);
        updateMentionMenuPosition();
    };

    const removeReference = (id: string) => {
        selectedReferences.value = selectedReferences.value.filter((item) => item.id_timestamp !== id);
    };

    const handleMentionKeydown = (event: KeyboardEvent) => {
        if (!showMentionMenu.value) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeMentionIndex.value = (activeMentionIndex.value + 1) % filteredTodayPrompts.value.length;
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeMentionIndex.value = (activeMentionIndex.value - 1 + filteredTodayPrompts.value.length) % filteredTodayPrompts.value.length;
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const activeItem = filteredTodayPrompts.value[activeMentionIndex.value];
            if (activeItem) {
                void selectMention(activeItem);
            }
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            clearMentionState();
        }
    };

    watch(filteredTodayPrompts, (items) => {
        if (!items.length) {
            activeMentionIndex.value = 0;
            return;
        }

        if (activeMentionIndex.value >= items.length) {
            activeMentionIndex.value = 0;
        }

        nextTick(updateMentionMenuPosition);
    });

    watch(showMentionMenu, (visible) => {
        if (!visible) {
            mentionMenuPosition.value = null;
            return;
        }

        nextTick(updateMentionMenuPosition);
    });

    return {
        mentionState,
        activeMentionIndex,
        mentionMenuPosition,
        filteredTodayPrompts,
        showMentionMenu,
        emptyMentionText,
        mentionMenuStyle,
        clearMentionState,
        updateMentionMenuPosition,
        updateMentionState,
        handleCaretChange,
        selectMention,
        removeReference,
        handleMentionKeydown,
    };
}