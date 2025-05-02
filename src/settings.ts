// 单条对话条目类型
interface Conversation {
    id_timestamp: string;
    prompt: string;
    answer: string;
  }
  
  // 日期对应的完整数据
  interface DateData {
    num: number;             // 当日的对话总数量
    prompt_content: Conversation[];   // 对话列表
  }
  
  // 完整数据结构类型 (日期为动态键名)
export interface DataStructure {
    [date: string]: DateData;
  }


export interface SettingsInterfaceType{
    API_KEY:string;
    API_URL:string;
    promptStats: DataStructure;
}



export const DEFAULT_SETTINGS: SettingsInterfaceType = {
    API_KEY: '',
    API_URL: 'https://api.deepseek.com',
    promptStats: {}
}