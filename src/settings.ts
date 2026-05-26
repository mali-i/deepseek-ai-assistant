// 单条对话条目类型
export interface Conversation {
    id_timestamp: string; // 对话id_时间戳，用来唯一指向对话
    prompt: string; // 提问内容
    answer: string; // ai回答内容
    model?: string;
    source_conversation_id?: string; // 所选内容追问的来源回答 id_timestamp
    source_selection?: string; // 从上一轮回答中选中的追问片段
    context_refs?: string[];  // 通过 @ 引用的历史对话 id_timestamp 列表
}
  
  // 日期对应的完整数据
export interface DateData {
    num: number;             // 当日的对话总数量
    prompt_content: Conversation[];   // 对话列表
}
  
  // 完整数据结构类型 (日期为动态键名)
export interface DataStructure {
    [date: string]: DateData;
  }

export interface ModelConfig {
    id: string;          // 内部唯一ID (UUID)
    name: string;        // 显示名称 (如: "My API")
    modelId: string;     // 模型ID (如: "gpt-4", "deepseek-chat")
    apiKey: string;      // 专用 Key
    apiUrl: string;      // 专用 URL
    providerUrl?: string;// 服务商控制台URL (可选)
}

export interface SettingsInterfaceType{
    // 废弃旧的顶层字段，为了类型兼容暂时保留或改为可选，但核心逻辑使用 models 列表
    API_KEY?:string; // Deprecated
    API_URL?:string; // Deprecated
    customModels?: any[]; // Deprecated

    models: ModelConfig[]; // 新的主要配置项
    promptStats: DataStructure;
}

export const DEFAULT_SETTINGS: SettingsInterfaceType = {
    models: [
        {
            id: 'default-deepseek-r1',
            name: 'DeepSeek R1',
            modelId: 'deepseek-reasoner',
            apiKey: '',
            apiUrl: 'https://api.deepseek.com',
            providerUrl: 'https://platform.deepseek.com/'
        },
        {
            id: 'default-deepseek-v3',
            name: 'DeepSeek V3',
            modelId: 'deepseek-chat',
            apiKey: '',
            apiUrl: 'https://api.deepseek.com',
            providerUrl: 'https://platform.deepseek.com/'
        }
    ],
    promptStats: {}
}
