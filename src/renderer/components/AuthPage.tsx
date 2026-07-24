import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

type Mode = 'login' | 'register';

export const AuthPage: React.FC = () => {
  const { login, register, loading, error, clearError, bootstrap } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    document.body.classList.add('sentinel-mounted');
    return () => document.body.classList.remove('sentinel-mounted');
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    clearError();
  }, [mode, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, displayName.trim() || undefined);
      }
    } catch {
      // error already in store
    }
  };

  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="sentinel-root bg-background min-h-screen font-sora antialiased">
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-5 bg-background/85 backdrop-blur-sm border-b border-foreground/10">
        <a href="#" onClick={(e) => { e.preventDefault(); bootstrap(); }} className="flex items-baseline gap-2">
          <span className="text-foreground text-lg font-semibold tracking-[-0.02em]">ATELIER</span>
          <span className="text-primary text-lg font-light tracking-tight">.ai</span>
        </a>
        <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
          {dateStr} · {timeStr}
        </div>
      </div>

      {/* Center stage — split layout */}
      <main className="min-h-screen pt-28 pb-12 px-6 md:px-10 lg:px-16 flex items-center justify-center">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: editorial invitation */}
          <section className="hidden lg:flex flex-col gap-8">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60">No. 01</span>
              <span className="w-10 h-px bg-foreground/20" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary">— 入会 · Membership —</span>
              <span className="w-10 h-px bg-foreground/20" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60">2026</span>
            </div>

            <h1 className="text-[56px] leading-[1.02] font-light tracking-[-0.04em] text-foreground">
              <span className="font-serif font-extralight italic text-primary">开</span>启你的<br />
              <em className="font-serif font-extralight italic text-primary">第一段</em>对话
            </h1>

            <p className="text-[14px] leading-[1.85] text-muted-foreground max-w-[440px] indent-8">
              注册账号以保存你的角色、对话与长期记忆。每一个账号都拥有独立的工作台 —
              你的故事不会被他人看见，他们的故事也不会打扰你。
            </p>

            <div className="mt-2 grid grid-cols-2 gap-3 max-w-[440px]">
              {[
                { mark: '01', name: '独立空间', desc: '登录后只看自己的角色与对话' },
                { mark: '02', name: '长期记忆', desc: '智能体记住你说过的每一句话' },
                { mark: '03', name: '剧情演绎', desc: '自定义世界观，AI 严格遵循' },
                { mark: '04', name: '开源免费', desc: '本地部署，数据自主可控' },
              ].map((f) => (
                <div key={f.mark} className="p-4 border border-foreground/10 rounded-sm">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-primary mb-2">{f.mark}</div>
                  <div className="text-[13px] font-medium text-foreground mb-1">{f.name}</div>
                  <div className="text-[11.5px] leading-[1.5] text-muted-foreground">{f.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-end gap-4">
              <span className="w-8 h-px bg-foreground" />
              <p className="font-serif italic text-[12.5px] leading-[1.5] max-w-[320px] text-foreground/80">
                "故事属于说故事的人。"
              </p>
              <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/40 mb-0.5">— A.M.</span>
            </div>
          </section>

          {/* Right: form card */}
          <section className="w-full">
            <div className="bg-background/95 border border-foreground/10 rounded-sm p-8 md:p-10 shadow-[0_30px_60px_-30px_rgba(21,17,13,0.18)] relative overflow-hidden">
              {/* Decorative corner mark */}
              <div className="absolute top-3 right-4 text-[9px] tracking-[0.3em] uppercase text-foreground/30">
                § {mode === 'login' ? 'LOGIN' : 'REGISTER'}
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-6 mb-6 border-b border-foreground/10">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`pb-3 text-[12px] tracking-[0.25em] uppercase transition-colors relative ${
                    mode === 'login' ? 'text-foreground' : 'text-foreground/40 hover:text-foreground/70'
                  }`}
                >
                  登录
                  {mode === 'login' && (
                    <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`pb-3 text-[12px] tracking-[0.25em] uppercase transition-colors relative ${
                    mode === 'register' ? 'text-foreground' : 'text-foreground/40 hover:text-foreground/70'
                  }`}
                >
                  注册
                  {mode === 'register' && (
                    <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary" />
                  )}
                </button>
              </div>

              <div className="mb-6">
                <div className="text-[10px] tracking-[0.3em] uppercase text-primary mb-1.5">
                  {mode === 'login' ? 'A · Welcome Back' : 'A · Begin'}
                </div>
                <h2 className="text-[28px] leading-[1.1] font-light tracking-[-0.02em] text-foreground">
                  {mode === 'login' ? (
                    <>回到你的<em className="font-serif italic font-extralight text-primary"> 工作台</em></>
                  ) : (
                    <>创建<em className="font-serif italic font-extralight text-primary"> 新账号</em></>
                  )}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  {mode === 'login' ? '登录后查看你保存的角色与对话' : '注册即可拥有独立的角色与记忆空间'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="flex items-baseline justify-between text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1.5">
                    <span>用户名</span>
                    <span className="text-foreground/30">/ USERNAME</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={32}
                    autoComplete="username"
                    placeholder="3-32 个字符"
                    className="w-full px-3.5 py-2.5 text-[14px] bg-transparent border border-foreground/15 focus:border-foreground focus:outline-none transition-colors text-foreground placeholder-foreground/30 rounded-sm"
                  />
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="flex items-baseline justify-between text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1.5">
                      <span>显示名（可选）</span>
                      <span className="text-foreground/30">/ DISPLAY NAME</span>
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={32}
                      placeholder="留空则使用用户名"
                      className="w-full px-3.5 py-2.5 text-[14px] bg-transparent border border-foreground/15 focus:border-foreground focus:outline-none transition-colors text-foreground placeholder-foreground/30 rounded-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-baseline justify-between text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1.5">
                    <span>密码</span>
                    <span className="text-foreground/30">/ PASSWORD</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="至少 6 个字符"
                      className="w-full px-3.5 py-2.5 pr-16 text-[14px] bg-transparent border border-foreground/15 focus:border-foreground focus:outline-none transition-colors text-foreground placeholder-foreground/30 rounded-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] tracking-[0.2em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                    >
                      {showPwd ? '隐藏' : '显示'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="px-3.5 py-2.5 text-[12px] text-[#8a3e2a] bg-[#fbeee8] border border-[#8a3e2a]/20 rounded-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !username.trim() || !password}
                  className="w-full mt-2 px-5 py-3 bg-foreground text-background text-[12px] tracking-[0.25em] uppercase font-medium rounded-sm hover:bg-foreground/90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{mode === 'login' ? '登录中…' : '创建中…'}</span>
                    </>
                  ) : (
                    <span>{mode === 'login' ? '进入工作台' : '创建账号并进入'}</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-foreground/10 flex items-center justify-between text-[10.5px] tracking-[0.2em] uppercase text-foreground/40">
                <span>{mode === 'login' ? '还没有账号？' : '已有账号？'}</span>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-foreground/80 hover:text-primary transition-colors"
                >
                  {mode === 'login' ? '注册 →' : '← 登录'}
                </button>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-center text-[10.5px] tracking-[0.2em] uppercase text-foreground/40 mt-5">
              你的数据 · 你的故事
            </p>
          </section>
        </div>
      </main>

      <footer className="relative z-10 px-6 md:px-10 lg:px-16 py-8 border-t border-foreground/10 bg-background/60">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="text-foreground font-semibold">ATELIER.ai</span>
            <span className="text-foreground/30">·</span>
            <span>Editorial AI for thinking</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2026</span>
            <span className="text-foreground/30">·</span>
            <span>Made with care</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
