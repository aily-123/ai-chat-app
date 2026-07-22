import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { KbdGlowGroup } from './KeyboardShine';

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  isSummarizing?: boolean;
  isSearching?: boolean;
  placeholder?: string;
  /** 是否启用联网搜索 */
  webSearchEnabled?: boolean;
  /** 切换联网搜索开关 */
  onToggleWebSearch?: () => void;
  /** 初始输入值（用于回溯时填充用户消息） */
  initialInput?: string;
}

export const InputArea: React.FC<Props> = ({
  onSend,
  onStop,
  isStreaming,
  disabled,
  isSummarizing,
  isSearching,
  placeholder,
  webSearchEnabled,
  onToggleWebSearch,
  initialInput,
}) => {
  const [input, setInput] = useState(initialInput || '');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus();
  }, [isStreaming]);

  // Sync input when initialInput changes (for rollback functionality)
  useEffect(() => {
    if (initialInput !== undefined) {
      setInput(initialInput);
    }
  }, [initialInput]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = input.length;

  return (
    <div className="px-8 pb-4 pt-3">
      {disabled && (
        <div className="text-center text-[11.5px] tracking-wider uppercase mb-2 fade-in" style={{ color: 'var(--muted-2)' }}>
          — 请先选择一段对话 —
        </div>
      )}

      {isSummarizing && (
        <div className="max-w-3xl mx-auto mb-2.5 flex items-center gap-2.5 text-[11.5px] fade-in hairline px-4 py-2" style={{ color: 'var(--accent)' }}>
          <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: 'var(--accent)' }} />
          <span className="tracking-wider uppercase">Compressing long-term memory</span>
        </div>
      )}

      {isSearching && (
        <div className="max-w-3xl mx-auto mb-2.5 flex items-center gap-2.5 text-[11.5px] fade-in hairline px-4 py-2" style={{ color: 'var(--accent)' }}>
          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="tracking-wider uppercase">Searching the web</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div
          className={`relative transition-quick scale-on-focus ${
            focused ? '' : ''
          }`}
        >
          {/* Top label row */}
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline gap-2">
              <span className="eyebrow">Composition</span>
              {focused && (
                <span className="numeric-badge pulse-soft" style={{ color: 'var(--accent)' }}>●</span>
              )}
            </div>
            <span className="numeric-badge">{String(charCount).padStart(3, '0')} / 4000</span>
          </div>

          <div
            className="relative flex items-end transition-quick"
            style={{
              background: 'var(--surface)',
              border: '1px solid ' + (focused ? 'var(--ink)' : 'var(--hairline)'),
              borderRadius: 4,
              padding: 0,
              boxShadow: focused ? '0 0 0 4px var(--accent-tint), 0 8px 20px -10px var(--hairline-strong)' : 'none',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder || (disabled ? '' : '在此输入...')}
              disabled={isStreaming || disabled}
              rows={1}
              className="flex-1 resize-none bg-transparent px-5 py-3.5 text-[14.5px] leading-[1.6] placeholder-[var(--muted-2)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed max-h-[200px] scrollbar-hidden"
              style={{ color: 'var(--ink)' }}
              maxLength={4000}
            />

            {isStreaming ? (
              <button
                onClick={(e) => {
                  const btn = e.currentTarget;
                  const rect = btn.getBoundingClientRect();
                  const ripple = document.createElement('span');
                  ripple.className = 'ripple';
                  ripple.style.left = `${e.clientX - rect.left}px`;
                  ripple.style.top = `${e.clientY - rect.top}px`;
                  btn.appendChild(ripple);
                  setTimeout(() => ripple.remove(), 600);
                  onStop();
                }}
                className="ripple-host m-2 flex-shrink-0 h-9 px-4 text-[11.5px] tracking-wider uppercase flex items-center gap-2 press-shrink tactile-click state-transition"
                style={{ color: 'var(--accent)' }}
              >
                <span className="w-2 h-2 pulse-soft" style={{ background: 'var(--accent)' }} />
                Stop
              </button>
            ) : (
              <button
                onClick={(e) => {
                  if (!input.trim() || disabled) return;
                  const btn = e.currentTarget;
                  const rect = btn.getBoundingClientRect();
                  const ripple = document.createElement('span');
                  ripple.className = 'ripple';
                  ripple.style.left = `${e.clientX - rect.left}px`;
                  ripple.style.top = `${e.clientY - rect.top}px`;
                  btn.appendChild(ripple);
                  setTimeout(() => ripple.remove(), 600);
                  handleSend();
                }}
                disabled={!input.trim() || disabled}
                className="ripple-host m-2 flex-shrink-0 h-9 px-4 text-[11.5px] tracking-wider uppercase flex items-center gap-2 press-shrink tactile tactile-click state-transition group"
                style={{
                  opacity: input.trim() ? 1 : 0.3,
                  pointerEvents: input.trim() ? 'auto' : 'none',
                }}
              >
                <span className="relative z-10">Send</span>
                <svg className="w-3 h-3 relative z-10 transition-quick group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7-7 7M3 12h17" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <KbdGlowGroup
          className="mt-2 flex items-center justify-between text-[10px] tracking-[0.18em] uppercase"
          reach={100}
          maxGlow={0.55}
          smoothing={0.2}
        >
          <div className="flex items-center gap-1.5">
            <kbd
              className="px-1.5 py-0.5 hairline rounded-sm text-[9.5px] font-mono"
              style={{ color: 'var(--ink)', minWidth: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ↵
            </kbd>
            <span>Send</span>
            <span style={{ color: 'var(--muted-2)' }}>·</span>
            <kbd
              className="px-1.5 py-0.5 hairline rounded-sm text-[9.5px] font-mono"
              style={{ color: 'var(--ink)', minWidth: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ⇧↵
            </kbd>
            <span>Newline</span>
          </div>
          <div className="flex items-center gap-3">
            {onToggleWebSearch && (
              <button
                type="button"
                onClick={onToggleWebSearch}
                className="flex items-center gap-1.5 press-shrink transition-quick"
                style={{ color: webSearchEnabled ? 'var(--accent)' : 'var(--muted-2)' }}
                title={webSearchEnabled ? '联网搜索已开启 — 点击关闭' : '联网搜索已关闭 — 点击开启'}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Web {webSearchEnabled ? 'On' : 'Off'}</span>
              </button>
            )}
            <span style={{ color: 'var(--muted-2)' }}>·</span>
            <span>Press</span>
            <kbd
              className="px-1.5 py-0.5 hairline rounded-sm text-[9.5px] font-mono"
              style={{ color: 'var(--ink)', minWidth: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              /
            </kbd>
            <span>for shortcuts</span>
          </div>
        </KbdGlowGroup>
      </div>
    </div>
  );
};
