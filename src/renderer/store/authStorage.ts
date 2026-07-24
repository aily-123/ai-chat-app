// 简单的 token 存储辅助（localStorage）
const TOKEN_KEY = 'atelier.auth.token';
const USER_KEY = 'atelier.auth.user';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  getUser<T = any>(): T | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user: any) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },
};
