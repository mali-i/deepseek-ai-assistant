<template>
  <div class="space-y-3 pb-2">
    <div v-if="branchRows.length === 0" class="pl-4 text-sm text-[var(--text-muted)] italic">
      No branches found.
    </div>

    <div
      v-for="row in branchRows"
      :key="row.key"
      class="relative"
      :style="{ paddingLeft: `${row.depth * 18}px` }"
    >
      <div
        v-if="row.depth > 0"
        class="absolute top-0 bottom-0 w-px bg-[var(--background-modifier-border)]/70"
        :style="{ left: `${(row.depth - 1) * 18 + 6}px` }"
      ></div>
      <div
        v-if="row.depth > 0"
        class="absolute h-px bg-[var(--background-modifier-border)]/70"
        :style="{ left: `${(row.depth - 1) * 18 + 6}px`, top: '24px', width: '12px' }"
      ></div>

      <div class="mb-2 flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <button
            v-if="row.kind === 'conversation' && row.hasChildren"
            class="flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--background-modifier-hover)]"
            @click.stop="toggleBranchNode(row.key)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              :style="{ transform: isBranchExpanded(row.key) ? 'rotate(90deg)' : 'rotate(0deg)' }"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <span v-else class="w-5"></span>
          <span class="rounded-full bg-[var(--background-secondary)] px-2 py-0.5 font-semibold text-[var(--text-normal)]">{{ row.order }}</span>
          <span>{{ formatTime(row.timestamp) }}</span>
        </div>

        <div class="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <span v-if="row.kind === 'follow-up'" class="rounded-full border border-dashed border-[var(--background-modifier-border)] px-2 py-0.5">Follow-up</span>
          <span v-else-if="row.sourceConversationId" class="rounded-full border border-[var(--background-modifier-border)] px-2 py-0.5">Branch</span>
          <span v-else class="rounded-full border border-[var(--background-modifier-border)] px-2 py-0.5">Root</span>
          <span v-if="row.extraRefsCount > 0" class="rounded-full border border-[var(--background-modifier-border)] px-2 py-0.5">Refs {{ row.extraRefsCount }}</span>
        </div>
      </div>

      <div
        class="prompt-content rounded-xl border p-3 transition-all duration-200"
        :class="row.kind === 'follow-up'
          ? 'border-dashed border-[var(--background-modifier-border)] bg-[var(--background-secondary)]'
          : 'cursor-pointer border-[var(--background-modifier-border)] bg-[var(--background-primary)] hover:border-apple-blue hover:shadow-sm'"
        @click="row.kind === 'conversation' ? clickItem(row.item as Conversation) : undefined"
      >
        <div class="font-sans text-[13px] leading-relaxed text-[var(--text-normal)] line-clamp-4">
          {{ row.kind === 'conversation' ? (row.item as Conversation).prompt : (row.item as FollowUpConversation).question }}
        </div>
        <div v-if="row.kind === 'follow-up'" class="mt-2 text-xs leading-relaxed text-[var(--text-muted)] line-clamp-2">
          From selection: {{ (row.item as FollowUpConversation).source_selection }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePromptStore } from '../store/prompts'
import type { Conversation, FollowUpConversation } from '../settings'

interface BranchNode {
  key: string;
  kind: 'conversation' | 'follow-up';
  timestamp: number;
  item: Conversation | FollowUpConversation;
  sourceConversationId?: string;
  extraRefsCount: number;
  children: BranchNode[];
}

interface ConversationTreeNode {
  conversation: Conversation;
  children: ConversationTreeNode[];
}

interface BranchRow {
  key: string;
  kind: 'conversation' | 'follow-up';
  depth: number;
  order: number;
  timestamp: string;
  item: Conversation | FollowUpConversation;
  sourceConversationId?: string;
  extraRefsCount: number;
  hasChildren: boolean;
}

const promptStore = usePromptStore()
const collapsedBranchNodes = ref<Record<string, boolean>>({});

const selectedPromptStats = computed(() => {
  const promptStats = promptStore.promptStats
  return promptStats[promptStore.selectedDate]
})

const currentDatePrompts = computed<Conversation[]>(() => {
  return selectedPromptStats.value?.prompt_content ? [...selectedPromptStats.value.prompt_content] : [];
})

const currentDatePromptIds = computed(() => {
  return new Set(currentDatePrompts.value.map((item) => item.id_timestamp));
})

const currentDateFollowUpConversations = computed<FollowUpConversation[]>(() => {
  return (promptStore.followUpConversations || []).filter((item: FollowUpConversation) => {
    return item.created_at.startsWith(promptStore.selectedDate) || currentDatePromptIds.value.has(item.source_conversation_id);
  });
})

const branchRows = computed<BranchRow[]>(() => {
  if (!currentDateFollowUpConversations.value.length) {
    return [];
  }

  const nodesById = new Map<string, BranchNode>();
  const conversationTreeById = new Map<string, ConversationTreeNode>();
  const conversationRoots: ConversationTreeNode[] = [];
  const roots: BranchNode[] = [];

  currentDatePrompts.value.forEach((item) => {
    nodesById.set(item.id_timestamp, {
      key: `conversation-${item.id_timestamp}`,
      kind: 'conversation',
      timestamp: Number(item.id_timestamp),
      item,
      sourceConversationId: item.source_conversation_id,
      extraRefsCount: Math.max((item.context_refs?.length || 0) - (item.source_conversation_id ? 1 : 0), 0),
      children: [],
    });

    conversationTreeById.set(item.id_timestamp, {
      conversation: item,
      children: [],
    });
  });

  currentDatePrompts.value.forEach((item) => {
    const parentId = item.source_conversation_id;
    const treeNode = conversationTreeById.get(item.id_timestamp)!;
    if (parentId && parentId !== item.id_timestamp && conversationTreeById.has(parentId)) {
      conversationTreeById.get(parentId)!.children.push(treeNode);
      return;
    }
    conversationRoots.push(treeNode);
  });

  const followUpSourceIds = new Set(currentDateFollowUpConversations.value.map((item) => item.source_conversation_id));

  const collectConversationBranch = (treeNode: ConversationTreeNode): BranchNode | null => {
    const childBranches = treeNode.children
      .map((child) => collectConversationBranch(child))
      .filter((child): child is BranchNode => Boolean(child));

    const conversationNode = nodesById.get(treeNode.conversation.id_timestamp)!;
    conversationNode.children = childBranches;

    if (followUpSourceIds.has(treeNode.conversation.id_timestamp) || childBranches.length > 0) {
      return conversationNode;
    }

    return null;
  };

  conversationRoots.forEach((treeNode) => {
    const branchRoot = collectConversationBranch(treeNode);
    if (branchRoot) {
      roots.push(branchRoot);
    }
  });

  currentDateFollowUpConversations.value.forEach((item) => {
    const followUpNode: BranchNode = {
      key: `follow-up-${item.id}`,
      kind: 'follow-up',
      timestamp: Date.parse(item.created_at),
      item,
      sourceConversationId: item.source_conversation_id,
      extraRefsCount: 0,
      children: [],
    };

    const parentNode = nodesById.get(item.source_conversation_id);
    if (parentNode) {
      parentNode.children.push(followUpNode);
    }
  });

  const sortNodes = (items: BranchNode[]) => {
    items.sort((left, right) => left.timestamp - right.timestamp);
    items.forEach((item) => sortNodes(item.children));
  };

  sortNodes(roots);

  let order = 0;
  const rows: BranchRow[] = [];
  const walk = (node: BranchNode, depth: number) => {
    order += 1;
    rows.push({
      key: node.key,
      kind: node.kind,
      depth,
      order,
      timestamp: node.kind === 'conversation' ? (node.item as Conversation).id_timestamp : (node.item as FollowUpConversation).created_at,
      item: node.item,
      sourceConversationId: node.sourceConversationId,
      extraRefsCount: node.extraRefsCount,
      hasChildren: node.children.length > 0,
    });

    if (node.children.length > 0 && !collapsedBranchNodes.value[node.key]) {
      node.children.forEach((child) => walk(child, depth + 1));
    }
  };

  roots.forEach((item) => walk(item, 0));
  return rows;
})

const formatTime = (timestamp: string) => {
  try {
    const date = !isNaN(Number(timestamp)) ? new Date(Number(timestamp)) : new Date(timestamp);

    if (isNaN(date.getTime())) {
      return '无效时间';
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${year}/${month}/${day} ${time}`;
  } catch (error) {
    return '无效时间';
  }
}

const isBranchExpanded = (key: string) => {
  return !collapsedBranchNodes.value[key];
}

const toggleBranchNode = (key: string) => {
  collapsedBranchNodes.value = {
    ...collapsedBranchNodes.value,
    [key]: !collapsedBranchNodes.value[key],
  };
}

const clickItem = (item: Conversation) => {
  promptStore.updateHistoryCard(item)
}
</script>