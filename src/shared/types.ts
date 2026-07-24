// ============ 用户类型 ============
export interface User {
  id: string;
  username: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  bootstrap?: boolean;
}

// ============ 角色类型 ============
export interface Character {
  id: string;
  userId?: string | null;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  greeting: string;
  examples: string;
  /** 角色指令：用户给 AI 的硬性约束（说话方式、行为准则、禁忌等），最高优先级铁律 */
  instructions: string;
  /** 角色资料集：由 AI 根据角色名+简介自行搜索/生成的扩展资料（背景故事、关系网、世界观、口癖等） */
  lore: string;
  /** 角色默认背景 (Base64 / URL / CSS gradient) — 创建对话时自动应用到 conversation */
  background: string;
  /** 角色默认背景不透明度 (0-1) */
  backgroundOpacity: number;
  /** 角色默认背景滤镜 CSS 字符串 */
  backgroundFilter: string;
  /** 角色默认背景动画模式：none / gradient-flow / pulse / parallax / drift */
  backgroundAnimation: string;
  createdAt: number;
  updatedAt: number;
}

export type CreateCharacterParams = Pick<Character, 'name' | 'avatar' | 'description' | 'personality' | 'greeting' | 'examples' | 'instructions' | 'lore' | 'background' | 'backgroundOpacity' | 'backgroundFilter' | 'backgroundAnimation'>;
export type UpdateCharacterParams = Partial<Pick<Character, 'name' | 'avatar' | 'description' | 'personality' | 'greeting' | 'examples' | 'instructions' | 'lore' | 'background' | 'backgroundOpacity' | 'backgroundFilter' | 'backgroundAnimation'>>;

// ============ 对话类型 ============
export interface Conversation {
  id: string;
  userId?: string | null;
  title: string;
  model: string;
  systemPrompt: string;
  characterId: string | null;
  /** 对话级独立背景 (Base64 / URL / CSS gradient) */
  background: string;
  /** 背景不透明度 (0-1) */
  backgroundOpacity: number;
  /** 背景滤镜 CSS 字符串，如 "blur(2px) brightness(0.9) saturate(1.1)" */
  backgroundFilter: string;
  /** 背景动画模式：none / gradient-flow / pulse / parallax / drift */
  backgroundAnimation: string;
  /** 剧情模式开关 */
  plotMode: boolean;
  /** 剧情设定：世界观、剧情线、规则等 */
  plotSetting: string;
  /** 当前剧情进度（可选：用户可手动维护） */
  plotProgress: string;
  /** 世界书：剧情模式下的补充设定（地名/物品/规则/背景板），每条独立 */
  worldBook: string;
  /** 剧情人物状态：人物状态、地点、持有物品、关系变化 */
  characterStatus: string;
  /** 记忆点（最近一次保存记忆的 messageId），用于回溯定位 */
  memoryCheckpointMsgId: string;
  /** 记忆摘要（用于长期记忆压缩） */
  memorySummary: string;
  /** 记忆摘要覆盖到第几条消息 */
  memorySummaryUpTo: number;
  /** 结构化关键事实清单（用于强化记忆，每次助手回复后增量更新） */
  memoryFacts: string;
  createdAt: number;
  updatedAt: number;
}

export type CreateConversationParams = Pick<Conversation, 'title' | 'model' | 'systemPrompt' | 'characterId'> & Partial<Pick<Conversation, 'background' | 'backgroundOpacity' | 'backgroundFilter' | 'backgroundAnimation'>>;
export type UpdateConversationParams = Partial<Pick<Conversation,
  'title' | 'model' | 'systemPrompt' | 'characterId' |
  'background' | 'backgroundOpacity' | 'backgroundFilter' | 'backgroundAnimation' |
  'plotMode' | 'plotSetting' | 'plotProgress' | 'worldBook' | 'characterStatus' |
  'memoryCheckpointMsgId' | 'memorySummary' | 'memorySummaryUpTo' | 'memoryFacts'
>>;

// ============ 消息类型 ============
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokens: number;
  createdAt: number;
  /** 父消息 ID（用于对话回溯/分支，null 表示是初始消息） */
  parentMessageId: string | null;
  /** 同一父消息下的版本号（1, 2, 3...） */
  version: number;
  /** 是否为当前激活版本（用于回溯时切换显示） */
  isActiveVersion: boolean;
}

export type CreateMessageParams = Pick<Message, 'conversationId' | 'role' | 'content' | 'tokens'> & {
  parentMessageId?: string | null;
  version?: number;
  isActiveVersion?: boolean;
};

// ============ 设置类型 ============
export interface AppSettings {
  apiKey: string;
  apiBase: string;
  model: string;
  temperature: number;
  maxTokens: number;
  theme: 'light' | 'dark';
  /** 全局默认壁纸（每个对话可单独覆盖） */
  wallpaper: string;
  /** 全局默认壁纸不透明度 (0-1) */
  wallpaperOpacity: number;
  /** 全局默认壁纸滤镜 */
  wallpaperFilter: string;
  /** 全局默认壁纸动画 */
  wallpaperAnimation: string;
  /** 是否启用联网搜索（发送消息前自动检索相关信息） */
  webSearchEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  apiBase: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  theme: 'light',
  wallpaper: '',
  wallpaperOpacity: 0.92,
  wallpaperFilter: '',
  wallpaperAnimation: 'none',
  webSearchEnabled: false,
};

// ============ 收藏背景类型 ============
export interface SavedBackground {
  id: string;
  userId?: string | null;
  name: string;
  /** 背景 CSS 值（颜色 / 渐变 / data URL / http URL） */
  value: string;
  /** 来源：preset / upload / url / ai */
  source: string;
  createdAt: number;
}

// ============ 流式聊天 ============
export interface StreamChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamChatOptions {
  model: string;
  messages: StreamChatMessage[];
  temperature: number;
  maxTokens: number;
  apiKey: string;
  apiBase: string;
  onToken: (token: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: Error) => void;
}
