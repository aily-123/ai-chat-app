// Spring Boot 后端 API 适配层（通过 Vite 代理 /api → localhost:8080）
import type {
  Conversation,
  Message,
  Character,
  AppSettings,
  CreateConversationParams,
  UpdateConversationParams,
  CreateCharacterParams,
  UpdateCharacterParams,
  SavedBackground,
  User,
  AuthResponse,
} from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import { authStorage } from '../store/authStorage';

const BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '/api';

/**
 * 401 Unauthorized 时由前端触发的回调 — 用来让 authStore 切回未登录状态
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = authStorage.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers || {}) },
  });
  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP 401: ${text || '需要登录'}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** 不解析 JSON 的请求（用于 void 返回） */
async function requestNoBody(url: string, options?: RequestInit): Promise<void> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers || {}) },
  });
  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw new Error('HTTP 401: 需要登录');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
}

export const backendApi = {
  auth: {
    /** 当数据库无任何用户时，自动创建 admin 账号并登录 */
    anonBootstrap: (): Promise<AuthResponse> =>
      request('/auth/anon-bootstrap', { method: 'POST' }),

    login: (username: string, password: string): Promise<AuthResponse> =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),

    register: (username: string, password: string, displayName?: string): Promise<AuthResponse> =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName }),
      }),

    logout: (): Promise<void> =>
      requestNoBody('/auth/logout', { method: 'POST' }),

    me: (): Promise<User> =>
      request('/auth/me'),
  },

  conversations: {
    list: (): Promise<Conversation[]> =>
      request('/conversations'),

    get: (id: string): Promise<Conversation | undefined> =>
      request(`/conversations/${id}`),

    create: (params: CreateConversationParams): Promise<Conversation> =>
      request('/conversations', { method: 'POST', body: JSON.stringify(params) }),

    update: (id: string, params: UpdateConversationParams): Promise<Conversation | undefined> =>
      request(`/conversations/${id}`, { method: 'PUT', body: JSON.stringify(params) }),

    delete: (id: string): Promise<boolean> =>
      request(`/conversations/${id}`, { method: 'DELETE' }),
  },

  messages: {
    list: (conversationId: string): Promise<Message[]> =>
      request(`/conversations/${conversationId}/messages`),

    getActiveChain: (conversationId: string): Promise<Message[]> =>
      request(`/conversations/${conversationId}/messages/active`),

    create: (params: {
      conversationId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      tokens?: number;
      parentMessageId?: string | null;
      version?: number;
      isActiveVersion?: boolean;
    }): Promise<Message> =>
      request(`/conversations/${params.conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    setActiveVersion: (conversationId: string, messageId: string): Promise<Message | undefined> =>
      request(`/conversations/${conversationId}/messages/${messageId}/active-version`, {
        method: 'PUT',
      }),

    deleteById: (conversationId: string, messageId: string): Promise<boolean> =>
      request(`/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE',
      }),

    deactivateAfter: (conversationId: string, timestamp: number): Promise<number> =>
      request(`/conversations/${conversationId}/messages/deactivate-after`, {
        method: 'POST',
        body: JSON.stringify({ timestamp }),
      }),

    deleteAfter: (conversationId: string, timestamp: number): Promise<number> =>
      request(`/conversations/${conversationId}/messages/delete-after`, {
        method: 'POST',
        body: JSON.stringify({ timestamp }),
      }),

    deleteFromMessage: (conversationId: string, messageId: string): Promise<number> =>
      request(`/conversations/${conversationId}/messages/delete-from`, {
        method: 'POST',
        body: JSON.stringify({ messageId }),
      }),

    deleteAll: (conversationId: string): Promise<boolean> =>
      request(`/conversations/${conversationId}/messages`, { method: 'DELETE' }),
  },

  characters: {
    list: (): Promise<Character[]> =>
      request('/characters'),

    get: (id: string): Promise<Character | undefined> =>
      request(`/characters/${id}`),

    create: (params: CreateCharacterParams): Promise<Character> =>
      request('/characters', { method: 'POST', body: JSON.stringify(params) }),

    update: (id: string, params: UpdateCharacterParams): Promise<Character | undefined> =>
      request(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(params) }),

    delete: (id: string): Promise<boolean> =>
      request(`/characters/${id}`, { method: 'DELETE' }),
  },

  settings: {
    get: (key: string): Promise<string | null> =>
      request(`/settings/${key}`),

    set: (key: string, value: string): Promise<void> =>
      requestNoBody(`/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      }),

    getAll: async (): Promise<AppSettings> => {
      const raw = await request<Record<string, string>>('/settings');
      return {
        apiKey: raw.apiKey || DEFAULT_SETTINGS.apiKey,
        apiBase: raw.apiBase || DEFAULT_SETTINGS.apiBase,
        model: raw.model || DEFAULT_SETTINGS.model,
        temperature: raw.temperature ? parseFloat(raw.temperature) : DEFAULT_SETTINGS.temperature,
        maxTokens: raw.maxTokens ? parseInt(raw.maxTokens, 10) : DEFAULT_SETTINGS.maxTokens,
        theme: (raw.theme as 'light' | 'dark') || DEFAULT_SETTINGS.theme,
        wallpaper: raw.wallpaper || DEFAULT_SETTINGS.wallpaper,
        wallpaperOpacity: raw.wallpaperOpacity !== undefined ? parseFloat(raw.wallpaperOpacity) : DEFAULT_SETTINGS.wallpaperOpacity,
        wallpaperFilter: raw.wallpaperFilter || DEFAULT_SETTINGS.wallpaperFilter,
        wallpaperAnimation: raw.wallpaperAnimation || DEFAULT_SETTINGS.wallpaperAnimation,
        webSearchEnabled: raw.webSearchEnabled === 'true',
      };
    },
  },

  savedBackgrounds: {
    getAll: (): Promise<SavedBackground[]> =>
      request('/saved-backgrounds'),

    add: (params: Omit<SavedBackground, 'id' | 'createdAt'>): Promise<SavedBackground> =>
      request('/saved-backgrounds', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    remove: (id: string): Promise<void> =>
      requestNoBody(`/saved-backgrounds/${id}`, { method: 'DELETE' }),
  },
};
