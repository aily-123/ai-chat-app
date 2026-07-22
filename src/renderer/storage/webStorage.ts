// Web版本的数据存储层（替代Electron的SQLite + IPC）

import type { Conversation, Message, Character, AppSettings, SavedBackground } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

// 兼容旧数据的字段补全
function fillConversation(c: any): Conversation {
  return {
    background: '',
    backgroundOpacity: 0.85,
    backgroundFilter: '',
    backgroundAnimation: 'none',
    plotMode: false,
    plotSetting: '',
    plotProgress: '',
    memorySummary: '',
    memorySummaryUpTo: 0,
    memoryFacts: '',
    ...c,
  };
}

// 兼容旧消息的字段补全
function fillMessage(m: any): Message {
  return {
    parentMessageId: null,
    version: 1,
    isActiveVersion: true,
    ...m,
  };
}

// ===== 对话存储 =====
export const conversationStorage = {
  getAll: (): Conversation[] => {
    const data = localStorage.getItem('conversations');
    if (!data) return [];
    try {
      const list = JSON.parse(data);
      return list.map(fillConversation);
    } catch {
      return [];
    }
  },

  get: (id: string): Conversation | undefined => {
    const conversations = conversationStorage.getAll();
    return conversations.find(c => c.id === id);
  },

  create: (params: {
    title?: string;
    model?: string;
    systemPrompt?: string;
    characterId?: string | null;
    background?: string;
    backgroundOpacity?: number;
    backgroundFilter?: string;
    backgroundAnimation?: string;
  }): Conversation => {
    const conversations = conversationStorage.getAll();
    const now = Date.now();
    const newConversation: Conversation = fillConversation({
      id: uuidv4(),
      title: params.title || '新对话',
      model: params.model || 'gpt-4o',
      systemPrompt: params.systemPrompt || '',
      characterId: params.characterId || null,
      // 角色背景自动应用到对话（调用方传入）
      background: params.background || '',
      backgroundOpacity: params.backgroundOpacity !== undefined ? params.backgroundOpacity : 0.85,
      backgroundFilter: params.backgroundFilter || '',
      backgroundAnimation: params.backgroundAnimation || 'none',
      createdAt: now,
      updatedAt: now,
    });
    conversations.unshift(newConversation);
    localStorage.setItem('conversations', JSON.stringify(conversations));
    return newConversation;
  },

  update: (id: string, params: Partial<Conversation>): Conversation | undefined => {
    const conversations = conversationStorage.getAll();
    const index = conversations.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    conversations[index] = {
      ...conversations[index],
      ...params,
      updatedAt: Date.now(),
    } as Conversation;

    try {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    } catch (quotaErr) {
      // QuotaExceededError — 尝试清理其他对话的 background 数据后重试
      console.warn('Storage quota exceeded, attempting to free space...', quotaErr);
      try {
        // 清理其他对话的 background 字段（只保留当前对话的）
        const cleaned = conversations.map((c, i) =>
          i === index ? c : { ...c, background: '', backgroundFilter: '', backgroundAnimation: 'none' }
        );
        localStorage.setItem('conversations', JSON.stringify(cleaned));
        console.info('Freed space by clearing other conversations\' backgrounds');
        return cleaned[index];
      } catch (retryErr) {
        // 仍然失败 — 尝试进一步压缩当前背景
        console.error('Retry failed, trying to shrink current background...', retryErr);
        try {
          if (params.background && params.background.startsWith('data:')) {
            // 截断 data URL 到更小尺寸（最后手段）
            const truncated = params.background.length > 100000
              ? params.background.substring(0, 100000)
              : params.background;
            conversations[index].background = truncated;
            localStorage.setItem('conversations', JSON.stringify(conversations));
            console.warn('Background was truncated to fit storage');
            return conversations[index];
          }
        } catch (finalErr) {
          // 彻底失败
        }
        throw new Error('本地存储空间不足，请删除一些旧对话或使用图片 URL');
      }
    }
    return conversations[index];
  },

  delete: (id: string): boolean => {
    const conversations = conversationStorage.getAll();
    const filtered = conversations.filter(c => c.id !== id);
    if (filtered.length === conversations.length) return false;

    localStorage.setItem('conversations', JSON.stringify(filtered));
    // 级联删除消息
    messageStorage.deleteAll(id);
    return true;
  },
};

// ===== 消息存储 =====
export const messageStorage = {
  getAll: (conversationId: string): Message[] => {
    const data = localStorage.getItem(`messages_${conversationId}`);
    if (!data) return [];
    try {
      const list = JSON.parse(data);
      return list.map(fillMessage);
    } catch {
      return [];
    }
  },

  /**
   * 获取当前激活的消息链（按 parentMessageId 链路筛选 isActiveVersion=true 的消息）
   * 用于回溯功能：只展示当前激活分支的消息
   */
  getActiveChain: (conversationId: string): Message[] => {
    const all = messageStorage.getAll(conversationId);
    return all.filter(m => m.isActiveVersion).sort((a, b) => a.createdAt - b.createdAt);
  },

  create: (params: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens?: number;
    parentMessageId?: string | null;
    version?: number;
    isActiveVersion?: boolean;
  }): Message => {
    const messages = messageStorage.getAll(params.conversationId);
    const newMessage: Message = {
      id: uuidv4(),
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      tokens: params.tokens || 0,
      createdAt: Date.now(),
      parentMessageId: params.parentMessageId ?? null,
      version: params.version ?? 1,
      isActiveVersion: params.isActiveVersion ?? true,
    };
    messages.push(newMessage);
    localStorage.setItem(`messages_${params.conversationId}`, JSON.stringify(messages));
    return newMessage;
  },

  /**
   * 将同 parentMessageId 下的其它助手消息设为非激活，只激活指定 id
   * 用于版本切换
   */
  setActiveVersion: (conversationId: string, messageId: string): Message | undefined => {
    const messages = messageStorage.getAll(conversationId);
    const target = messages.find(m => m.id === messageId);
    if (!target) return undefined;

    for (const m of messages) {
      if (m.parentMessageId === target.parentMessageId && m.role === 'assistant') {
        m.isActiveVersion = (m.id === messageId);
      }
    }
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));
    return target;
  },

  /**
   * 删除某条消息（用于回溯到某点时丢弃后续激活消息）
   */
  deleteById: (conversationId: string, messageId: string): boolean => {
    const messages = messageStorage.getAll(conversationId);
    const filtered = messages.filter(m => m.id !== messageId);
    if (filtered.length === messages.length) return false;
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(filtered));
    return true;
  },

  /**
   * 将指定时间戳之后的所有激活消息设为非激活（用于回溯）
   * 返回被取消激活的消息数量
   */
  deactivateAfter: (conversationId: string, timestamp: number): number => {
    const messages = messageStorage.getAll(conversationId);
    let count = 0;
    for (const m of messages) {
      if (m.createdAt > timestamp && m.isActiveVersion) {
        m.isActiveVersion = false;
        count++;
      }
    }
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));
    return count;
  },

  /**
   * 物理删除指定时间戳之后的所有消息（彻底清空，不保留历史分支）
   * 返回被删除的消息数量
   */
  deleteAfter: (conversationId: string, timestamp: number): number => {
    const messages = messageStorage.getAll(conversationId);
    const remaining = messages.filter(m => m.createdAt <= timestamp);
    const deleted = messages.length - remaining.length;
    if (deleted > 0) {
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(remaining));
    }
    return deleted;
  },

  /**
   * 物理删除指定消息本身及其之后的所有消息（彻底清空）
   * 返回被删除的消息数量
   */
  deleteFromMessage: (conversationId: string, messageId: string): number => {
    const messages = messageStorage.getAll(conversationId);
    const target = messages.find(m => m.id === messageId);
    if (!target) return 0;
    const remaining = messages.filter(m => m.createdAt < target.createdAt);
    const deleted = messages.length - remaining.length;
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(remaining));
    return deleted;
  },

  deleteAll: (conversationId: string): boolean => {
    localStorage.removeItem(`messages_${conversationId}`);
    return true;
  },
};

// ===== 角色存储 =====
export const characterStorage = {
  getAll: (): Character[] => {
    const data = localStorage.getItem('characters');
    if (!data) return [];
    try {
      const list = JSON.parse(data);
      // 兼容旧数据：补全新字段（包括背景相关字段）
      return list.map((c: any) => ({
        ...c,
        instructions: c.instructions || '',
        lore: c.lore || '',
        background: c.background || '',
        backgroundOpacity: c.backgroundOpacity !== undefined ? c.backgroundOpacity : 0.85,
        backgroundFilter: c.backgroundFilter || '',
        backgroundAnimation: c.backgroundAnimation || 'none',
      }));
    } catch {
      return [];
    }
  },

  get: (id: string): Character | undefined => {
    const characters = characterStorage.getAll();
    return characters.find(c => c.id === id);
  },

  create: (params: {
    name?: string;
    avatar?: string;
    description?: string;
    personality?: string;
    greeting?: string;
    examples?: string;
    instructions?: string;
    lore?: string;
    background?: string;
    backgroundOpacity?: number;
    backgroundFilter?: string;
    backgroundAnimation?: string;
  }): Character => {
    const characters = characterStorage.getAll();
    const now = Date.now();
    const newCharacter: Character = {
      id: uuidv4(),
      name: params.name || '新角色',
      avatar: params.avatar || '',
      description: params.description || '',
      personality: params.personality || '',
      greeting: params.greeting || '',
      examples: params.examples || '',
      instructions: params.instructions || '',
      lore: params.lore || '',
      background: params.background || '',
      backgroundOpacity: params.backgroundOpacity !== undefined ? params.backgroundOpacity : 0.85,
      backgroundFilter: params.backgroundFilter || '',
      backgroundAnimation: params.backgroundAnimation || 'none',
      createdAt: now,
      updatedAt: now,
    };
    characters.unshift(newCharacter);
    localStorage.setItem('characters', JSON.stringify(characters));
    return newCharacter;
  },

  update: (id: string, params: {
    name?: string;
    avatar?: string;
    description?: string;
    personality?: string;
    greeting?: string;
    examples?: string;
    instructions?: string;
    lore?: string;
    background?: string;
    backgroundOpacity?: number;
    backgroundFilter?: string;
    backgroundAnimation?: string;
  }): Character | undefined => {
    const characters = characterStorage.getAll();
    const index = characters.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    characters[index] = {
      ...characters[index],
      ...params,
      updatedAt: Date.now(),
    };
    localStorage.setItem('characters', JSON.stringify(characters));
    return characters[index];
  },

  delete: (id: string): boolean => {
    const characters = characterStorage.getAll();
    const filtered = characters.filter(c => c.id !== id);
    if (filtered.length === characters.length) return false;

    localStorage.setItem('characters', JSON.stringify(filtered));
    return true;
  },
};

// ===== 设置存储 =====
export const settingsStorage = {
  get: (key: string): string | null => {
    const data = localStorage.getItem('settings');
    if (!data) return null;
    const settings = JSON.parse(data);
    return settings[key] || null;
  },

  set: (key: string, value: string): void => {
    const data = localStorage.getItem('settings');
    const settings = data ? JSON.parse(data) : {};
    settings[key] = value;
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
    } catch (err) {
      // 通常是 QuotaExceededError — base64 图片过大
      console.error('Failed to persist setting (storage quota?):', err);
      throw new Error('本地存储空间不足，请使用较小的图片或改用图片 URL');
    }
  },

  getAll: (): AppSettings => {
    const data = localStorage.getItem('settings');
    if (!data) return DEFAULT_SETTINGS;

    try {
      const stored = JSON.parse(data);
      return {
        apiKey: stored.apiKey || DEFAULT_SETTINGS.apiKey,
        apiBase: stored.apiBase || DEFAULT_SETTINGS.apiBase,
        model: stored.model || DEFAULT_SETTINGS.model,
        temperature: stored.temperature ? parseFloat(stored.temperature) : DEFAULT_SETTINGS.temperature,
        maxTokens: stored.maxTokens ? parseInt(stored.maxTokens, 10) : DEFAULT_SETTINGS.maxTokens,
        theme: (stored.theme as 'light' | 'dark') || DEFAULT_SETTINGS.theme,
        wallpaper: stored.wallpaper || DEFAULT_SETTINGS.wallpaper,
        wallpaperOpacity: stored.wallpaperOpacity !== undefined ? parseFloat(stored.wallpaperOpacity) : DEFAULT_SETTINGS.wallpaperOpacity,
        wallpaperFilter: stored.wallpaperFilter || DEFAULT_SETTINGS.wallpaperFilter,
        wallpaperAnimation: stored.wallpaperAnimation || DEFAULT_SETTINGS.wallpaperAnimation,
        webSearchEnabled: stored.webSearchEnabled !== undefined
          ? stored.webSearchEnabled === 'true' || stored.webSearchEnabled === true
          : DEFAULT_SETTINGS.webSearchEnabled,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
};

// ===== 收藏背景存储 =====
export const savedBackgroundsStorage = {
  getAll: (): SavedBackground[] => {
    const data = localStorage.getItem('saved_backgrounds');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  add: (params: { name: string; value: string; source: string }): SavedBackground => {
    const list = savedBackgroundsStorage.getAll();
    // 去重：相同 value 不重复添加
    if (list.some(b => b.value === params.value)) {
      return list.find(b => b.value === params.value)!;
    }
    const item: SavedBackground = {
      id: uuidv4(),
      name: params.name,
      value: params.value,
      source: params.source,
      createdAt: Date.now(),
    };
    list.unshift(item);
    localStorage.setItem('saved_backgrounds', JSON.stringify(list));
    return item;
  },

  remove: (id: string): boolean => {
    const list = savedBackgroundsStorage.getAll();
    const filtered = list.filter(b => b.id !== id);
    if (filtered.length === list.length) return false;
    localStorage.setItem('saved_backgrounds', JSON.stringify(filtered));
    return true;
  },

  rename: (id: string, name: string): void => {
    const list = savedBackgroundsStorage.getAll();
    const idx = list.findIndex(b => b.id === id);
    if (idx === -1) return;
    list[idx].name = name;
    localStorage.setItem('saved_backgrounds', JSON.stringify(list));
  },
};
