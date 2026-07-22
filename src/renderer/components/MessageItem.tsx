import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../../shared/types';

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
  characterName?: string;
  characterAvatar?: string;
  index?: number;
  isLast?: boolean;
  /** 是否处于剧情模式（影响用户消息回溯按钮显示） */
  isPlotMode?: boolean;
  /** 同一 parentMessageId 下的所有助手消息版本（用于版本切换） */
  siblingVersions?: Message[];
  /** 当前激活版本在该数组中的索引 */
  activeVersionIndex?: number;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  /** 切换到指定版本 */
  onSwitchVersion?: (messageId: string) => void;
  /** AI 消息回溯（重写 AI 回复）：删除这条 AI 消息及后续，清空记忆后重发用户消息 */
  onBranchFrom?: (messageId: string) => void;
  /** 用户消息回溯（剧情模式专用）：删除这条用户消息及后续，清空记忆后重发该消息 */
  onBranchFromUser?: (messageId: string) => void;
}

export const MessageItem: React.FC<Props> = ({
  message,
  isStreaming,
  streamingContent,
  characterName,
  characterAvatar,
  index = 0,
  isPlotMode = false,
  siblingVersions = [],
  activeVersionIndex = 0,
  onRegenerate,
  onEdit,
  onSwitchVersion,
  onBranchFrom,
  onBranchFromUser,
}) => {
  const isUser = message.role === 'user';
  const content = isStreaming ? (streamingContent || '') : message.content;
  const showCursor = isStreaming && streamingContent !== undefined && streamingContent !== '';
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const displayName = isUser ? 'You' : (characterName || 'Assistant');
  const avatarText = displayName.charAt(0).toUpperCase();
  const timeStr = new Date(message.createdAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  // 自动调整编辑框高度
  useEffect(() => {
    if (editing && editTextareaRef.current) {
      const ta = editTextareaRef.current;
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
    }
  }, [editText, editing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onEdit) onEdit(editText.trim());
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditText(message.content);
  };

  return (
    <article
      className={`group relative mb-9 ${isUser ? 'msg-from-right' : 'msg-from-left'} state-transition`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header: index + name + time */}
      <div className={`flex items-baseline gap-3 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <span
            className="font-mono-ui text-[10px] tracking-[0.15em] tabular-nums transition-quick"
            style={{ color: 'var(--muted-2)' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        <span
          className="font-display text-[16px] font-light tracking-[-0.01em]"
          style={{ color: 'var(--ink)' }}
        >
          {isUser ? 'You' : displayName}
        </span>
        {!isUser && (
          <span
            className="font-mono-ui text-[9.5px] tracking-[0.2em] uppercase transition-quick"
            style={{ color: 'var(--muted-2)' }}
          >
            — speaking
          </span>
        )}
        <span
          className="font-mono-ui text-[10px] tabular-nums tracking-[0.05em]"
          style={{ color: 'var(--muted-2)' }}
        >
          {timeStr}
        </span>
        {isUser && (
          <span
            className="font-mono-ui text-[10px] tracking-[0.15em] tabular-nums"
            style={{ color: 'var(--muted-2)' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Body: two columns — gutter avatar + content */}
      <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="flex-shrink-0 select-none">
          {isUser ? (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--paper)] transition-quick hover:scale-105"
              style={{ background: 'var(--ink-2)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          ) : characterAvatar ? (
            <img
              src={characterAvatar}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-[var(--hairline-strong)] transition-quick hover:ring-[var(--accent)]"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--paper)] font-display text-[14px] font-medium transition-quick hover:scale-105"
              style={{ background: 'var(--ink)' }}
            >
              {avatarText}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
          <div className={`relative ${isUser ? 'max-w-[92%] md:max-w-[80%]' : 'max-w-[95%] md:max-w-[88%]'}`}>
            {/* AI message: editorial body with vertical accent line */}
            {!isUser ? (
              <div
                className="relative pl-5"
                style={{ borderLeft: '1px solid var(--hairline-strong)' }}
              >
                {/* Accent stripe — 顶部强调 */}
                <span
                  className="absolute left-0 top-0 w-px h-10"
                  style={{ background: 'var(--accent)' }}
                />

                {editing ? (
                  <div className="space-y-2.5">
                    <textarea
                      ref={editTextareaRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={Math.min(8, editText.split('\n').length + 1)}
                      className="w-full text-[14px] leading-[1.7] bg-transparent p-2 outline-none resize-none transition-quick rounded-sm"
                      style={{
                        color: 'var(--ink)',
                        border: '1px solid var(--ink-2)',
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end items-center">
                      <span
                        className="font-mono-ui text-[9.5px] tracking-[0.1em] uppercase mr-auto"
                        style={{ color: 'var(--muted-2)' }}
                      >
                        editing · esc to cancel
                      </span>
                      <button
                        onClick={handleCancelEdit}
                        className="tactile-ghost text-[11px] press-shrink"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="tactile text-[11px] press-shrink"
                      >
                        保存并重新发送
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`message-content text-[14.5px] leading-[1.78] break-words ${showCursor ? 'typing-cursor' : ''}`}
                    style={{ color: 'var(--ink)' }}
                  >
                    <ReactMarkdown>{content || (isStreaming ? '...' : '')}</ReactMarkdown>
                  </div>
                )}

                {/* Footer hairline + actions */}
                {!isStreaming && !editing && (
                  <div className="mt-4 pt-3 flex items-center justify-between hairline-t">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono-ui text-[9.5px] tracking-[0.2em] uppercase"
                        style={{ color: 'var(--muted-2)' }}
                      >
                        — Fin
                      </span>
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: 'var(--muted-2)' }}
                      />
                      <span
                        className="font-mono-ui text-[9.5px] tabular-nums"
                        style={{ color: 'var(--muted-2)' }}
                      >
                        {message.tokens || 0} tokens
                      </span>
                      {/* 版本切换器 */}
                      {siblingVersions.length > 1 && onSwitchVersion && (
                        <>
                          <span
                            className="w-1 h-1 rounded-full ml-2"
                            style={{ background: 'var(--muted-2)' }}
                          />
                          <span
                            className="font-mono-ui text-[9.5px] tracking-[0.15em] uppercase flex items-center gap-1.5"
                            style={{ color: 'var(--accent)' }}
                            title="对话回溯 · 多版本切换"
                          >
                            <button
                              onClick={() => {
                                const prevIdx = Math.max(0, activeVersionIndex - 1);
                                if (prevIdx !== activeVersionIndex && siblingVersions[prevIdx]) {
                                  onSwitchVersion(siblingVersions[prevIdx].id);
                                }
                              }}
                              disabled={activeVersionIndex === 0}
                              className="px-1 transition-quick press-shrink disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{ color: 'var(--muted-2)' }}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <span className="tabular-nums">
                              v{activeVersionIndex + 1}/{siblingVersions.length}
                            </span>
                            <button
                              onClick={() => {
                                const nextIdx = Math.min(siblingVersions.length - 1, activeVersionIndex + 1);
                                if (nextIdx !== activeVersionIndex && siblingVersions[nextIdx]) {
                                  onSwitchVersion(siblingVersions[nextIdx].id);
                                }
                              }}
                              disabled={activeVersionIndex === siblingVersions.length - 1}
                              className="px-1 transition-quick press-shrink disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{ color: 'var(--muted-2)' }}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </span>
                        </>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-1 transition-quick"
                      style={{ opacity: showActions ? 1 : 0 }}
                    >
                      <ActionButton
                        onClick={handleCopy}
                        active={copied}
                        activeLabel="已复制"
                        icon={
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        }
                        label="复制"
                      />
                      {onRegenerate && (
                        <>
                          <span className="w-px h-3 mx-1" style={{ background: 'var(--hairline-strong)' }} />
                          <ActionButton
                            onClick={onRegenerate}
                            icon={
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            }
                            label="重写"
                          />
                        </>
                      )}
                      {onBranchFrom && (
                        <>
                          <span className="w-px h-3 mx-1" style={{ background: 'var(--hairline-strong)' }} />
                          <ActionButton
                            onClick={() => {
                              if (window.confirm('回溯到这条消息将清空之后的所有对话记录和 AI 记忆，重新生成回复。是否继续？')) {
                                onBranchFrom(message.id);
                              }
                            }}
                            icon={
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            }
                            label="回溯"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* User message: compact dark block, right-aligned */
              <div>
                {editing ? (
                  <div className="space-y-2.5">
                    <textarea
                      ref={editTextareaRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={Math.min(8, editText.split('\n').length + 1)}
                      className="w-full text-[14px] leading-[1.7] bg-transparent p-2 outline-none resize-none transition-quick rounded-sm text-right"
                      style={{
                        color: 'var(--ink)',
                        border: '1px solid var(--ink-2)',
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end items-center">
                      <span
                        className="font-mono-ui text-[9.5px] tracking-[0.1em] uppercase mr-auto"
                        style={{ color: 'var(--muted-2)' }}
                      >
                        editing · esc to cancel
                      </span>
                      <button
                        onClick={handleCancelEdit}
                        className="tactile-ghost text-[11px] press-shrink"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="tactile text-[11px] press-shrink"
                      >
                        保存并重新发送
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`text-[14px] leading-[1.7] whitespace-pre-wrap break-words text-right ${showCursor ? 'typing-cursor' : ''}`}
                    style={{ color: 'var(--ink)' }}
                  >
                    {content || (isStreaming ? '...' : '')}
                  </div>
                )}

                {!isStreaming && !editing && (
                  <div
                    className="mt-3 flex items-center justify-end gap-1 transition-quick"
                    style={{ opacity: showActions ? 1 : 0 }}
                  >
                    {onEdit && (
                      <ActionButton
                        onClick={() => setEditing(true)}
                        icon={
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-9.5l3 3m-3-3l-9 9V17h4.5l9-9m-3 0l3 3" />
                          </svg>
                        }
                        label="编辑"
                      />
                    )}
                    {onEdit && (
                      <span className="w-px h-3 mx-1" style={{ background: 'var(--hairline-strong)' }} />
                    )}
                    <ActionButton
                      onClick={handleCopy}
                      active={copied}
                      activeLabel="已复制"
                      icon={
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      }
                      label="复制"
                    />
                    {/* 剧情模式：用户消息回溯按钮 */}
                    {onBranchFromUser && (
                      <>
                        <span className="w-px h-3 mx-1" style={{ background: 'var(--hairline-strong)' }} />
                        <ActionButton
                          onClick={() => {
                            if (window.confirm('回溯到这条消息将清空之后的所有对话记录和 AI 记忆，从这条消息重新开始。是否继续？')) {
                              onBranchFromUser(message.id);
                            }
                          }}
                          icon={
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          }
                          label="回溯"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

// 操作按钮子组件
const ActionButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  activeLabel?: string;
}> = ({ onClick, icon, label, active, activeLabel }) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    onClick();
  };
  return (
    <button
      onClick={handleClick}
      className="ripple-host px-2 py-1 text-[10px] tracking-wider uppercase flex items-center gap-1.5 transition-quick press-shrink tactile-click ink-underline"
      style={{
        color: active ? 'var(--accent)' : 'var(--muted-2)',
        fontFamily: 'JetBrains Mono, monospace',
      }}
      title={label}
    >
      <span className="relative z-10 flex items-center gap-1.5">
        {icon}
        <span>{active && activeLabel ? activeLabel : label}</span>
      </span>
    </button>
  );
};
