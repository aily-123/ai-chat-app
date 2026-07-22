import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';
import { CharacterPanel } from './components/CharacterPanel';
import { LandingIndex } from './components/landing/Index';
import { useChatStore } from './store/chatStore';
import { useSettingsStore } from './store/settingsStore';
import { useCharacterStore } from './store/characterStore';
import { useStreamChat } from './hooks/useStreamChat';
import type { CreateConversationParams } from '../shared/types';

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  // Landing is the first screen users see. From there the only way forward
  // is into the chat. Once inside the chat, there is no path back.
  const [appLaunched, setAppLaunched] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 全局状态
  const {
    conversations,
    conversationsLoaded,
    activeConversationId,
    messages,
    allMessages,
    messagesLoaded,
    loadConversations,
    createConversation,
    deleteConversation,
    updateConversation,
    selectConversation,
    saveMessage,
    branchFromMessage,
    switchVersion,
    clearFromMessage,
    clearAfterMessage,
  } = useChatStore();

  const { settings, loaded: settingsLoaded, load: loadSettings, update: updateSettings } = useSettingsStore();
  const { characters, loadCharacters } = useCharacterStore();

  // 当前对话对象
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeCharacter = activeConversation?.characterId
    ? characters.find((c) => c.id === activeConversation.characterId)
    : undefined;

  // 流式聊天 hook
  const {
    sendMessage,
    stopStreaming,
    isStreaming,
    streamingContent,
    isSummarizing,
    isExtractingFacts,
    isSearching,
    error,
    clearError,
    regenerateMemory,
    rebuildFacts,
  } = useStreamChat({
    settings,
    messages,
    conversation: activeConversation,
    onSaveMessage: saveMessage,
    onUpdateConversation: async (params) => {
      if (activeConversationId) {
        await updateConversation(activeConversationId, params);
      }
    },
  });

  // 首次加载
  useEffect(() => {
    loadConversations();
    loadSettings();
    loadCharacters();
  }, []);

  // 主题切换
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // 自动打开第一个对话
  useEffect(() => {
    if (conversationsLoaded && conversations.length > 0 && !activeConversationId) {
      selectConversation(conversations[0].id);
    }
  }, [conversationsLoaded]);

  // 背景由 ChatView 自己渲染（对话级 background 优先，回退到全局 wallpaper）
  // 这里不再渲染冗余的全局背景层，避免与 ChatView 的背景层重叠导致"旧背景残留"视觉问题

  const handleCreate = useCallback(async (characterId?: string) => {
    // 如果指定了角色，从角色数据中复制背景到新对话
    let backgroundParams: Partial<CreateConversationParams> = {};
    if (characterId) {
      const character = characters.find(c => c.id === characterId);
      if (character && character.background) {
        backgroundParams = {
          background: character.background,
          backgroundOpacity: character.backgroundOpacity,
          backgroundFilter: character.backgroundFilter,
          backgroundAnimation: character.backgroundAnimation,
        };
      }
    }
    const conv = await createConversation({ model: settings.model, characterId, ...backgroundParams });
    selectConversation(conv.id);
  }, [createConversation, selectConversation, settings.model, characters]);

  const handleSelect = useCallback(
    (id: string) => {
      if (id !== activeConversationId) {
        selectConversation(id);
      }
    },
    [activeConversationId, selectConversation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteConversation(id);
    },
    [deleteConversation]
  );

  const handleRename = useCallback(
    (id: string, title: string) => {
      updateConversation(id, { title });
    },
    [updateConversation]
  );

  const handleSend = useCallback(
    (content: string, options?: { parentMessageId?: string | null; branchMode?: boolean }) => {
      // 如果还没有活跃对话，自动创建一个
      if (!activeConversationId) {
        createConversation({ model: settings.model }).then((conv) => {
          selectConversation(conv.id).then(() => {
            // 需要在下一次渲染后才能发送
            setTimeout(() => sendMessage(content, options), 100);
          });
        });
      } else {
        sendMessage(content, options);
      }
    },
    [activeConversationId, createConversation, selectConversation, sendMessage, settings.model]
  );

  // SENTINEL landing page is the first thing users see.
  // "Enter Studio" dismisses it and reveals the chat experience.
  // One-way flow: Landing → Chat. There is no back-button.
  if (!appLaunched) {
    return <LandingIndex onLaunchApp={() => setAppLaunched(true)} />;
  }

  return (
    <div
      className="h-full flex relative"
      style={{ background: 'var(--paper)' }}
    >
      {/* Initial loading skeleton — elegant paper-style */}
      {!conversationsLoaded || !settingsLoaded ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--paper)' }}>
          <div className="flex flex-col items-center gap-5 fade-in">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] ai-streaming-dot" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] ai-streaming-dot" style={{ animationDelay: '180ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] ai-streaming-dot" style={{ animationDelay: '360ms' }} />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="eyebrow tracking-[0.3em]">Composing</span>
              <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--muted-2)' }}>Your story begins…</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 背景由 ChatView 内部渲染（对话级 background 优先，回退到全局 wallpaper），
          不再在此处渲染冗余的全局背景层，避免双层重叠导致背景替换时旧背景残留 */}

      {/* 移动端顶部导航栏 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 hairline-b" style={{ background: 'var(--surface)' }}>
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-1.5 -ml-1 press-shrink"
          style={{ color: 'var(--ink)' }}
          aria-label="打开菜单"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <span className="font-display text-[16px] font-light tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Atelier</span>
        <button
          onClick={() => { setShowCharacters(true); }}
          className="p-1.5 -mr-1 press-shrink"
          style={{ color: 'var(--ink)' }}
          aria-label="新对话"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* 移动端侧边栏遮罩 */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 左侧边栏 */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={(id) => { handleSelect(id); setMobileSidebarOpen(false); }}
        onCreate={(characterId) => { handleCreate(characterId); setMobileSidebarOpen(false); }}
        onDelete={handleDelete}
        onRename={handleRename}
        onOpenSettings={() => { setShowSettings(true); setMobileSidebarOpen(false); }}
        onOpenCharacters={() => { setShowCharacters(true); setMobileSidebarOpen(false); }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* 中间聊天区域 */}
      <ChatView
        conversation={activeConversation}
        messages={messages}
        allMessages={allMessages}
        character={activeCharacter}
        isStreaming={isStreaming}
        isSummarizing={isSummarizing}
        isExtractingFacts={isExtractingFacts}
        isSearching={isSearching}
        streamingContent={streamingContent}
        error={error}
        onSend={handleSend}
        onStop={stopStreaming}
        onClearError={clearError}
        onUpdateConversation={async (id, params) => {
          await updateConversation(id, params);
        }}
        onRegenerateMemory={regenerateMemory}
        onRebuildFacts={rebuildFacts}
        onSaveMessage={saveMessage}
        onSwitchVersion={switchVersion}
        onBranchFrom={branchFromMessage}
        onClearFromMessage={clearFromMessage}
        onClearAfterMessage={clearAfterMessage}
      />

      {/* 设置弹窗 — with page transition */}
      {showSettings && (
        <div key="settings-modal" className="modal-backdrop fade-in" onClick={() => setShowSettings(false)}>
          <div
            className="modal-panel slide-right"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <SettingsPanel
              settings={settings}
              onUpdate={updateSettings}
              onClose={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}

      {/* 角色管理弹窗 — with page transition */}
      {showCharacters && (
        <div key="characters-modal" className="modal-backdrop fade-in" onClick={() => setShowCharacters(false)}>
          <div
            className="modal-panel slide-right"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <CharacterPanel
              onClose={() => setShowCharacters(false)}
              onStartChat={(characterId) => {
                handleCreate(characterId);
                setShowCharacters(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
