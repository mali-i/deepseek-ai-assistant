// 旧版单条对话条目类型（用于历史归档与迁移）
export interface LegacyPrompt {
    id_timestamp: string;
    prompt: string;
    answer: string;
}

// 旧版日期分组结构（用于历史归档与迁移）
export interface DateData {
    num: number;
    prompt_content: LegacyPrompt[];
}

// 旧版完整数据结构 (日期为动态键名)
export interface DataStructure {
    [date: string]: DateData;
}

// 新版单条会话消息
export interface ConversationMessage {
    id: string;
    timestamp: number;
    role: "user" | "assistant";
    content: string;
    model?: string;
}

// 新版会话（话题）
export interface Conversation {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: ConversationMessage[];
    model: string;
    messageCount: number;
}

export interface SettingsInterfaceType {
    API_KEY: string;
    API_URL: string;
    SYSTEM_PROMPT: string;
    DEFAULT_MODEL: string;
    MODEL_OPTIONS: string[];

    // 新版数据结构
    conversations: Conversation[];
    currentConversationId: string | null;

    // 保留旧版数据作为归档
    promptStats: DataStructure;
}

export const DEFAULT_SETTINGS: SettingsInterfaceType = {
    API_KEY: "",
    API_URL: "https://api.deepseek.com",
    SYSTEM_PROMPT: "你是一个AI助手，请根据用户的问题给出回答",
    DEFAULT_MODEL: "deepseek-reasoner",
    MODEL_OPTIONS: ["deepseek-reasoner", "deepseek-chat"],
    conversations: [],
    currentConversationId: null,
    promptStats: {}
};
