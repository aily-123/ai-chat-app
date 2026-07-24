import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Conversation } from '../../shared/types';

interface Props {
  conversation: Conversation;
  messageCount: number;
  isExtractingFacts?: boolean;
  isSummarizing?: boolean;
  onUpdate: (data: Partial<Conversation>) => void;
  onRebuildFacts?: () => void;
  onRegenerateMemory?: () => void;
  onClose: () => void;
}

export const MemoryPanel: React.FC<Props> = ({
  conversation,
  messageCount,
  isExtractingFacts = false,
  isSummarizing = false,
  onUpdate,
  onRebuildFacts,
  onRegenerateMemory,
  onClose,
}) => {
  const [memoryFacts, setMemoryFacts] = useState(conversation.memoryFacts || '');
  const [memorySummary, setMemorySummary] = useState(conversation.memorySummary || '');
  const [plotProgress, setPlotProgress] = useState(conversation.plotProgress || '');
  const [activeTab, setActiveTab] = useState<'facts' | 'summary' | 'progress'>('facts');
  const [editMode, setEditMode] = useState(false);

  // 切换对话时重置
  useEffect(() => {
    setMemoryFacts(conversation.memoryFacts || '');
    setMemorySummary(conversation.memorySummary || '');
    setPlotProgress(conversation.plotProgress || '');
    setEditMode(false);
  }, [conversation.id, conversation.memoryFacts, conversation.memorySummary, conversation.plotProgress]);

  const handleSave = () => {
    onUpdate({
      memoryFacts,
      memorySummary,
      plotProgress,
    });
    setEditMode(false);
  };

  const handleClearFacts = () => {
    setMemoryFacts('');
    onUpdate({ memoryFacts: '' });
  };

  const handleClearSummary = () => {
    setMemorySummary('');
    onUpdate({ memorySummary: '', memorySummaryUpTo: 0 });
  };

  // 解析事实清单为分类列表
  const parseFacts = (facts: string) => {
    const lines = facts.split('\n').filter(l => l.trim());
    const categories: Record<string, string[]> = {
      '人物': [],
      '偏好': [],
      '事件': [],
      '约定': [],
      '剧情': [],
      '其他': [],
    };
    for (const line of lines) {
      const match = line.match(/^\[?(人物|偏好|事件|约定|剧情|其他)\]?\s*(.*)/);
      if (match) {
        categories[match[1]].push(match[2] || line);
      } else {
        categories['其他'].push(line);
      }
    }
    return categories;
  };

  const factsCategories = parseFacts(memoryFacts);
  const totalFacts = Object.values(factsCategories).reduce((sum, arr) => sum + arr.length, 0);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-veil fade-in"
      onClick={onClose}
    >
      <div
        className="editorial-card w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-md cinematic-rise flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-7 pt-6 pb-5 hairline-b flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="eyebrow eyebrow-accent mb-1.5">No. 04 — Memory</div>
              <h2 className="font-display text-[28px] leading-[1.05] font-light tracking-[-0.025em]" style={{ color: 'var(--ink)' }}>
                智能体<em className="italic font-extralight" style={{ color: 'var(--accent)' }}> 记忆库</em>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--muted-2)] hover:text-[var(--ink)] transition-quick press-shrink"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[12.5px] leading-[1.7]" style={{ color: 'var(--muted)' }}>
            管理 AI 对你的记忆 — 关键事实清单会在每次对话中注入 system prompt，确保智能体始终记得你
          </p>

          {/* 状态指示器 */}
          <div className="mt-3 flex items-center gap-4 text-[10.5px] tracking-wider uppercase" style={{ color: 'var(--muted-2)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: totalFacts > 0 ? 'var(--accent)' : 'var(--muted-2)' }} />
              {totalFacts} 条事实
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: memorySummary ? 'var(--accent)' : 'var(--muted-2)' }} />
              {memorySummary ? `${memorySummary.length} 字摘要` : '无摘要'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              {messageCount} 条消息
            </span>
            {isExtractingFacts && (
              <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: 'var(--accent)' }} />
                提取中…
              </span>
            )}
            {isSummarizing && (
              <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: 'var(--accent)' }} />
                压缩中…
              </span>
            )}
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="px-7 py-3 hairline-b flex items-center gap-1 flex-shrink-0">
          {[
            { key: 'facts' as const, label: '关键事实', count: totalFacts },
            { key: 'summary' as const, label: '长期摘要', count: memorySummary ? 1 : 0 },
            { key: 'progress' as const, label: '剧情进度', count: plotProgress ? 1 : 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 text-[11.5px] tracking-wider transition-quick press-shrink ${
                activeTab === tab.key
                  ? 'text-[var(--ink)]'
                  : 'text-[var(--muted-2)] hover:text-[var(--ink)]'
              }`}
              style={activeTab === tab.key ? {
                borderBottom: '2px solid var(--accent)',
                marginBottom: '-2px',
              } : {}}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 numeric-badge" style={{ color: 'var(--accent)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="tactile-ghost text-[11px] press-shrink"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="tactile text-[11px] press-shrink"
                >
                  保存
                </button>
              </>
            ) : (
              <>
                {activeTab === 'facts' && onRebuildFacts && (
                  <button
                    onClick={onRebuildFacts}
                    disabled={isExtractingFacts}
                    className="text-[10.5px] tracking-wider uppercase flex items-center gap-1.5 px-2.5 py-1 hairline press-shrink transition-quick disabled:opacity-50"
                    style={{ color: 'var(--muted)' }}
                    title="从所有历史消息重新提取事实"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    重建
                  </button>
                )}
                {activeTab === 'summary' && onRegenerateMemory && (
                  <button
                    onClick={onRegenerateMemory}
                    disabled={isSummarizing}
                    className="text-[10.5px] tracking-wider uppercase flex items-center gap-1.5 px-2.5 py-1 hairline press-shrink transition-quick disabled:opacity-50"
                    style={{ color: 'var(--muted)' }}
                    title="重新压缩所有消息为摘要"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    重压缩
                  </button>
                )}
                <button
                  onClick={() => setEditMode(true)}
                  className="text-[10.5px] tracking-wider uppercase flex items-center gap-1.5 px-2.5 py-1 hairline press-shrink transition-quick"
                  style={{ color: 'var(--muted)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-9.5l3 3m-3-3l-9 9V17h4.5l9-9m-3 0l3 3" />
                  </svg>
                  编辑
                </button>
              </>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {/* 关键事实 Tab */}
          {activeTab === 'facts' && (
            <div className="space-y-5">
              {editMode ? (
                <div>
                  <div className="hairline-ticker mb-4">
                    <span>编辑关键事实</span>
                    <span>每行一条 · 可用 [类别] 前缀</span>
                  </div>
                  <textarea
                    value={memoryFacts}
                    onChange={(e) => setMemoryFacts(e.target.value)}
                    rows={14}
                    className="w-full px-4 py-3 text-[13px] leading-[1.75] hairline bg-transparent focus:outline-none focus:border-[var(--ink-2)] glow-on-focus transition-quick resize-none font-mono-ui"
                    style={{ color: 'var(--ink)', borderRadius: 4 }}
                    placeholder={`每行一条事实，可用 [类别] 前缀组织，例如：

[人物] 用户叫小明
[偏好] 用户喜欢科幻小说
[事件] 双方在咖啡馆初次见面
[约定] 周末一起去看电影
[剧情] 第一章完成：抵达边境村庄`}
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[10.5px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
                    <span>支持类别：人物 / 偏好 / 事件 / 约定 / 剧情 / 其他</span>
                    <span className="numeric-badge">{String(memoryFacts.length).padStart(4, '0')} 字</span>
                  </div>
                </div>
              ) : (
                <>
                  {totalFacts === 0 ? (
                    <div className="text-center py-12 fade-in">
                      <div className="eyebrow mb-3">— Empty —</div>
                      <p className="text-[13px] leading-[1.7] max-w-sm mx-auto" style={{ color: 'var(--muted)' }}>
                        暂无关键事实记录。<br />
                        AI 会在每次对话后自动提取关键事实，<br />
                        也可以点击「重建」从历史消息重新提取。
                      </p>
                    </div>
                  ) : (
                    Object.entries(factsCategories).map(([cat, items]) => (
                      items.length > 0 && (
                        <div key={cat} className="cinematic-fade">
                          <div className="hairline-ticker mb-3">
                            <span>{cat}</span>
                            <span>{items.length} 条</span>
                          </div>
                          <ul className="space-y-2 pl-0 list-none">
                            {items.map((fact, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-3 py-2 px-3 hairline text-[13px] leading-[1.6] cinematic-fade"
                                style={{ color: 'var(--ink-2)', animationDelay: `${idx * 30}ms` }}
                              >
                                <span
                                  className="numeric-badge pt-0.5 flex-shrink-0"
                                  style={{ color: 'var(--accent)' }}
                                >
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className="flex-1">{fact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    ))
                  )}
                </>
              )}
            </div>
          )}

          {/* 长期摘要 Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {editMode ? (
                <div>
                  <textarea
                    value={memorySummary}
                    onChange={(e) => setMemorySummary(e.target.value)}
                    rows={14}
                    className="w-full px-4 py-3 text-[13px] leading-[1.75] hairline bg-transparent focus:outline-none focus:border-[var(--ink-2)] glow-on-focus transition-quick resize-none font-mono-ui"
                    style={{ color: 'var(--ink)', borderRadius: 4 }}
                    placeholder="长期对话摘要（自动生成，可手动编辑）"
                  />
                  <div className="mt-2 flex justify-between text-[10.5px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
                    <span>覆盖到第 {conversation.memorySummaryUpTo} 条消息</span>
                    <span className="numeric-badge">{String(memorySummary.length).padStart(4, '0')} 字</span>
                  </div>
                </div>
              ) : memorySummary ? (
                <div className="p-5 hairline relative">
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'var(--accent)' }} />
                  <p
                    className="text-[13px] leading-[1.85] whitespace-pre-wrap"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {memorySummary}
                  </p>
                  <div className="mt-4 pt-3 hairline-t flex items-center justify-between text-[10.5px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
                    <span>覆盖到第 {conversation.memorySummaryUpTo} 条消息</span>
                    <span className="numeric-badge">{String(memorySummary.length).padStart(4, '0')} 字</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 fade-in">
                  <div className="eyebrow mb-3">— Empty —</div>
                  <p className="text-[13px] leading-[1.7] max-w-sm mx-auto" style={{ color: 'var(--muted)' }}>
                    暂无长期摘要。<br />
                    当对话超过 12 条消息后会自动压缩早期内容为摘要。<br />
                    也可以点击「重压缩」立即生成。
                  </p>
                </div>
              )}
              {memorySummary && !editMode && (
                <button
                  onClick={handleClearSummary}
                  className="text-[10.5px] tracking-wider uppercase flex items-center gap-1.5 px-3 py-1.5 hairline press-shrink transition-quick"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  清空摘要
                </button>
              )}
            </div>
          )}

          {/* 剧情进度 Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-4">
              {editMode ? (
                <textarea
                  value={plotProgress}
                  onChange={(e) => setPlotProgress(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 text-[13px] leading-[1.75] hairline bg-transparent focus:outline-none focus:border-[var(--ink-2)] glow-on-focus transition-quick resize-none font-mono-ui"
                  style={{ color: 'var(--ink)', borderRadius: 4 }}
                  placeholder="记录当前剧情已经推进到哪里，方便 AI 把握节奏。"
                />
              ) : plotProgress ? (
                <div className="p-5 hairline relative">
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'var(--accent)' }} />
                  <p
                    className="text-[13px] leading-[1.85] whitespace-pre-wrap"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {plotProgress}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 fade-in">
                  <div className="eyebrow mb-3">— Empty —</div>
                  <p className="text-[13px] leading-[1.7] max-w-sm mx-auto" style={{ color: 'var(--muted)' }}>
                    暂无剧情进度记录。<br />
                    可以在剧情模式中手动维护，记录故事推进到哪一章节。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-7 py-4 hairline-t flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 text-[10.5px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: 'var(--accent)' }} />
            <span>关键事实会在每次对话注入 system prompt</span>
          </div>
          <button onClick={onClose} className="tactile-ghost press-shrink">
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
