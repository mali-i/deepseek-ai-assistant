import { computed, nextTick, onBeforeUnmount, ref, watch, type CSSProperties, type Ref } from 'vue';
import type { Conversation } from '../settings';

interface MentionState {
    query: string;
    start: number;
    end: number;
}

interface MentionMenuPosition {
    top: number;
    left: number;
    width: number;
    maxWidth: number;
}

interface UsePromptMentionsOptions {
    inputContent: Ref<string>;
    textareaRef: Ref<HTMLTextAreaElement | null>;
    todayPromptItems: Ref<Conversation[]>;
    selectedReferences: Ref<Conversation[]>;
    overlayTarget?: Ref<HTMLElement | null | undefined>;
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
    overlayTarget,
}: UsePromptMentionsOptions) {
    const mentionState = ref<MentionState | null>(null);
    const activeMentionIndex = ref(0);
    const mentionMenuPosition = ref<MentionMenuPosition | null>(null);
    const mentionMenuRootRef = ref<HTMLElement | null>(null);
    const mentionMenuListRef = ref<HTMLElement | null>(null);

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

    const mentionMenuStyle = computed<CSSProperties>(() => {
        if (!mentionMenuPosition.value) {
            return {
                left: '16px',
                top: '16px',
                width: '360px',
                maxWidth: 'calc(100% - 32px)',
                position: 'absolute',
            };
        }

        return {
            left: `${mentionMenuPosition.value.left}px`,
            top: `${mentionMenuPosition.value.top}px`,
            width: `${mentionMenuPosition.value.width}px`,
            maxWidth: `${mentionMenuPosition.value.maxWidth}px`,
            position: 'absolute',
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

        const positionRoot = overlayTarget?.value ?? textarea.parentElement;
        if (!positionRoot) {
            mentionMenuPosition.value = null;
            return;
        }

        const rootRect = positionRoot.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        const caret = getTextareaCaretCoordinates(textarea, mentionState.value.end);
        const textareaStyle = window.getComputedStyle(textarea);
        const horizontalPadding = 16;
        const verticalPadding = 16;
        const verticalGap = 6;
        const preferredWidth = 360;
        const preferredMenuHeight = 260;
        const resolvedLineHeight = Number.parseFloat(textareaStyle.lineHeight);
        const fallbackLineHeight = Number.parseFloat(textareaStyle.fontSize) * 1.4 || 20;
        const caretLineHeight = Number.isFinite(resolvedLineHeight) ? resolvedLineHeight : fallbackLineHeight;
        const availableWidth = Math.max(240, rootRect.width - horizontalPadding * 2);
        const popupWidth = Math.min(preferredWidth, availableWidth);
        const maxLeft = Math.max(horizontalPadding, rootRect.width - popupWidth - horizontalPadding);
        const caretLeft = textareaRect.left - rootRect.left + caret.left;
        const caretTop = textareaRect.top - rootRect.top + caret.top;
        const spaceAbove = caretTop - verticalPadding;
        const spaceBelow = rootRect.height - (caretTop + caretLineHeight) - verticalPadding;
        const shouldPlaceAbove = spaceAbove >= preferredMenuHeight + verticalGap
            || (spaceAbove > spaceBelow && spaceBelow < preferredMenuHeight + verticalGap);
        const top = shouldPlaceAbove
            ? Math.max(caretTop - preferredMenuHeight - verticalGap, verticalPadding)
            : Math.min(caretTop + caretLineHeight + verticalGap, rootRect.height - preferredMenuHeight - verticalPadding);

        mentionMenuPosition.value = {
            left: Math.min(Math.max(caretLeft, horizontalPadding), maxLeft),
            top,
            width: popupWidth,
            maxWidth: availableWidth,
        };
    };

    const handleViewportChange = () => {
        updateMentionMenuPosition();
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

    const scrollActiveMentionIntoView = () => {
        const list = mentionMenuListRef.value;
        if (!list || !filteredTodayPrompts.value.length) {
            return;
        }

        const activeItem = list.querySelector<HTMLElement>(`[data-mention-index="${activeMentionIndex.value}"]`);
        activeItem?.scrollIntoView({ block: 'nearest' });
    };

    const handleMentionKeydown = (event: KeyboardEvent) => {
        if (!showMentionMenu.value) {
            return;
        }

        const itemCount = filteredTodayPrompts.value.length;

        if (event.key === 'ArrowDown') {
            if (!itemCount) {
                return;
            }

            event.preventDefault();
            activeMentionIndex.value = (activeMentionIndex.value + 1) % itemCount;
            return;
        }

        if (event.key === 'ArrowUp') {
            if (!itemCount) {
                return;
            }

            event.preventDefault();
            activeMentionIndex.value = (activeMentionIndex.value - 1 + itemCount) % itemCount;
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
        nextTick(scrollActiveMentionIntoView);
    });

    watch(activeMentionIndex, () => {
        nextTick(scrollActiveMentionIntoView);
    });

    watch(showMentionMenu, (visible) => {
        if (!visible) {
            mentionMenuPosition.value = null;
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
            return;
        }

        activeMentionIndex.value = 0;
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);
        nextTick(updateMentionMenuPosition);
        nextTick(scrollActiveMentionIntoView);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleViewportChange);
        window.removeEventListener('scroll', handleViewportChange, true);
    });

    return {
        activeMentionIndex,
        filteredTodayPrompts,
        showMentionMenu,
        emptyMentionText,
        mentionMenuStyle,
        mentionMenuRootRef,
        mentionMenuListRef,
        clearMentionState,
        updateMentionState,
        handleCaretChange,
        selectMention,
        removeReference,
        handleMentionKeydown,
    };
}