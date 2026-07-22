import { create } from 'zustand';
import type { Conversation, Message, CreateConversationParams, UpdateConversationParams } from '../../shared/types';
import { backendApi } from '../api/backendApi';

interface ChatState {
  // 对话列表
  conversations: Conversation[];
  conversationsLoaded: boolean;

  // 当前选中的对话
  activeConversationId: string | null;

  // 当前对话的消息（仅激活版本，用于回溯功能）
  messages: Message[];
  messagesLoaded: boolean;

  // 所有消息（包含非激活版本，用于版本切换显示）
  allMessages: Message[];

  // 操作方法
  loadConversations: () => Promise<void>;
  createConversation: (params?: Partial<CreateConversationParams>) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversation: (id: string, params: UpdateConversationParams) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;

  loadMessages: (conversationId: string) => Promise<void>;
  saveMessage: (msg: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens?: number;
    parentMessageId?: string | null;
    version?: number;
    isActiveVersion?: boolean;
  }) => Promise<Message | void>;
  clearMessages: (conversationId: string) => Promise<void>;

  // 回溯功能：从某条消息创建新版本
  branchFromMessage: (messageId: string) => Promise<void>;
  // 切换版本
  switchVersion: (messageId: string) => Promise<void>;
  /**
   * 清空式回溯（剧情模式专用）：
   * - 物理删除该消息本身及其之后的所有消息
   * - 清空 AI 记忆（memoryFacts / memorySummary / memorySummaryUpTo）
   * - 重新从该消息开始，由调用方再调用 sendMessage
   */
  clearFromMessage: (messageId: string) => Promise<void>;
  /**
   * 保留该消息，清空它之后的所有消息 + AI 记忆（用于从 AI 消息回溯重生成）
   */
  clearAfterMessage: (messageId: string) => Promise<void>;

  // 刷新对话标题（根据第一条用户消息自动设置）
  autoTitle: (conversationId: string) => Promise<void>;
}

// 获取API实例
const getApi = () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  return backendApi;
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  conversationsLoaded: false,
  activeConversationId: null,
  messages: [],
  messagesLoaded: false,
  allMessages: [],

  // ===== 对话操作 =====
  loadConversations: async () => {
    try {
      const api = getApi();
      const list = await api.conversations.list();
      set({ conversations: list, conversationsLoaded: true });
    } catch (err) {
      console.error('Failed to load conversations:', err);
      set({ conversationsLoaded: true });
    }
  },

  createConversation: async (params = {}) => {
    const api = getApi();
    const conv = await api.conversations.create({
      title: params.title || '新对话',
      model: params.model || 'gpt-4o',
      systemPrompt: params.systemPrompt || '',
      characterId: params.characterId || null,
      // 角色背景自动应用到新对话（由调用方从角色数据中传入）
      background: params.background,
      backgroundOpacity: params.backgroundOpacity,
      backgroundFilter: params.backgroundFilter,
      backgroundAnimation: params.backgroundAnimation,
    });
    await get().loadConversations();
    return conv;
  },

  deleteConversation: async (id: string) => {
    const api = getApi();
    await api.conversations.delete(id);
    const { activeConversationId } = get();

    // 如果删除的是当前对话，切换到第一个或清空
    if (activeConversationId === id) {
      const conversations = await api.conversations.list();
      if (conversations.length > 0) {
        set({ activeConversationId: conversations[0].id, messages: [], messagesLoaded: false, allMessages: [] });
        await get().loadMessages(conversations[0].id);
      } else {
        set({ activeConversationId: null, messages: [], messagesLoaded: true, allMessages: [] });
      }
    }

    await get().loadConversations();
  },

  updateConversation: async (id: string, params: UpdateConversationParams) => {
    // 乐观更新：先更新内存中的对话，UI 立即响应
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...params, updatedAt: Date.now() } as Conversation : c
      ),
    }));
    // 后台持久化到存储
    try {
      const api = getApi();
      await api.conversations.update(id, params);
    } catch (err) {
      // 持久化失败时不回滚 UI（保持用户体验），只警告
      console.error('Failed to persist conversation (UI kept, storage may be stale):', err);
      // 不再 throw，不回滚 — 用户体验优先
    }
  },

  selectConversation: async (id: string) => {
    set({ activeConversationId: id, messages: [], messagesLoaded: false, allMessages: [] });
    await get().loadMessages(id);
  },

  // ===== 消息操作 =====
  loadMessages: async (conversationId: string) => {
    try {
      const api = getApi();
      // 获取所有消息（包含所有版本）
      const allMsgs = await api.messages.list(conversationId);
      // 获取激活链（用于显示）
      const activeMsgs = typeof api.messages.getActiveChain === 'function'
        ? await api.messages.getActiveChain(conversationId)
        : allMsgs.filter((m: Message) => m.isActiveVersion);

      set({
        messages: activeMsgs.sort((a: Message, b: Message) => a.createdAt - b.createdAt),
        allMessages: allMsgs,
        messagesLoaded: true,
      });
    } catch (err) {
      console.error('Failed to load messages:', err);
      set({ messagesLoaded: true });
    }
  },

  saveMessage: async (msg) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    const api = getApi();
    const message = await api.messages.create({
      conversationId: activeConversationId,
      role: msg.role,
      content: msg.content,
      tokens: msg.tokens || 0,
      parentMessageId: msg.parentMessageId ?? null,
      version: msg.version ?? 1,
      isActiveVersion: msg.isActiveVersion ?? true,
    });

    // 追加到本地消息列表
    set((state) => ({
      messages: [...state.messages, message],
      allMessages: [...state.allMessages, message],
    }));

    return message;
  },

  clearMessages: async (conversationId: string) => {
    const api = getApi();
    await api.messages.deleteAll(conversationId);
    set({ messages: [], allMessages: [] });
  },

  // ===== 回溯功能 =====
  /**
   * 从某条消息创建新分支：
   * - 将该消息之后的所有激活消息设为非激活（保留为历史分支）
   * - 调用方可在之后通过 saveMessage 重新生成回复（作为新版本）
   */
  branchFromMessage: async (messageId: string) => {
    const { activeConversationId, messages } = get();
    if (!activeConversationId) return;

    const api = getApi();
    const branchPoint = messages.find(m => m.id === messageId);
    if (!branchPoint) return;

    // 将该消息之后的所有激活消息设为非激活
    if (typeof api.messages.deactivateAfter === 'function') {
      await api.messages.deactivateAfter(activeConversationId, branchPoint.createdAt);
    }

    // 重新加载消息
    await get().loadMessages(activeConversationId);
  },

  /**
   * 切换到指定版本（用于多版本切换）
   */
  switchVersion: async (messageId: string) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    const api = getApi();
    if (typeof api.messages.setActiveVersion === 'function') {
      await api.messages.setActiveVersion(activeConversationId, messageId);
    }
    await get().loadMessages(activeConversationId);
  },

  /**
   * 清空式回溯（剧情模式用户消息回溯专用）：
   * - 物理删除该消息本身及其之后的所有消息
   * - 清空 AI 记忆（memoryFacts / memorySummary / memorySummaryUpTo）
   * - 由调用方再调用 sendMessage(content) 重新发送该消息
   */
  clearFromMessage: async (messageId: string) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    const api = getApi();
    if (typeof api.messages.deleteFromMessage === 'function') {
      await api.messages.deleteFromMessage(activeConversationId, messageId);
    }

    // 清空 AI 记忆：关键事实清单 + 长期摘要
    await api.conversations.update(activeConversationId, {
      memoryFacts: '',
      memorySummary: '',
      memorySummaryUpTo: 0,
    });

    await get().loadMessages(activeConversationId);
    await get().loadConversations();
  },

  /**
   * 保留该消息，清空它之后的所有消息 + AI 记忆（用于从 AI 消息回溯重生成）
   * 适用场景：AI 回复不满意，想重新生成 - 删除这条 AI 消息及之后所有内容
   */
  clearAfterMessage: async (messageId: string) => {
    const { activeConversationId, messages } = get();
    if (!activeConversationId) return;

    const target = messages.find(m => m.id === messageId);
    if (!target) return;

    const api = getApi();
    // 物理删除该消息本身及其之后的所有消息
    if (typeof api.messages.deleteFromMessage === 'function') {
      await api.messages.deleteFromMessage(activeConversationId, messageId);
    }

    // 清空 AI 记忆（保留剧情设定 / 进度，那是用户的资产）
    await api.conversations.update(activeConversationId, {
      memoryFacts: '',
      memorySummary: '',
      memorySummaryUpTo: 0,
    });

    await get().loadMessages(activeConversationId);
    await get().loadConversations();
  },

  // 根据第一条用户消息自动生成标题
  autoTitle: async (conversationId: string) => {
    const api = getApi();
    const msgs = await api.messages.list(conversationId);
    const firstUserMsg = msgs.find((m: Message) => m.role === 'user');
    if (firstUserMsg) {
      const title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
      await api.conversations.update(conversationId, { title });
      await get().loadConversations();
    }
  },
}));
