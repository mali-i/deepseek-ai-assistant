<template>
    <div class="flex h-full flex-col bg-transparent overflow-hidden">
        <div class="flex-none px-4 pt-3 pb-2 border-b border-[var(--apple-border)]">
            <div class="flex items-center justify-between gap-2 mb-2">
                <h3 class="font-sans text-base font-semibold text-[var(--text-normal)] select-none">Conversations</h3>
                <button
                    class="px-2.5 py-1 text-xs rounded-md border border-[var(--apple-border)] hover:bg-[var(--background-modifier-hover)] transition-colors"
                    @click="createConversation"
                >
                    New
                </button>
            </div>
            <input
                v-model="searchQuery"
                type="text"
                class="w-full bg-[var(--background-modifier-form-field)] border border-[var(--background-modifier-border)] rounded-md px-2 py-1.5 text-sm text-[var(--text-normal)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#007AFF]"
                placeholder="Search conversations..."
            />
        </div>

        <div class="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            <div
                v-if="filteredConversations.length === 0"
                class="text-xs text-[var(--text-muted)] px-2 py-3"
            >
                No conversations found.
            </div>

            <div
                v-for="conversation in filteredConversations"
                :key="conversation.id"
                class="group rounded-lg border transition-colors cursor-pointer p-2"
                :class="conversation.id === promptStore.currentConversationId
                    ? 'border-[#007AFF]/50 bg-[#007AFF]/10'
                    : 'border-[var(--background-modifier-border)] hover:border-[var(--apple-border)] hover:bg-[var(--background-modifier-hover)]'"
                @click="selectConversation(conversation.id)"
            >
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <div
                            v-if="editingConversationId === conversation.id"
                            :ref="(el) => setEditableRef(conversation.id, el as HTMLDivElement | null)"
                            class="text-sm font-medium text-[var(--text-normal)] outline-none border border-[#007AFF]/50 rounded px-1 py-0.5 bg-[var(--background-primary)]"
                            contenteditable="true"
                            v-text="editBuffer"
                            @input="onEditInput"
                            @keydown.enter.prevent="commitTitle(conversation.id)"
                            @keydown.esc.prevent="cancelEdit"
                            @blur="commitTitle(conversation.id)"
                        ></div>
                        <div
                            v-else
                            class="text-sm font-medium text-[var(--text-normal)] truncate"
                            :title="conversation.title"
                        >
                            {{ conversation.title || "New chat" }}
                        </div>
                        <div class="mt-1 text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                            <span>{{ conversation.messageCount }} msgs</span>
                            <span>·</span>
                            <span>{{ formatTime(conversation.updatedAt) }}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            class="p-1 rounded hover:bg-[var(--background-primary)] text-[var(--text-muted)] hover:text-[var(--text-normal)]"
                            @click.stop="startEdit(conversation.id, conversation.title)"
                            title="Edit title"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                            </svg>
                        </button>
                        <button
                            class="p-1 rounded hover:bg-[var(--background-primary)] text-[var(--text-muted)] hover:text-red-500"
                            @click.stop="removeConversation(conversation.id)"
                            title="Delete conversation"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14H6L5 6"></path>
                                <path d="M10 11v6"></path>
                                <path d="M14 11v6"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, ref, computed } from "vue";
import { Notice } from "obsidian";
import { usePromptStore } from "../store/prompts";

const promptStore = usePromptStore();
defineProps<{
    plugin: any;
}>();

const searchQuery = ref("");
const editingConversationId = ref<string | null>(null);
const editBuffer = ref("");
const editableRefs = new Map<string, HTMLDivElement>();

const filteredConversations = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) {
        return promptStore.conversations;
    }

    return promptStore.conversations.filter((conversation) => {
        const titleMatch = (conversation.title || "").toLowerCase().includes(query);
        if (titleMatch) {
            return true;
        }
        return (conversation.messages || []).some((message) => (message.content || "").toLowerCase().includes(query));
    });
});

const formatTime = (timestamp: number) => {
    if (!timestamp) {
        return "";
    }
    const date = new Date(timestamp);
    return date.toLocaleString([], {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const setEditableRef = (id: string, element: HTMLDivElement | null) => {
    if (!element) {
        editableRefs.delete(id);
        return;
    }
    editableRefs.set(id, element);
};

const createConversation = async () => {
    await promptStore.createNewConversation();
};

const selectConversation = async (id: string) => {
    if (editingConversationId.value) {
        return;
    }
    await promptStore.selectConversation(id);
};

const startEdit = async (id: string, title: string) => {
    editingConversationId.value = id;
    editBuffer.value = title || "";

    await nextTick();
    const element = editableRefs.get(id);
    if (!element) {
        return;
    }
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
};

const onEditInput = (event: Event) => {
    const target = event.target as HTMLDivElement;
    editBuffer.value = target?.innerText || "";
};

const commitTitle = async (id: string) => {
    if (editingConversationId.value !== id) {
        return;
    }
    await promptStore.updateConversationTitle(id, editBuffer.value);
    editingConversationId.value = null;
};

const cancelEdit = () => {
    editingConversationId.value = null;
};

const removeConversation = async (id: string) => {
    await promptStore.deleteConversation(id);
    new Notice("Conversation deleted");
};
</script>
