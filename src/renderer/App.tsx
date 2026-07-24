import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';
import { CharacterPanel } from './components/CharacterPanel';
import { AuthPage } from './components/AuthPage';
import { LandingIndex } from './components/landing/Index';
import { useChatStore } from './store/chatStore';
import { useSettingsStore } from './store/settingsStore';
import { useCharacterStore } from './store/characterStore';
import { useAuthStore } from './store/authStore';
import { useStreamChat } from './hooks/useStreamChat';
import type { CreateConversationParams } from '../shared/types';

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [appLaunched, setAppLaunched] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 鉴权
  const auth = useAuthStore();

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
    resetConversation,
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

  // 启动时尝试自动登录
  useEffect(() => {
    auth.bootstrap();
  }, []);

  // 登录态变化时，加载该用户的数据
  useEffect(() => {
    if (auth.bootstrapped && auth.user) {
      loadConversations();
      loadSettings();
      loadCharacters();
    }
  }, [auth.bootstrapped, auth.user]);

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

  const handleCreate = useCallback(async (characterId?: string) => {
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
    return conv;
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
      if (!activeConversationId) {
        createConversation({ model: settings.model }).then((conv) => {
          selectConversation(conv.id).then(() => {
            setTimeout(() => sendMessage(content, options), 100);
          });
        });
      } else {
        sendMessage(content, options);
      }
    },
    [activeConversationId, createConversation, selectConversation, sendMessage, settings.model]
  );

  // ===== 路由逻辑 =====
  // 1) 启动中
  if (!auth.bootstrapped) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '180ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '360ms' }} />
          </div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Composing</div>
        </div>
      </div>
    );
  }

  // 2) 未登录 — 显示登录/注册页
  if (!auth.user) {
    return <AuthPage />;
  }

  // 3) 已登录 — Landing 页（一键进入工作台）
  if (!appLaunched) {
    return <LandingIndex onLaunchApp={() => setAppLaunched(true)} />;
  }

  // 4) 主工作台
  return (
    <div
      className="h-full flex relative"
      style={{ background: 'var(--paper)' }}
    >
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

      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={(id) => { handleSelect(id); setMobileSidebarOpen(false); }}
        onCreate={(characterId) => { handleCreate(characterId); setMobileSidebarOpen(false); }}
        onDelete={handleDelete}
        onRename={handleRename}
        onOpenSettings={() => { setShowSettings(true); setMobileSidebarOpen(false); }}
        onOpenCharacters={() => { setShowCharacters(true); setMobileSidebarOpen(false); }}
        onLogout={async () => {
          await auth.logout();
          setAppLaunched(false);
        }}
        currentUser={auth.user}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

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
        onResetConversation={resetConversation}
      />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
          onLogout={async () => {
            await auth.logout();
            setAppLaunched(false);
          }}
          currentUser={auth.user}
        />
      )}

      {showCharacters && (
        <CharacterPanel
          onClose={() => setShowCharacters(false)}
          onStartChat={async (characterId) => {
            const conv = await handleCreate(characterId);
            setShowCharacters(false);
            // 自动将开场白作为对话首条助手消息（无论是否剧情模式）
            if (conv) {
              const character = characters.find(c => c.id === characterId);
              if (character && character.greeting && character.greeting.trim()) {
                try {
                  await saveMessage({
                    role: 'assistant',
                    content: character.greeting.trim(),
                    parentMessageId: null,
                    isActiveVersion: true,
                  });
                } catch (err) {
                  console.error('Failed to save greeting as first message:', err);
                }
              }
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
