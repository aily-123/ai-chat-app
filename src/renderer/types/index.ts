// 渲染进程专用类型，从 shared 重导出
export type {
  Conversation,
  Message,
  MessageRole,
  AppSettings,
  CreateConversationParams,
  UpdateConversationParams,
  CreateMessageParams,
  StreamChatMessage,
  StreamChatOptions,
  Character,
  CreateCharacterParams,
  UpdateCharacterParams,
} from '../../shared/types';

// 渲染进程 UI 状态类型
export type SidebarTab = 'conversations' | 'settings';

export interface ElectronAPI {
  conversations: {
    list: () => Promise<import('../../shared/types').Conversation[]>;
    get: (id: string) => Promise<import('../../shared/types').Conversation | undefined>;
    create: (params: import('../../shared/types').CreateConversationParams) => Promise<import('../../shared/types').Conversation>;
    delete: (id: string) => Promise<boolean>;
    update: (id: string, params: import('../../shared/types').UpdateConversationParams) => Promise<import('../../shared/types').Conversation | undefined>;
  };
  messages: {
    list: (conversationId: string) => Promise<import('../../shared/types').Message[]>;
    create: (params: import('../../shared/types').CreateMessageParams) => Promise<import('../../shared/types').Message>;
    deleteAll: (conversationId: string) => Promise<boolean>;
  };
  characters: {
    list: () => Promise<import('../../shared/types').Character[]>;
    get: (id: string) => Promise<import('../../shared/types').Character | undefined>;
    create: (params: import('../../shared/types').CreateCharacterParams) => Promise<import('../../shared/types').Character>;
    delete: (id: string) => Promise<boolean>;
    update: (id: string, params: import('../../shared/types').UpdateCharacterParams) => Promise<import('../../shared/types').Character | undefined>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    getAll: () => Promise<import('../../shared/types').AppSettings>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
