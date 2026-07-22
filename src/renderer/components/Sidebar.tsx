import React, { useState, useEffect, useRef } from 'react';
import type { Conversation } from '../../shared/types';
import { useScrollReveal } from '../hooks/useDynamicAnimations';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (characterId?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onOpenSettings: () => void;
  onOpenCharacters: () => void;
  /** 移动端侧边栏是否打开 */
  mobileOpen?: boolean;
  /** 关闭移动端侧边栏 */
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onOpenSettings,
  onOpenCharacters,
  mobileOpen,
  onCloseMobile,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleConfirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirmRename();
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditTitle('');
    }
  };

  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Collapsed — slim column (desktop only, hidden on mobile)
  if (collapsed) {
    return (
      <aside className="hidden md:flex w-[68px] h-full flex-col surface-glass hairline-r relative z-20">
        <div className="p-4 flex justify-center hairline-b">
          <button
            onClick={() => setCollapsed(false)}
            className="group w-9 h-9 flex items-center justify-center text-[var(--ink)] hover:text-[var(--accent)] transition-quick"
            title="展开"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 4l8 8-8 8" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 flex flex-col items-center py-6 gap-1">
          <button
            onClick={() => onCreate()}
            className="group w-10 h-10 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-2)] transition-quick relative"
            title="新建对话"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="absolute left-full ml-2 px-2 py-1 text-xs surface elevated whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-quick" style={{ background: 'var(--surface)' }}>
              新建
            </span>
          </button>
          <button
            onClick={onOpenCharacters}
            className="group w-10 h-10 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-2)] transition-quick relative"
            title="角色"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <circle cx="9" cy="8" r="3" />
              <path strokeLinecap="round" d="M3 20c0-3 3-5 6-5s6 2 6 5" />
              <circle cx="17" cy="6" r="2" />
              <path strokeLinecap="round" d="M15 13c2 0 5 1 5 3" />
            </svg>
            <span className="absolute left-full ml-2 px-2 py-1 text-xs surface elevated whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-quick" style={{ background: 'var(--surface)' }}>
              角色
            </span>
          </button>
        </nav>

        <div className="hairline-t p-2 flex flex-col items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="group w-10 h-10 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-2)] transition-quick"
            title="设置"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  const sidebarClasses = mobileOpen !== undefined
    ? `fixed md:relative top-0 left-0 bottom-0 z-50 w-72 h-full flex flex-col surface-glass hairline-r transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`
    : 'w-72 h-full flex flex-col surface-glass hairline-r relative z-20';

  return (
    <aside className={sidebarClasses}>
      {/* 移动端关闭按钮 */}
      {onCloseMobile && (
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 hairline-b">
          <span className="font-display text-[14px] font-light tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>菜单</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 -mr-1 press-shrink"
            style={{ color: 'var(--ink)' }}
            aria-label="关闭菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Masthead — editorial */}
      <div className="px-5 pt-5 pb-3 hairline-b">
        <div className="flex items-start justify-between mb-2">
          <div className="eyebrow">No. 01 — Atelier</div>
          <div className="text-right leading-tight">
            <div className="numeric-badge">{dateStr}</div>
            <div className="numeric-badge mt-0.5">{timeStr}</div>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-[26px] leading-[0.95] font-light tracking-[-0.04em]">
              <span className="italic font-extralight text-[var(--accent)]">A</span>telier
            </h1>
            <p className="text-[10.5px] mt-1 tracking-wide" style={{ color: 'var(--muted)' }}>
              角色对话 · 剧情演绎 · 长期记忆
            </p>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 text-[var(--muted-2)] hover:text-[var(--ink)] transition-quick press-shrink"
            title="收起"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-2.5">
        <div className={`relative flex items-center hairline-b transition-quick ${searchFocused ? 'border-b-[var(--ink)]' : ''}`}>
          <svg
            className={`w-3.5 h-3.5 transition-quick ${
              searchFocused ? 'text-[var(--ink)]' : 'text-[var(--muted-2)]'
            }`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-5-5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="检索对话标题…"
            className="flex-1 ml-2.5 py-1.5 text-[13px] bg-transparent text-[var(--ink)] placeholder-[var(--muted-2)] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
              className="text-[10px] text-[var(--muted-2)] hover:text-[var(--ink)] transition-quick"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* New conversation */}
      <div className="px-5 pb-2.5">
        <button
          onClick={(e) => {
            // Add ripple effect
            const btn = e.currentTarget;
            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${e.clientX - rect.left}px`;
            ripple.style.top = `${e.clientY - rect.top}px`;
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.marginLeft = '0';
            ripple.style.marginTop = '0';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
            onCreate();
          }}
          className="ripple-host group w-full flex items-center justify-between px-3.5 py-2 btn-primary relative overflow-hidden press-shrink tactile-click"
        >
          <span className="flex items-center gap-2.5 relative z-10">
            <svg className="w-3.5 h-3.5 transition-quick group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            <span>新建对话</span>
          </span>
          <span className="text-[10px] tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-quick relative z-10">N</span>
        </button>
      </div>

      {/* Section index */}
      <div className="px-5 pt-1 pb-1.5 flex items-baseline justify-between">
        <span className="eyebrow">近期 · 索引</span>
        <span className="numeric-badge">{String(filtered.length).padStart(2, '0')}</span>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-hidden min-h-0">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center fade-in">
            <div className="w-7 h-7 mx-auto mb-2 flex items-center justify-center hairline rounded-full">
              <span className="font-display italic text-[var(--muted-2)] text-sm">∅</span>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
              {searchQuery ? '未找到相关对话' : '对话集暂无内容'}
            </p>
            <p className="text-[10.5px] mt-0.5 tracking-wide" style={{ color: 'var(--muted-2)' }}>
              {searchQuery ? '尝试其他关键词' : '点击上方按钮开始第一段对话'}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((conv, idx) => {
              const isActive = activeId === conv.id;
              return (
                <li
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={`conversation-item message-enter ${isActive ? 'is-active' : ''}`}
                  style={{ animationDelay: `${idx * 25}ms` }}
                >
                  {/* Index number */}
                  <span className={`numeric-badge pt-0.5 flex-shrink-0 ${isActive ? 'text-[var(--accent)]' : 'opacity-60'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    {editingId === conv.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleConfirmRename}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full text-[13px] bg-transparent border-b border-[var(--ink)] outline-none py-0.5"
                      />
                    ) : (
                      <>
                        <div className={`text-[13px] truncate link-reveal ${isActive ? 'font-medium' : ''}`} style={{ color: 'var(--ink)' }}>
                          {conv.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {conv.plotMode && (
                            <span className="text-[10px] tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
                              剧情
                            </span>
                          )}
                          {conv.characterId && !conv.plotMode && (
                            <span className="text-[10px] tracking-wider uppercase" style={{ color: 'var(--muted-2)' }}>
                              角色
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>
                            {new Date(conv.updatedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div className="conv-actions flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartRename(conv); }}
                      className="p-1 text-[var(--muted-2)] hover:text-[var(--ink)] transition-quick"
                      title="重命名"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-9.5l3 3m-3-3l-9 9V17h4.5l9-9m-3 0l3 3" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确认删除「${conv.title}」？此操作不可撤销。`)) {
                          onDelete(conv.id);
                        }
                      }}
                      className="p-1 text-[var(--muted-2)] hover:text-[var(--accent)] transition-quick"
                      title="删除"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Quick reference — fills the empty space */}
        <div className="mt-4 px-3 fade-in">
          <div className="hairline-t pt-4">
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="eyebrow">编辑 · 速记</span>
              <span className="numeric-badge opacity-50">A.M.</span>
            </div>
            <ul className="space-y-1.5 text-[11.5px] leading-[1.55]" style={{ color: 'var(--muted)' }}>
              <li className="flex items-start gap-2">
                <span className="font-display italic text-[var(--accent)] mt-0.5">i.</span>
                <span>点击「<span style={{ color: 'var(--ink)' }}>新建对话</span>」开始</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-display italic text-[var(--accent)] mt-0.5">ii.</span>
                <span>悬停对话可重命名或删除</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-display italic text-[var(--accent)] mt-0.5">iii.</span>
                <span>在「角色集」预设独立人格</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-display italic text-[var(--accent)] mt-0.5">iv.</span>
                <span>「剧情模式」演绎专属故事</span>
              </li>
            </ul>

            <div className="mt-3.5 pt-3 hairline-t">
              <p
                className="font-display italic text-[12px] leading-[1.55]"
                style={{ color: 'var(--ink-2)' }}
              >
                "故事开始于一段沉默<br />—— 等待被打破。"
              </p>
              <div className="flex items-baseline justify-between mt-1.5">
                <p
                  className="text-[9.5px] tracking-[0.2em] uppercase"
                  style={{ color: 'var(--muted-2)' }}
                >
                  — Editorial Note
                </p>
                <span className="numeric-badge opacity-50">P. 00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer masthead */}
      <div className="hairline-t px-5 py-2.5 space-y-0.5">
        <button
          onClick={onOpenCharacters}
          className="group w-full flex items-center justify-between py-1.5 text-[var(--ink)] transition-quick"
        >
          <span className="flex items-center gap-3">
            <span className="numeric-badge opacity-50 group-hover:opacity-100">M</span>
            <span className="text-[12.5px] tracking-wide">角色集</span>
          </span>
          <span className="text-[10px] text-[var(--muted-2)] group-hover:text-[var(--ink)] marquee">→</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="group w-full flex items-center justify-between py-1.5 text-[var(--ink)] transition-quick"
        >
          <span className="flex items-center gap-3">
            <span className="numeric-badge opacity-50 group-hover:opacity-100">S</span>
            <span className="text-[12.5px] tracking-wide">设置与主题</span>
          </span>
          <span className="text-[10px] text-[var(--muted-2)] group-hover:text-[var(--ink)]">→</span>
        </button>
      </div>
    </aside>
  );
};
