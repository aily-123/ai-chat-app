import { create } from 'zustand';
import type { User, AuthResponse } from '../../shared/types';
import { backendApi } from '../api/backendApi';
import { setUnauthorizedHandler } from '../api/backendApi';
import { authStorage } from './authStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  bootstrapped: boolean;
  loading: boolean;
  error: string | null;

  /** 启动时尝试自动登录（localStorage token → 调 /me 验证） */
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 由 API 401 触发，自动登出 */
  handleUnauthorized: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // 401 自动登出
  setUnauthorizedHandler(() => {
    get().handleUnauthorized();
  });

  return {
    user: authStorage.getUser<User>(),
    token: authStorage.getToken(),
    bootstrapped: false,
    loading: false,
    error: null,

    bootstrap: async () => {
      const token = authStorage.getToken();
      if (!token) {
        set({ bootstrapped: true });
        return;
      }
      try {
        const user = await backendApi.auth.me();
        authStorage.setUser(user);
        set({ user, token, bootstrapped: true });
      } catch {
        // token 失效，清掉
        authStorage.clear();
        set({ user: null, token: null, bootstrapped: true });
      }
    },

    login: async (username: string, password: string) => {
      set({ loading: true, error: null });
      try {
        const res: AuthResponse = await backendApi.auth.login(username, password);
        authStorage.setToken(res.token);
        authStorage.setUser(res.user);
        set({ user: res.user, token: res.token, loading: false });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '登录失败';
        // 提取错误信息
        const match = msg.match(/HTTP\s+\d+:\s*(.+)/);
        const cleanMsg = match ? match[1] : msg;
        set({ error: cleanMsg, loading: false });
        throw e;
      }
    },

    register: async (username: string, password: string, displayName?: string) => {
      set({ loading: true, error: null });
      try {
        const res: AuthResponse = await backendApi.auth.register(username, password, displayName);
        authStorage.setToken(res.token);
        authStorage.setUser(res.user);
        set({ user: res.user, token: res.token, loading: false });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '注册失败';
        const match = msg.match(/HTTP\s+\d+:\s*(.+)/);
        const cleanMsg = match ? match[1] : msg;
        set({ error: cleanMsg, loading: false });
        throw e;
      }
    },

    logout: async () => {
      try {
        await backendApi.auth.logout();
      } catch {
        // 即使后端失败也清空本地
      }
      authStorage.clear();
      set({ user: null, token: null });
    },

    handleUnauthorized: () => {
      authStorage.clear();
      set({ user: null, token: null, bootstrapped: true });
    },

    clearError: () => set({ error: null }),
  };
});
