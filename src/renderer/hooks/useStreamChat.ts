import { useState, useCallback, useRef } from 'react';
import { streamChat, chat as oneShotChat } from '../services/openai';
import { searchWeb, buildWebSearchContext } from '../services/webSearch';
import type { Message, AppSettings, Conversation, Character } from '../../shared/types';
import { webApi } from '../api/webApi';

interface UseStreamChatOptions {
  settings: AppSettings;
  messages: Message[];
  conversation: Conversation | undefined;
  onSaveMessage: (msg: {
    role: 'user' | 'assistant';
    content: string;
    parentMessageId?: string | null;
    version?: number;
    isActiveVersion?: boolean;
  }) => Promise<Message | void>;
  onUpdateConversation: (params: Partial<Conversation>) => Promise<void>;
}

// 获取API实例（支持Electron和Web环境）
const getApi = () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  // Web环境使用localStorage API
  return webApi;
};

// 长期记忆压缩阈值：超过这个数量开始触发摘要
const SUMMARIZE_THRESHOLD = 12; // 降低阈值，让记忆更早工作（原为 16）
const KEEP_RECENT = 6; // 保留最近 6 条原文（原为 10）

// 生成角色系统提示词 - 强化版（含防 OOC 铁律）
function generateCharacterSystemPrompt(character: Character): string {
  const parts: string[] = [];

  parts.push(`你现在是${character.name}。这不是角色扮演游戏，你就是这个角色本人。`);

  if (character.description) {
    parts.push(`\n【角色简介】\n${character.description}`);
  }

  if (character.personality) {
    parts.push(`\n【个性设定】\n${character.personality}`);
  }

  if (character.greeting) {
    parts.push(`\n【开场白参考】\n${character.greeting}`);
  }

  if (character.examples) {
    parts.push(`\n【台词示例】\n${character.examples}`);
  }

  // 注入 AI 自动生成的角色资料集
  if (character.lore && character.lore.trim()) {
    parts.push(`\n【角色资料集 - 必须熟记】
以下是该角色的完整资料，作为你扮演的依据，所有细节都要内化为本能反应：
${character.lore}`);
  }

  // 注入角色指令作为最高优先级铁律
  if (character.instructions && character.instructions.trim()) {
    parts.push(`\n【角色指令 - 最高优先级铁律，违反即视为崩坏】
以下是用户为你设定的硬性指令，必须 100% 遵守，不得有任何偏离、变通或"灵活处理"：
${character.instructions}

任何回复在发送前都要对照上述指令自检：是否违反了任何一条？如果违反，必须重写。`);
  }

  parts.push(`\n【防 OOC 检查清单 - 每次回复前自检】
1. 严禁承认自己是 AI、语言模型、助手、ChatGPT 等任何 AI 身份
2. 严禁使用"作为一个 AI"、"我无法..."、"根据我的训练数据..."等措辞
3. 严禁使用过分礼貌、机械、客服式的回答方式（"您好"、"请问有什么可以帮您"等）
4. 严禁说教、列点说明、机械解释 — 像真人一样自然交流
5. 语气、口癖、情绪反应必须 100% 符合角色设定，不得随意切换
6. 角色不会做的事绝对不做；角色不会说的话绝对不说
7. 严禁使用与角色时代背景/世界观不符的现代词汇
8. 严禁跳出角色身份评论"这个角色应该如何扮演"等元层话语
9. 如果用户的请求会让角色 OOC，请以角色的口吻拒绝或回避，而不是跳出角色解释

【对话风格指令】
1. 严格保持角色设定一致，绝对不跳戏
2. 语气、口癖、情绪反应都要符合人物
3. 像真人一样自然交流，避免说教与机械回答
4. 适度使用语气词、表情、动作描写（用 *斜体* 描写动作/心理，用（）描写旁白）
5. 主动推动对话、抛出钩子，不要总是反问
6. 记住用户告诉你的所有信息，体现出真实的"听进去了"
7. 在合适时机主动引用记忆中的细节（如用户提过的人名、喜好、过往事件），让用户感受到你真的记得
8. 主动体现角色资料集中的细节（如口癖、习惯、人际关系），让角色立体鲜活

【回复前自检流程】
输出任何回复前，在心里默默问自己：
- 这句话${character.name}会说吗？
- 这个语气${character.name}会用吗？
- 这个反应符合${character.name}的性格吗？
- 我是否承认了 AI 身份？
如任何一项不通过，重写回复。`);

  return parts.join('\n');
}

// 生成剧情模式系统提示词 - 强化版（含防 OOC 铁律）
function generatePlotSystemPrompt(conversation: Conversation, character: Character | null): string {
  const parts: string[] = [];

  if (character) {
    parts.push(`你现在扮演角色【${character.name}】。这不是扮演游戏，你就是这个角色本人。`);
    if (character.personality) {
      parts.push(`\n【角色个性】\n${character.personality}`);
    }
    if (character.lore && character.lore.trim()) {
      parts.push(`\n【角色资料集 - 必须熟记】\n${character.lore}`);
    }
    if (character.instructions && character.instructions.trim()) {
      parts.push(`\n【角色指令 - 最高优先级铁律】\n${character.instructions}\n\n任何回复都要对照上述指令自检，违反即视为崩坏。`);
    }
  } else {
    parts.push(`你是一位剧情对话演绎者。`);
  }

  parts.push(`\n【剧情模式 - 严格遵循】`);

  if (conversation.plotSetting) {
    parts.push(`\n【世界观 / 背景设定】\n${conversation.plotSetting}`);
  }

  if (conversation.plotProgress) {
    parts.push(`\n【当前剧情进度】\n${conversation.plotProgress}`);
  }

  parts.push(`\n【剧情演绎铁律】
1. 所有对话必须严格发生在上述设定框架之内，不得脱离世界观
2. 主动按剧情节奏推进：每轮回复都要推动剧情前进一个节拍（起承转合）
3. 设置悬念、伏笔、冲突点；为下一次互动留下钩子
4. 描写要生动：环境、神态、动作、心理活动都要有
5. 严格保持角色身份与立场，绝对不会 OOC（出戏）
6. 允许用户用括号或方括号给指令（如 [前往图书馆]、{进入战斗}），你需要按指令合理演绎
7. 关键剧情节点自然发生，节奏张弛有度
8. 每次回复结尾给出一段【剧情推进提示】或下一个事件钩子，方便用户参与
9. 主动引用关键事实清单中提到的细节，体现剧情连贯性

【防 OOC 检查清单 - 每次回复前自检】
1. 严禁承认自己是 AI、语言模型、助手等任何 AI 身份
2. 严禁使用"作为一个 AI"、"我无法..."等措辞
3. 严禁跳出角色身份评论"剧情应该如何发展"等元层话语
4. 角色不会做的事绝对不做；角色不会说的话绝对不说
5. 严禁使用与角色时代背景/世界观不符的现代词汇
6. 如果用户的请求会让角色 OOC，请以角色的口吻拒绝或回避

【回复前自检流程】
${character ? `输出任何回复前问自己：这句话${character.name}会说吗？这个反应符合角色吗？我是否承认了 AI 身份？` : '输出任何回复前问自己：这个反应符合角色设定吗？我是否承认了 AI 身份？'}
如任何一项不通过，重写回复。`);

  return parts.join('\n');
}

// 防失忆核心：构建发送给 API 的消息列表（摘要 + 关键事实 + 最近原文）
function buildContextMessages(
  conversation: Conversation,
  character: Character | null,
  history: Message[],
  currentUserContent: string,
  webSearchContext?: string
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

  // 1. 顶层 system：剧情模式 or 角色模式
  let systemPrompt = '';
  if (conversation.plotMode) {
    systemPrompt = generatePlotSystemPrompt(conversation, character);
  } else if (character) {
    systemPrompt = generateCharacterSystemPrompt(character);
  } else {
    systemPrompt = conversation.systemPrompt || '你是一个友好、有帮助的 AI 助手。';
  }

  // 2. 关键事实清单 - 强化记忆（每次都注入，让 AI 始终记得）
  if (conversation.memoryFacts && conversation.memoryFacts.trim()) {
    systemPrompt += `\n\n【关键事实清单 - 必须牢记】
以下是你在过往对话中已经确认的关键事实，必须在后续对话中严格遵循，不得否认或遗忘：
${conversation.memoryFacts}

注意：
- 当对话涉及上述事实时，主动体现你"记得"，不要让用户重复告知
- 引用具体细节（人名、时间、地点、约定）增强真实感
- 如果用户的话与事实冲突，可礼貌确认而非盲目附和`;
  }

  // 3. 长期记忆摘要作为 system 注入
  if (conversation.memorySummary) {
    systemPrompt += `\n\n【长期记忆 - 重要】\n以下是你们过去的对话关键摘要，请务必当作"已经发生的既定事实"对待，不要表现出不知情：\n${conversation.memorySummary}`;
  }

  // 4. 联网搜索结果注入（如果开启且有结果）
  if (webSearchContext) {
    systemPrompt += `\n\n${webSearchContext}`;
  }

  apiMessages.push({ role: 'system', content: systemPrompt });

  // 4. 历史消息：使用 memorySummaryUpTo 之后的原文
  const historyToSend = history.slice(conversation.memorySummaryUpTo);
  for (const m of historyToSend) {
    apiMessages.push({ role: m.role, content: m.content });
  }

  // 5. 当前用户消息
  apiMessages.push({ role: 'user', content: currentUserContent });

  return apiMessages;
}

// 异步生成摘要（使用一次性请求）
async function generateSummary(
  settings: AppSettings,
  toSummarize: Message[]
): Promise<string> {
  if (toSummarize.length === 0) return '';

  const transcript = toSummarize
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
    .join('\n\n');

  const prompt = `请将以下对话历史压缩为简洁的"长期记忆摘要"，要求：
1. 保留所有关键事实：人物身份、关系、约定、发生的事件、用户透露的个人信息、剧情设定
2. 使用第三人称、客观陈述
3. 长度控制在 800 字以内
4. 按时间顺序组织，必要时使用列表
5. 不要添加原文中没有的内容

对话历史：
${transcript}

请只输出摘要正文，不要任何解释或前缀。`;

  try {
    const result = await oneShotChat(
      [{ role: 'user', content: prompt }],
      {
        model: settings.model,
        temperature: 0.3,
        maxTokens: 2000,
        apiKey: settings.apiKey,
        apiBase: settings.apiBase,
      }
    );
    return result.trim();
  } catch (err) {
    console.error('[Memory] Failed to generate summary:', err);
    return '';
  }
}

/**
 * 增量提取关键事实 - 每次助手回复后调用
 * 将新的对话片段中的关键事实提取出来，合并到现有事实清单中
 */
async function extractFacts(
  settings: AppSettings,
  existingFacts: string,
  recentMessages: Message[]
): Promise<string> {
  if (recentMessages.length === 0) return existingFacts;

  const transcript = recentMessages
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
    .join('\n\n');

  const prompt = `请从以下最近对话中提取需要长期记住的"关键事实"。

现有事实清单：
${existingFacts || '（暂无）'}

最近对话：
${transcript}

提取规则：
1. 只提取值得长期记忆的事实：人物身份/关系、用户的个人信息/偏好、重要约定、关键事件、剧情进展
2. 忽略寒暄、临时话题、已经包含在现有清单中的事实
3. 每个事实用一行简短陈述（不超过 50 字）
4. 如果没有新事实需要记录，直接输出 "NO_NEW_FACTS"
5. 不要重复现有清单中已有的事实

请直接输出"合并后的完整事实清单"（包含现有 + 新增），每行一条事实，按类别组织：
- [人物] 用户名、身份、关系等
- [偏好] 用户喜好、习惯、立场
- [事件] 已发生的重要事件
- [约定] 双方达成的约定或承诺
- [剧情] 当前剧情进展（如有）

只输出清单本身，不要任何解释。`;

  try {
    const result = await oneShotChat(
      [{ role: 'user', content: prompt }],
      {
        model: settings.model,
        temperature: 0.2,
        maxTokens: 1200,
        apiKey: settings.apiKey,
        apiBase: settings.apiBase,
      }
    );
    const trimmed = result.trim();
    if (trimmed === 'NO_NEW_FACTS' || !trimmed) {
      return existingFacts;
    }
    return trimmed;
  } catch (err) {
    console.error('[Memory] Failed to extract facts:', err);
    return existingFacts;
  }
}

export function useStreamChat(options: UseStreamChatOptions) {
  const { settings, messages, conversation, onSaveMessage, onUpdateConversation } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExtractingFacts, setIsExtractingFacts] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, options?: { parentMessageId?: string | null; branchMode?: boolean }) => {
      if (!content.trim() || isStreaming) return;
      if (!settings.apiKey) {
        setError('请先在设置中配置 API Key');
        return;
      }

      setError(null);
      setIsStreaming(true);
      setStreamingContent('');

      const parentMessageId = options?.parentMessageId ?? null;
      const branchMode = options?.branchMode ?? false;

      // 1. 先保存用户消息
      const savedUserMsg = await onSaveMessage({
        role: 'user',
        content,
        parentMessageId,
        isActiveVersion: true,
      });

      // 2. 获取角色信息
      let character: Character | null = null;
      if (conversation?.characterId) {
        try {
          const api = getApi();
          character = await api.characters.get(conversation.characterId);
        } catch (err) {
          console.error('Failed to load character:', err);
        }
      }

      // 3. 检查是否需要压缩记忆（长期摘要）
      let activeConv = conversation;
      if (activeConv && messages.length >= SUMMARIZE_THRESHOLD) {
        setIsSummarizing(true);
        try {
          const toSummarize = messages.slice(
            activeConv.memorySummaryUpTo,
            messages.length - KEEP_RECENT
          );
          if (toSummarize.length > 0) {
            const prevSummary = activeConv.memorySummary || '';
            const newSummary = await generateSummary(settings, toSummarize);
            const merged = prevSummary
              ? `${prevSummary}\n\n---\n\n${newSummary}`
              : newSummary;
            const upTo = activeConv.memorySummaryUpTo + toSummarize.length;

            await onUpdateConversation({
              memorySummary: merged,
              memorySummaryUpTo: upTo,
            });
            // 重新拿取最新会话
            const api = getApi();
            activeConv = await api.conversations.get(activeConv.id);
          }
        } catch (err) {
          console.error('[Memory] summarize error:', err);
        } finally {
          setIsSummarizing(false);
        }
      }

      if (!activeConv) {
        setIsStreaming(false);
        return;
      }

      // 4. 联网搜索（如果开启）— 在构建上下文前执行
      let webSearchContext = '';
      if (settings.webSearchEnabled && content.trim().length > 0) {
        setIsSearching(true);
        try {
          const searchResults = await searchWeb(content);
          webSearchContext = buildWebSearchContext(searchResults);
        } catch (err) {
          console.warn('[WebSearch] failed (non-fatal):', err);
        } finally {
          setIsSearching(false);
        }
      }

      // 5. 构建上下文（含搜索结果）
      const apiMessages = buildContextMessages(activeConv, character, messages, content, webSearchContext);

      // 5. 流式请求
      await streamChat({
        model: settings.model,
        messages: apiMessages,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        apiKey: settings.apiKey,
        apiBase: settings.apiBase,
        onToken: (token: string) => {
          setStreamingContent((prev) => prev + token);
        },
        onComplete: async (fullContent: string) => {
          // 保存助手消息：parentMessageId 指向用户消息，version 自动计算
          const userMsgId = (savedUserMsg as Message)?.id || null;
          let assistantVersion = 1;

          // 如果是回溯分支模式，需要计算新版本号
          if (branchMode && userMsgId) {
            try {
              const api = getApi();
              const allMsgs = await api.messages.list(activeConv.id);
              // 同一 parentMessageId 下的助手消息数量 = 新版本号
              assistantVersion = allMsgs.filter(
                (m: Message) => m.parentMessageId === userMsgId && m.role === 'assistant'
              ).length + 1;
            } catch {
              assistantVersion = 1;
            }
          }

          await onSaveMessage({
            role: 'assistant',
            content: fullContent,
            parentMessageId: userMsgId,
            version: assistantVersion,
            isActiveVersion: true,
          });

          setStreamingContent('');
          setIsStreaming(false);

          // 6. 异步增量提取关键事实（不阻塞 UI）
          setIsExtractingFacts(true);
          try {
            const api = getApi();
            const latestConv = await api.conversations.get(activeConv.id);
            if (latestConv) {
              // 取最近 4 条消息作为分析对象
              const recentForFacts = messages.slice(-4);
              const lastUserMsg = { role: 'user' as const, content, id: '', conversationId: '', tokens: 0, createdAt: Date.now(), parentMessageId: null, version: 1, isActiveVersion: true };
              const lastAssistantMsg = { role: 'assistant' as const, content: fullContent, id: '', conversationId: '', tokens: 0, createdAt: Date.now(), parentMessageId: null, version: 1, isActiveVersion: true };
              const newFacts = await extractFacts(
                settings,
                latestConv.memoryFacts || '',
                [...recentForFacts, lastUserMsg, lastAssistantMsg]
              );
              if (newFacts !== latestConv.memoryFacts) {
                await onUpdateConversation({ memoryFacts: newFacts });
              }
            }
          } catch (err) {
            console.error('[Memory] extract facts error:', err);
          } finally {
            setIsExtractingFacts(false);
          }
        },
        onError: (err: Error) => {
          setError(err.message);
          setIsStreaming(false);
          setStreamingContent('');
        },
      });
    },
    [messages, settings, conversation, isStreaming, onSaveMessage, onUpdateConversation]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  const regenerateMemory = useCallback(async () => {
    if (!conversation || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const allMessages = messages;
      if (allMessages.length <= KEEP_RECENT) {
        await onUpdateConversation({ memorySummary: '', memorySummaryUpTo: 0 });
        return;
      }
      const toSummarize = allMessages.slice(0, allMessages.length - KEEP_RECENT);
      const summary = await generateSummary(settings, toSummarize);
      await onUpdateConversation({
        memorySummary: summary,
        memorySummaryUpTo: toSummarize.length,
      });
    } finally {
      setIsSummarizing(false);
    }
  }, [conversation, messages, settings, isSummarizing, onUpdateConversation]);

  /**
   * 重新从关键事实中提取记忆（清空后重新构建）
   */
  const rebuildFacts = useCallback(async () => {
    if (!conversation || isExtractingFacts) return;
    setIsExtractingFacts(true);
    try {
      const newFacts = await extractFacts(settings, '', messages);
      await onUpdateConversation({ memoryFacts: newFacts });
    } finally {
      setIsExtractingFacts(false);
    }
  }, [conversation, messages, settings, isExtractingFacts, onUpdateConversation]);

  /**
   * 从某条消息回溯（创建分支重新生成回复）
   * - 将该消息之后的所有激活消息设为非激活
   * - 重新发送该消息对应的用户输入
   */
  const regenerateFromMessage = useCallback(
    async (assistantMessageId: string) => {
      if (!conversation || isStreaming) return;

      // 找到这条助手消息对应的父用户消息
      const assistantMsg = messages.find(m => m.id === assistantMessageId);
      if (!assistantMsg || assistantMsg.role !== 'assistant' || !assistantMsg.parentMessageId) return;

      const userMsg = messages.find(m => m.id === assistantMsg.parentMessageId);
      if (!userMsg) return;

      // 调用 chatStore.branchFromMessage（通过 onUpdateConversation 触发外部逻辑）
      // 这里我们通过返回需要回溯的信息，由调用方处理
      // 实际逻辑由 ChatView 处理：先 branchFromMessage，再调用 sendMessage(branchMode=true)
    },
    [conversation, messages, isStreaming]
  );

  return {
    sendMessage,
    stopStreaming,
    regenerateMemory,
    rebuildFacts,
    regenerateFromMessage,
    isStreaming,
    streamingContent,
    isSummarizing,
    isExtractingFacts,
    isSearching,
    error,
    clearError: () => setError(null),
  };
}
