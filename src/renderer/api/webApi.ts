// Web版本的API适配器（替代Electron的IPC通信）
import { conversationStorage, messageStorage, characterStorage, settingsStorage } from '../storage/webStorage';
import type { Conversation, Message, Character, AppSettings, CreateConversationParams, UpdateConversationParams, CreateCharacterParams, UpdateCharacterParams } from '../../shared/types';

export const webApi = {
  conversations: {
    list: (): Promise<Conversation[]> => {
      return Promise.resolve(conversationStorage.getAll());
    },

    get: (id: string): Promise<Conversation | undefined> => {
      return Promise.resolve(conversationStorage.get(id));
    },

    create: (params: CreateConversationParams): Promise<Conversation> => {
      return Promise.resolve(conversationStorage.create(params));
    },

    delete: (id: string): Promise<boolean> => {
      return Promise.resolve(conversationStorage.delete(id));
    },

    update: (id: string, params: UpdateConversationParams): Promise<Conversation | undefined> => {
      return Promise.resolve(conversationStorage.update(id, params));
    },
  },

  messages: {
    list: (conversationId: string): Promise<Message[]> => {
      return Promise.resolve(messageStorage.getAll(conversationId));
    },

    getActiveChain: (conversationId: string): Promise<Message[]> => {
      return Promise.resolve(messageStorage.getActiveChain(conversationId));
    },

    create: (params: {
      conversationId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      tokens?: number;
      parentMessageId?: string | null;
      version?: number;
      isActiveVersion?: boolean;
    }): Promise<Message> => {
      return Promise.resolve(messageStorage.create(params));
    },

    setActiveVersion: (conversationId: string, messageId: string): Promise<Message | undefined> => {
      return Promise.resolve(messageStorage.setActiveVersion(conversationId, messageId));
    },

    deleteById: (conversationId: string, messageId: string): Promise<boolean> => {
      return Promise.resolve(messageStorage.deleteById(conversationId, messageId));
    },

    deactivateAfter: (conversationId: string, timestamp: number): Promise<number> => {
      return Promise.resolve(messageStorage.deactivateAfter(conversationId, timestamp));
    },

    deleteAfter: (conversationId: string, timestamp: number): Promise<number> => {
      return Promise.resolve(messageStorage.deleteAfter(conversationId, timestamp));
    },

    deleteFromMessage: (conversationId: string, messageId: string): Promise<number> => {
      return Promise.resolve(messageStorage.deleteFromMessage(conversationId, messageId));
    },

    deleteAll: (conversationId: string): Promise<boolean> => {
      return Promise.resolve(messageStorage.deleteAll(conversationId));
    },
  },

  characters: {
    list: (): Promise<Character[]> => {
      return Promise.resolve(characterStorage.getAll());
    },

    get: (id: string): Promise<Character | undefined> => {
      return Promise.resolve(characterStorage.get(id));
    },

    create: (params: CreateCharacterParams): Promise<Character> => {
      return Promise.resolve(characterStorage.create(params));
    },

    delete: (id: string): Promise<boolean> => {
      return Promise.resolve(characterStorage.delete(id));
    },

    update: (id: string, params: UpdateCharacterParams): Promise<Character | undefined> => {
      return Promise.resolve(characterStorage.update(id, params));
    },
  },

  settings: {
    get: (key: string): Promise<string | null> => {
      return Promise.resolve(settingsStorage.get(key));
    },

    set: (key: string, value: string): Promise<void> => {
      return Promise.resolve(settingsStorage.set(key, value));
    },

    getAll: (): Promise<AppSettings> => {
      return Promise.resolve(settingsStorage.getAll());
    },
  },
};

// 在Web环境中，将webApi挂载到window对象
if (typeof window !== 'undefined') {
  (window as any).electronAPI = webApi;
}
