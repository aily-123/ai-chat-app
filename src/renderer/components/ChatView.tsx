import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MessageItem } from './MessageItem';
import { InputArea } from './InputArea';
import { BackgroundPanel } from './BackgroundPanel';
import { PlotPanel } from './PlotPanel';
import { MemoryPanel } from './MemoryPanel';
import { KbdGlowGroup } from './KeyboardShine';
import { ScrollReveal } from './ScrollReveal';
import { useSettingsStore } from '../store/settingsStore';
import type { Message, Conversation, Character } from '../../shared/types';

interface Props {
  conversation: Conversation | undefined;
  messages: Message[];
  /** 所有消息（含历史版本，用于版本切换显示） */
  allMessages?: Message[];
  character: Character | undefined;
  isStreaming: boolean;
  isSummarizing?: boolean;
  isExtractingFacts?: boolean;
  isSearching?: boolean;
  streamingContent: string;
  error: string | null;
  onSend: (content: string, options?: { parentMessageId?: string | null; branchMode?: boolean }) => void;
  onStop: () => void;
  onClearError: () => void;
  onUpdateConversation: (id: string, params: Partial<Conversation>) => Promise<void>;
  onRegenerateMemory?: () => void;
  onRebuildFacts?: () => void;
  onSaveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | void>;
  onSwitchVersion?: (messageId: string) => Promise<void>;
  onBranchFrom?: (messageId: string) => Promise<void>;
  /** 清空式回溯：删除该消息及之后所有消息，并清空 AI 记忆（剧情模式用户消息专用） */
  onClearFromMessage?: (messageId: string) => Promise<void>;
  /** 删除该 AI 消息及之后所有消息，并清空 AI 记忆（用于重写 AI 回复） */
  onClearAfterMessage?: (messageId: string) => Promise<void>;
}

export const ChatView: React.FC<Props> = ({
  conversation,
  messages,
  allMessages = [],
  character,
  isStreaming,
  isSummarizing,
  isExtractingFacts,
  isSearching,
  streamingContent,
  error,
  onSend,
  onStop,
  onClearError,
  onUpdateConversation,
  onRegenerateMemory,
  onRebuildFacts,
  onSaveMessage,
  onSwitchVersion,
  onBranchFrom,
  onClearFromMessage,
  onClearAfterMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [showPlotPanel, setShowPlotPanel] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [initialInput, setInitialInput] = useState<string | undefined>(undefined);
  const prevMsgCountRef = useRef(0);
  const userScrolledRef = useRef(false);
  const { settings, update: updateSettings } = useSettingsStore();

  // 按 parentMessageId 分组助手消息，用于版本切换显示
  const siblingVersionsMap = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const m of allMessages) {
      if (m.role === 'assistant' && m.parentMessageId) {
        const list = map.get(m.parentMessageId) || [];
        list.push(m);
        map.set(m.parentMessageId, list);
      }
    }
    // 排序每个版本组（按 version 升序）
    for (const [key, list] of map) {
      list.sort((a, b) => (a.version || 1) - (b.version || 1));
      map.set(key, list);
    }
    return map;
  }, [allMessages]);

  // 滚动监听
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 80;

    setShowScrollBtn(!isAtBottom);
    setHeaderScrolled(scrollTop > 12);
    setScrollProgress(Math.min(1, scrollTop / Math.max(1, scrollHeight - clientHeight)));

    if (isAtBottom) {
      setHasNewMessage(false);
      userScrolledRef.current = false;
    } else {
      userScrolledRef.current = true;
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // 如果用户在底部，或者新消息到来，自动滚动
    if (!userScrolledRef.current || messages.length > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (messages.length > prevMsgCountRef.current) {
      // 用户滚到了上面但有新消息
      setHasNewMessage(true);
    }
    // 清除初始输入（如果消息数量增加，说明已发送）
    if (messages.length > prevMsgCountRef.current) {
      setInitialInput(undefined);
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, streamingContent]);

  // 切换对话时重置
  useEffect(() => {
    if (conversation?.id) {
      userScrolledRef.current = false;
      setHasNewMessage(false);
      prevMsgCountRef.current = 0;
      setInitialInput(undefined);
      // 立即滚到底部
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
  }, [conversation?.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessage(false);
  }, []);

  // 处理版本切换
  const handleSwitchVersion = useCallback(async (messageId: string) => {
    if (onSwitchVersion) {
      await onSwitchVersion(messageId);
    }
  }, [onSwitchVersion]);

  /**
   * AI 消息回溯（重写 AI 回复）：
   * - 删除这条 AI 消息及之后的所有消息
   * - 清空 AI 记忆
   * - 找到对应的父用户消息，重新发送（让 AI 重新回复）
   */
  const handleBranchFrom = useCallback(async (assistantMessageId: string) => {
    if (!conversation || isStreaming) return;

    const assistantMsg = messages.find(m => m.id === assistantMessageId);
    if (!assistantMsg || assistantMsg.role !== 'assistant') return;

    // 找到对应的父用户消息
    const userMsg = assistantMsg.parentMessageId
      ? messages.find(m => m.id === assistantMsg.parentMessageId)
      : null;
    const userContent = userMsg?.content || '';

    // 删除这条 AI 消息及其之后的所有消息，并清空 AI 记忆
    if (onClearAfterMessage) {
      await onClearAfterMessage(assistantMessageId);
    } else if (onBranchFrom) {
      // 兼容旧路径
      await onBranchFrom(assistantMessageId);
    }

    // 重新生成 AI 回复：如果有对应的用户消息，则重新触发；
    // 否则直接重发该 AI 消息的内容让 AI 重新生成
    if (userContent) {
      onSend(userContent, { parentMessageId: null, branchMode: false });
    }
  }, [conversation, messages, isStreaming, onClearAfterMessage, onBranchFrom, onSend]);

  /**
   * 用户消息回溯（剧情模式专用）：
   * - 删除这条用户消息本身及其之后的所有消息
   * - 清空 AI 记忆（关键事实清单 + 长期摘要）
   * - 将用户消息内容填充到输入框供编辑
   */
  const handleBranchFromUser = useCallback(async (userMessageId: string) => {
    if (!conversation || isStreaming) return;

    const userMsg = messages.find(m => m.id === userMessageId);
    if (!userMsg || userMsg.role !== 'user') return;

    const userContent = userMsg.content;

    // 清空式回溯：删除该消息及之后所有消息 + 重置 AI 记忆
    if (onClearFromMessage) {
      await onClearFromMessage(userMessageId);
    }

    // 将用户消息填充到输入框供编辑，而不是立即发送
    setInitialInput(userContent);
  }, [conversation, messages, isStreaming, onClearFromMessage]);

  // 处理重写（最后一条助手消息）：复用 AI 消息回溯逻辑
  const handleRegenerateLast = useCallback(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant && !isStreaming) {
      handleBranchFrom(lastAssistant.id);
    }
  }, [messages, isStreaming, handleBranchFrom]);

  if (!conversation) {
    return (
      <main
        className="flex-1 flex items-stretch relative z-10 grain overflow-hidden pt-12 md:pt-0"
        style={{ background: 'var(--paper)' }}
      >
        <div className="w-full h-full flex flex-col md:flex-row fade-in">
          {/* Left — Invitation column */}
          <div className="flex-1 flex flex-col justify-between px-6 md:px-14 py-8 md:py-10 max-w-full md:max-w-[58%]">
            {/* Top editorial label */}
            <div className="flex items-baseline gap-2.5">
              <span className="numeric-badge">N° 01</span>
              <div className="w-10 h-px" style={{ background: 'var(--hairline-strong)' }} />
              <span className="eyebrow eyebrow-accent">— An Invitation —</span>
              <div className="w-10 h-px" style={{ background: 'var(--hairline-strong)' }} />
              <span className="numeric-badge">2026</span>
            </div>

            {/* Center — Hero with drop cap */}
            <div className="flex-1 flex flex-col justify-center -mt-4">
              <ScrollReveal variant="from-left" delay={100}>
                <div className="relative">
                  {/* Decorative marginalia — left side */}
                  <span
                    className="absolute -left-10 top-3 font-display italic text-[var(--accent)] text-[11px] tracking-[0.3em] uppercase"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    A Letter to the Reader
                  </span>

                  <h2
                    className="font-display text-[52px] leading-[1.05] font-light tracking-[-0.04em] mb-5"
                    style={{ color: 'var(--ink)' }}
                  >
                    <span className="drop-cap text-[64px]">开</span>
                    始你的<br />
                    <em className="italic font-extralight" style={{ color: 'var(--accent)' }}>第一段</em>对话
                  </h2>
                  <p
                    className="text-[13.5px] leading-[1.8] max-w-[440px] indent-8"
                    style={{ color: 'var(--muted)' }}
                  >
                    从左侧选择一个对话继续，或创建一位全新的角色，开启自由聊天、剧情演绎与长期陪伴。
                    每一段对话都是一次相遇，每一句话都可能成为故事的开端。
                  </p>
                </div>
              </ScrollReveal>

              {/* Refined keyboard hints — with mouse-following shine */}
              <ScrollReveal variant="block" delay={400}>
                <KbdGlowGroup
                  className="mt-6 flex items-center gap-2 text-[10.5px] tracking-[0.2em] uppercase relative"
                  reach={120}
                  maxGlow={0.6}
                  smoothing={0.22}
                >
                  <span>Press</span>
                  <kbd className="px-2 py-1 hairline rounded-sm text-[10px] font-mono" style={{ color: 'var(--ink)' }}>N</kbd>
                  <span>to begin</span>
                  <span className="w-1 h-1 rounded-full mx-1.5" style={{ background: 'var(--muted-2)' }} />
                  <kbd className="px-1.5 py-1 hairline rounded-sm text-[10px] font-mono" style={{ color: 'var(--ink)' }}>↵</kbd>
                  <span>to send</span>
                  <span className="w-1 h-1 rounded-full mx-1.5" style={{ background: 'var(--muted-2)' }} />
                  <kbd className="px-1.5 py-1 hairline rounded-sm text-[10px] font-mono" style={{ color: 'var(--ink)' }}>/</kbd>
                  <span>shortcuts</span>
                  {/* Diagonal auto-sweep streak */}
                  <span className="keyboard-sweep" aria-hidden="true" />
                </KbdGlowGroup>
              </ScrollReveal>
            </div>

            {/* Bottom — Quote marginalia */}
            <div className="flex items-end gap-4">
              <div className="w-8 h-px" style={{ background: 'var(--ink)' }} />
              <p
                className="font-display italic text-[12.5px] leading-[1.5] max-w-[320px]"
                style={{ color: 'var(--ink-2)' }}
              >
                "对话是灵魂的呼吸。"
              </p>
              <span className="numeric-badge opacity-50 mb-0.5">— A.M.</span>
            </div>
          </div>

          {/* Right — Editorial features (hidden on mobile) */}
          <div
            className="hidden md:flex w-full md:w-[42%] max-w-full md:max-w-[480px] md:min-w-[380px] hairline-l flex-col relative"
            style={{ background: 'var(--surface)' }}
          >
            {/* Decorative corner mark */}
            <div className="absolute top-3 right-4 numeric-badge opacity-30">§ 01</div>

            {/* Issue header */}
            <div className="px-8 py-4 hairline-b relative">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="eyebrow">The Issue</span>
                <span className="numeric-badge">04 / 04</span>
              </div>
              <h3
                className="font-display text-[20px] font-light tracking-[-0.015em]"
                style={{ color: 'var(--ink)' }}
              >
                序章 · <em className="italic" style={{ color: 'var(--accent)' }}>开场白</em>
              </h3>
              <p
                className="text-[11px] tracking-wide mt-1.5 max-w-[280px] leading-[1.5]"
                style={{ color: 'var(--muted-2)' }}
              >
                关于此应用的四个核心能力 —— 让每一次对话都更具意义。
              </p>
            </div>

            {/* Features list — 2x2 grid for visual balance */}
            <div className="flex-1 grid grid-cols-2 auto-rows-fr p-px" style={{ background: 'var(--hairline)' }}>
              {[
                {
                  mark: '01',
                  name: '智能对话',
                  en: 'Natural Chat',
                  desc: '与 AI 自然交流，理解上下文与意图。',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ),
                },
                {
                  mark: '02',
                  name: '角色扮演',
                  en: 'Character',
                  desc: '塑造独立人格、语气与记忆特征。',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                },
                {
                  mark: '03',
                  name: '剧情演绎',
                  en: 'Plot Mode',
                  desc: '自定义世界观，AI 严格遵循设定推进。',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  ),
                },
                {
                  mark: '04',
                  name: '长期记忆',
                  en: 'Long-term Memory',
                  desc: '自动压缩早期消息，保留关键剧情。',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  ),
                },
              ].map((f, i) => (
                <div
                  key={f.mark}
                  className="feature-card cinematic-fade"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <span className="feature-icon">
                      <span className="w-3.5 h-3.5">{f.icon}</span>
                    </span>
                    <span className="feature-mark">{f.mark}</span>
                  </div>

                  <div className="flex-1">
                    <span
                      className="text-[14px] font-medium tracking-[-0.005em] block"
                      style={{ color: 'var(--ink)' }}
                    >
                      {f.name}
                    </span>
                    <p
                      className="text-[10px] tracking-[0.18em] uppercase mt-0.5 mb-1.5"
                      style={{ color: 'var(--muted-2)' }}
                    >
                      {f.en}
                    </p>
                    <p
                      className="text-[11.5px] leading-[1.5]"
                      style={{ color: 'var(--muted)' }}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer — pull-quote with refined typography */}
            <div
              className="px-7 py-4 hairline-t relative"
              style={{ background: 'var(--paper-2)' }}
            >
              <div className="absolute -top-px left-7 right-7 h-px rule-accent" />
              <p className="pull-quote text-[14.5px]">
                "每一段对话，<br />都是一次新的相遇。"
              </p>
              <div className="flex items-baseline justify-between mt-2.5">
                <p
                  className="text-[10px] tracking-[0.2em] uppercase"
                  style={{ color: 'var(--muted-2)' }}
                >
                  — Editorial Note
                </p>
                <span className="numeric-badge opacity-60">P. 01</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 决定背景图：对话级 background 优先，回退到全局 wallpaper
  const convBg = conversation.background || '';
  const isConvBgSet = convBg.length > 0;
  const bgImage = isConvBgSet ? convBg : (settings.wallpaper || '');
  const bgOpacity = isConvBgSet
    ? (conversation.backgroundOpacity ?? 0.92)
    : (settings.wallpaperOpacity ?? 0.92);
  const bgFilter = isConvBgSet
    ? (conversation.backgroundFilter || '')
    : (settings.wallpaperFilter || '');
  const bgAnimation = isConvBgSet
    ? (conversation.backgroundAnimation || 'none')
    : (settings.wallpaperAnimation || 'none');

  const isGradientOrImage = bgImage && (
    bgImage.startsWith('linear') || bgImage.startsWith('radial') ||
    bgImage.startsWith('http') || bgImage.startsWith('data:') ||
    bgImage.startsWith('#') || bgImage.startsWith('conic')
  );

  // 动画 class
  const animationClass =
    bgAnimation === 'gradient-flow' ? 'bg-anim-gradient-flow' :
    bgAnimation === 'pulse' ? 'bg-anim-pulse' :
    bgAnimation === 'drift' ? 'bg-anim-drift' :
    ''; // parallax 已通过 scroll 处理

  return (
    <main className="flex-1 flex flex-col relative z-10 min-w-0 pt-12 md:pt-0">
      {/* 顶部细线进度条 — 阅读进度（advanced gradient） */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] z-30 transition-quick scroll-progress"
        style={{
          opacity: headerScrolled ? 1 : 0,
        }}
        aria-hidden="true"
      >
        <div
          className="bar"
          style={{
            ['--progress' as any]: `${scrollProgress * 100}%`,
            background: 'linear-gradient(90deg, var(--accent) 0%, var(--ink) 100%)',
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>

      {/* 对话级背景 — with subtle parallax on scroll */}
      {bgImage && (
        <div
          className={`absolute inset-0 z-0 pointer-events-none parallax-container ${animationClass}`}
          aria-hidden="true"
        >
          <div
            className="parallax-layer bg-fade-layer"
            style={{
              background: bgImage.startsWith('http') || bgImage.startsWith('data:')
                ? `url(${bgImage})`
                : bgImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transform: bgAnimation === 'parallax'
                ? `translateY(${scrollProgress * -12}px) scale(${1 + scrollProgress * 0.02})`
                : undefined,
              transition: 'transform 0.15s linear, background 0.4s ease, filter 0.4s ease, opacity 0.4s ease',
              filter: bgFilter || undefined,
            }}
          />
        </div>
      )}
      {/* 背景柔化层（保证可读性） */}
      {bgImage && (
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-fade-layer"
          style={{
            backgroundColor: `rgba(244,241,234,${1 - bgOpacity})`,
            transition: 'background-color 0.4s ease',
          }}
        />
      )}
      {/* Grain */}
      <div className="absolute inset-0 z-0 pointer-events-none grain" />

      {/* 顶部标题栏 */}
      <header
        className={`px-4 md:px-8 py-3 hairline-b flex items-center gap-3 md:gap-5 z-20 relative transition-quick ${
          headerScrolled ? 'header-scrolled' : ''
        }`}
        style={{
          backgroundColor: bgImage
            ? `rgba(244, 241, 234, ${headerScrolled ? 0.92 : 0})`
            : 'var(--paper)',
          backdropFilter: headerScrolled && bgImage ? 'blur(12px) saturate(120%)' : 'none',
        }}
      >
        {/* 角色头像 */}
        {character?.avatar ? (
          <img
            src={character.avatar}
            alt={character.name}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-[var(--hairline-strong)] flex-shrink-0 transition-quick hover:ring-[var(--accent)] press-shrink"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--paper)] font-display text-[16px] font-medium flex-shrink-0 transition-quick hover:scale-105"
            style={{ background: 'var(--ink)' }}
          >
            {(character?.name || 'A').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <h2
              className="font-display text-[22px] font-light tracking-[-0.02em] truncate"
              style={{ color: 'var(--ink)' }}
            >
              {character?.name || conversation.title}
            </h2>
            {conversation.plotMode && (
              <span
                className="text-[10px] tracking-[0.2em] uppercase font-medium flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                <span className="w-1 h-1 rounded-full pulse-soft" style={{ background: 'var(--accent)' }} />
                剧情
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>
            <span className="numeric-badge">{conversation.model}</span>
            <span className="w-[2px] h-[2px] rounded-full" style={{ background: 'var(--muted-2)' }} />
            <span>{messages.length} messages</span>
            {(conversation.memorySummary || conversation.memoryFacts) && (
              <>
                <span className="w-[2px] h-[2px] rounded-full" style={{ background: 'var(--muted-2)' }} />
                <span
                  className="numeric-badge cursor-pointer hover:underline"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => setShowMemoryPanel(true)}
                  title="点击查看记忆库"
                >
                  ⌬ memory
                </span>
              </>
            )}
            {isExtractingFacts && (
              <>
                <span className="w-[2px] h-[2px] rounded-full" style={{ background: 'var(--muted-2)' }} />
                <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                  <span className="w-1 h-1 rounded-full pulse-soft" style={{ background: 'var(--accent)' }} />
                  memorizing
                </span>
              </>
            )}
            {isStreaming && (
              <>
                <span className="w-[2px] h-[2px] rounded-full" style={{ background: 'var(--muted-2)' }} />
                <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                  <span className="w-1 h-1 rounded-full pulse-soft" style={{ background: 'var(--accent)' }} />
                  streaming
                </span>
              </>
            )}
          </div>
        </div>

        {/* 顶部操作 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPlotPanel(true)}
            className={`group flex items-center gap-2 px-3 py-1.5 text-[11.5px] tracking-wider transition-quick ${
              conversation.plotMode
                ? 'text-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
            title="剧情模式"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="hidden md:inline">剧情</span>
          </button>
          <span className="w-px h-4 mx-1" style={{ background: 'var(--hairline-strong)' }} />
          <button
            onClick={() => setShowBgPanel(true)}
            className="group flex items-center gap-2 px-3 py-1.5 text-[11.5px] tracking-wider text-[var(--muted)] hover:text-[var(--ink)] transition-quick"
            title="对话背景"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden md:inline">背景</span>
          </button>
          <span className="w-px h-4 mx-1" style={{ background: 'var(--hairline-strong)' }} />
          <button
            onClick={() => setShowMemoryPanel(true)}
            className={`group flex items-center gap-2 px-3 py-1.5 text-[11.5px] tracking-wider transition-quick ${
              conversation.memoryFacts || conversation.memorySummary
                ? 'text-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
            title="记忆库（关键事实 / 长期摘要 / 剧情进度）"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="hidden md:inline">记忆</span>
          </button>
        </div>
      </header>

      {/* 消息列表 */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative z-10 scroll-area"
      >
        <div key={conversation?.id || 'empty'} className="max-w-3xl mx-auto px-4 md:px-8 py-6 page-transition">
          {messages.length === 0 && !isStreaming && (
            <div className="text-center mt-12 fade-in">
              <div className="eyebrow mb-5">— Opening —</div>
              {character ? (
                <h3
                  className="font-display text-[36px] font-light leading-[1.15] tracking-[-0.02em] mb-4"
                  style={{ color: 'var(--ink)' }}
                >
                  与 <em className="italic" style={{ color: 'var(--accent)' }}>{character.name}</em><br />
                  开启这段对话
                </h3>
              ) : (
                <h3
                  className="font-display text-[36px] font-light leading-[1.15] tracking-[-0.02em] mb-4"
                  style={{ color: 'var(--ink)' }}
                >
                  发送你的<br /><em className="italic" style={{ color: 'var(--accent)' }}>第一条消息</em>
                </h3>
              )}

              {conversation.plotMode && conversation.plotSetting && (
                <div className="mt-8 max-w-lg mx-auto text-left p-6 hairline relative cinematic-fade">
                  <div className="absolute top-0 left-6 right-6 h-px" style={{ background: 'var(--accent)' }} />
                  <div className="eyebrow eyebrow-accent mb-3">当前剧情</div>
                  <p
                    className="text-[13px] leading-[1.85] whitespace-pre-wrap"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {conversation.plotSetting.slice(0, 280)}{conversation.plotSetting.length > 280 ? '…' : ''}
                  </p>
                </div>
              )}

              {/* 滚动提示 */}
              {messages.length === 0 && (
                <div className="mt-12 opacity-30 animate-bounce-slow">
                  <svg
                    className="w-5 h-5 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    style={{ color: 'var(--muted)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              )}
            </div>
          )}

          {messages.map((msg, idx) => {
            // 计算这条助手消息的同父版本列表
            let siblingVersions: Message[] = [];
            let activeVersionIndex = 0;
            if (msg.role === 'assistant' && msg.parentMessageId) {
              siblingVersions = siblingVersionsMap.get(msg.parentMessageId) || [];
              activeVersionIndex = siblingVersions.findIndex(m => m.id === msg.id);
              if (activeVersionIndex < 0) activeVersionIndex = 0;
            }

            // 是否为剧情模式（用户消息在剧情模式下也显示回溯按钮）
            const isPlotMode = conversation.plotMode;
            // 是否为首条用户消息（首条不能回溯，否则会清空整个对话）
            const isFirstUserMessage = msg.role === 'user' &&
              messages.findIndex(m => m.role === 'user') === idx;

            return (
              <MessageItem
                key={msg.id}
                message={msg}
                characterName={character?.name}
                characterAvatar={character?.avatar}
                index={idx}
                isLast={idx === messages.length - 1}
                isPlotMode={isPlotMode}
                siblingVersions={siblingVersions}
                activeVersionIndex={activeVersionIndex}
                onSwitchVersion={onSwitchVersion ? handleSwitchVersion : undefined}
                // AI 消息：回溯重写
                onBranchFrom={msg.role === 'assistant' && onClearAfterMessage ? handleBranchFrom : undefined}
                // 用户消息：仅剧情模式 + 非首条时显示回溯
                onBranchFromUser={
                  msg.role === 'user' && isPlotMode && !isFirstUserMessage && onClearFromMessage
                    ? handleBranchFromUser
                    : undefined
                }
                onRegenerate={msg.role === 'assistant' && idx === messages.length - 1 && !isStreaming ? handleRegenerateLast : undefined}
                onEdit={(newContent) => {
                  if (!isStreaming) {
                    onSend(newContent);
                  }
                }}
              />
            );
          })}

          {/* 流式输出中的消息 */}
          {isStreaming && streamingContent && (
            <MessageItem
              message={{
                id: '_streaming',
                conversationId: conversation.id,
                role: 'assistant',
                content: streamingContent,
                tokens: 0,
                createdAt: Date.now(),
                parentMessageId: null,
                version: 1,
                isActiveVersion: true,
              }}
              isStreaming
              streamingContent={streamingContent}
              characterName={character?.name}
              characterAvatar={character?.avatar}
            />
          )}

          {/* 加载中的空状态 — skeleton bubble */}
          {isStreaming && !streamingContent && (
            <div className="flex items-start gap-4 mb-6 message-enter-left">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--paper)] font-display text-[14px] flex-shrink-0"
                style={{ background: 'var(--ink)' }}
              >
                {(character?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="pt-2.5 flex-1 max-w-md">
                <div className="eyebrow mb-3 flex items-center gap-2">
                  {character?.name || 'Assistant'}
                  <span className="text-[var(--muted-2)]">— composing</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] ai-streaming-dot" />
                </div>
                <div className="space-y-2.5">
                  <span className="skeleton-line is-long" style={{ height: '10px' }} />
                  <span className="skeleton-line is-content" style={{ height: '10px' }} />
                  <span className="skeleton-line is-medium" style={{ height: '10px' }} />
                </div>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex justify-center mb-4 fade-in">
              <div
                className="hairline px-5 py-3 text-[12.5px] flex items-center gap-3 rounded-sm cinematic-rise"
                style={{ color: 'var(--accent)', background: 'var(--surface)' }}
              >
                <span className="font-display italic text-[14px]">!</span>
                <span>{error}</span>
                <button
                  onClick={onClearError}
                  className="ml-2 opacity-60 hover:opacity-100 transition-quick press-shrink"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 滚动到底部按钮 — 编辑设计风格 */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className={`sticky bottom-4 left-1/2 -translate-x-1/2 mx-auto flex items-center gap-2 px-3.5 py-2 hairline rounded-sm transition-quick cinematic-rise press-shrink z-30 ${
              hasNewMessage ? 'has-new' : ''
            }`}
            style={{
              background: 'var(--paper)',
              color: hasNewMessage ? 'var(--accent)' : 'var(--muted)',
            }}
            title="滚到底部"
          >
            {hasNewMessage ? (
              <>
                <span
                  className="w-1.5 h-1.5 rounded-full pulse-soft"
                  style={{ background: 'var(--accent)' }}
                />
                <span className="text-[11.5px] font-mono-ui tracking-[0.1em] uppercase">新消息</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-[11.5px] font-mono-ui tracking-[0.1em] uppercase">回到底部</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 输入区域 */}
      <div
        className="z-20 relative hairline-t"
        style={{
          backgroundColor: 'var(--paper)',
        }}
      >
        <InputArea
          onSend={onSend}
          onStop={onStop}
          isStreaming={isStreaming}
          isSummarizing={isSummarizing}
          isSearching={isSearching}
          disabled={!conversation}
          webSearchEnabled={settings.webSearchEnabled}
          onToggleWebSearch={() => {
            updateSettings({ webSearchEnabled: !settings.webSearchEnabled });
          }}
          initialInput={initialInput}
          placeholder={
            conversation.plotMode
              ? '推进剧情…（可用 [行动] 指令）'
              : character
                ? `与 ${character.name} 对话…`
                : '说点什么…'
          }
        />
      </div>

      {/* 背景设置面板 */}
      {showBgPanel && (
        <BackgroundPanel
          background={conversation.background}
          backgroundOpacity={conversation.backgroundOpacity}
          backgroundFilter={conversation.backgroundFilter}
          backgroundAnimation={conversation.backgroundAnimation}
          conversation={conversation}
          character={character}
          onUpdate={async (data) => {
            await onUpdateConversation(conversation.id, data);
          }}
          onClose={() => setShowBgPanel(false)}
        />
      )}

      {/* 剧情设置面板 */}
      {showPlotPanel && (
        <PlotPanel
          conversation={conversation}
          messageCount={messages.length}
          characterGreeting={character?.greeting}
          onUpdate={async (data) => {
            await onUpdateConversation(conversation.id, data);
          }}
          onSaveGreeting={async (content) => {
            await onSaveMessage({ role: 'assistant', content });
          }}
          onClose={() => setShowPlotPanel(false)}
        />
      )}

      {/* 记忆库面板 */}
      {showMemoryPanel && (
        <MemoryPanel
          conversation={conversation}
          messageCount={messages.length}
          isExtractingFacts={isExtractingFacts}
          isSummarizing={isSummarizing}
          onUpdate={async (data) => {
            await onUpdateConversation(conversation.id, data);
          }}
          onRebuildFacts={onRebuildFacts}
          onRegenerateMemory={onRegenerateMemory}
          onClose={() => setShowMemoryPanel(false)}
        />
      )}
    </main>
  );
};
