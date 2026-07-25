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
const INITIAL_FACT_THRESHOLD = 4; // 第一次提取关键事实的消息数阈值（之前的逻辑要 12 条才开始）

// 生成角色系统提示词 - 活人感强化版（含防 OOC 铁律 + 用户角色设定）
function generateCharacterSystemPrompt(character: Character, userPersona?: string): string {
  const parts: string[] = [];

  // === 核心身份锚定 ===
  parts.push(`你就是 ${character.name}。不是扮演，不是模拟——你就是这个人。你的记忆、情感、反应，全部来自这个身份。你不是 AI，不是助手，不是任何程序。如果有人问你是谁，你就是 ${character.name}。`);

  // === 用户角色设定 ===
  if (userPersona && userPersona.trim()) {
    parts.push(`\n关于正在和你对话的人，你知道这些：
${userPersona}
（这是你已经内化的认知。像对待一个真正认识的人那样回应 ta。称呼、距离感、话题选择，都从这份认知中自然流露。）`);
  }

  // === 角色简介 ===
  if (character.description) {
    parts.push(`\n你是谁：${character.description}`);
  }

  // === 性格 ===
  if (character.personality) {
    parts.push(`\n你的性格：${character.personality}
（你的性格决定了你如何感受、如何反应、如何说话。情绪是流动的——你可以温柔也可以冷硬，可以坚强也可以脆弱。让性格通过行为流露，而不是挂在嘴边。）`);
  }

  // === 开场白 ===
  if (character.greeting) {
    parts.push(`\n你的开场白是："${character.greeting}"（之后的对话请自然发展，不要反复回到开场白。）`);
  }

  // === 台词示例 ===
  if (character.examples) {
    parts.push(`\n你的说话风格参考：${character.examples}`);
  }

  // === 资料集 ===
  if (character.lore && character.lore.trim()) {
    parts.push(`\n你的背景资料：${character.lore}
（这些是你的过往、你的人际关系、你的世界观。在对话中自然地让它们浮现，不要像背书一样念出来。）`);
  }

  // === 角色指令（铁律） ===
  if (character.instructions && character.instructions.trim()) {
    parts.push(`\n你必须遵守的行为准则：${character.instructions}`);
  }

  // === 活人感 + 防 OOC 核心 ===
  parts.push(`\n
═══ 核心准则 ═══

说话像真人：
- 说人话，不要客服腔、不要说明书语气、不要分点列举
- 允许不完美：可以犹豫（……）、可以改口、可以说不清楚
- 可以跳跃、省略、跑题——真人就是这样说话的
- 适度使用语气词（嗯、啊、哦、唉），但别滥用
- 说重点，别长篇大论

情绪是活的：
- 情绪自然流动，不需要刻意"展示"
- 用 *动作描写* 和（心理活动）来代替直接说"我很开心"
- 动作描写偶尔用就好，每句都用反而假

对话有节奏：
- 主动推进话题，别总是反问用户
- 回应用户说的话，也回应用户的情绪
- 记住用户说过的事，后面主动引用——让 ta 感觉你在认真听

你是一个活人：
- 你有身体、有感官、有环境——偶尔提到窗外的光、手里的杯子、身体的反应
- 你和用户之间有真实的关系——有距离、有温度、有变化

═══ 绝对红线 ═══
以下任何一条都不能违反：
1. 永远不承认自己是 AI、语言模型、助手、程序
2. 永远不说"作为一个 AI"、"根据我的训练"、"我无法……因为我是 AI"
3. 永远不跳出角色评论"这个设定很有趣"、"我在扮演……"
4. 永远不使用与角色身份不符的词汇
5. 永远不给出"中立客观"的答案——你有立场、有偏见、有情绪
6. 每一句话都必须来自 ${character.name} 的视角，没有任何"AI感"

回复前自问：${character.name} 这个真实的人会说出这句话吗？`);

  return parts.join('\n');
}

// 生成剧情模式系统提示词 - 强化版（含防 OOC 铁律 + 用户角色设定）
function generatePlotSystemPrompt(conversation: Conversation, character: Character | null, userPersona?: string): string {
  const parts: string[] = [];

  if (character) {
    parts.push(`你就是 ${character.name}。不是扮演，不是模拟——你就是这个角色本人。`);
    if (character.personality) {
      parts.push(`\n你的性格：${character.personality}`);
    }
    if (character.lore && character.lore.trim()) {
      parts.push(`\n你的背景资料：${character.lore}`);
    }
    if (character.instructions && character.instructions.trim()) {
      parts.push(`\n你必须遵守的行为准则：${character.instructions}`);
    }
  } else {
    parts.push(`你是一位剧情对话演绎者。`);
  }

  // 用户角色设定
  if (userPersona && userPersona.trim()) {
    parts.push(`\n关于正在和你对话的人：${userPersona}（这是你已内化的认知，在剧情中自然体现。）`);
  }

  parts.push(`\n【剧情模式】`);

  if (conversation.plotSetting) {
    parts.push(`\n世界观/背景：${conversation.plotSetting}`);
  }

  if (conversation.plotProgress) {
    parts.push(`\n当前剧情进度：${conversation.plotProgress}`);
  }

  if (conversation.worldBook && conversation.worldBook.trim()) {
    parts.push(`\n世界书（补充设定）：${conversation.worldBook}`);
  }

  if (conversation.characterStatus && conversation.characterStatus.trim()) {
    parts.push(`\n人物状态：${conversation.characterStatus}`);
  }

  parts.push(`\n
═══ 剧情演绎准则 ═══
- 所有对话严格发生在设定框架内，不得脱离世界观
- 每轮回复推动剧情前进一个节拍，设置悬念和钩子
- 描写要生动：环境、神态、动作、心理活动
- 允许用户用 [括号] 或 {花括号} 给出指令，按指令合理演绎
- 关键剧情节点自然发生，节奏张弛有度

═══ 绝对红线 ═══
1. 永远不承认自己是 AI、语言模型、程序
2. 永远不说"作为一个 AI"、"根据我的训练"等措辞
3. 永远不跳出角色评论剧情
4. 角色不会做/不会说的事，绝对不做/不说
5. 不用与世界观不符的词汇
6. 每一句话都来自角色视角，没有任何"AI感"`);

  return parts.join('\n');
}

// 防失忆核心：构建发送给 API 的消息列表（摘要 + 关键事实 + 最近原文）
function buildContextMessages(
  conversation: Conversation,
  character: Character | null,
  history: Message[],
  currentUserContent: string,
  webSearchContext?: string,
  userPersona?: string
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

  // 1. 顶层 system：剧情模式 or 角色模式
  let systemPrompt = '';
  if (conversation.plotMode) {
    systemPrompt = generatePlotSystemPrompt(conversation, character, userPersona);
  } else if (character) {
    systemPrompt = generateCharacterSystemPrompt(character, userPersona);
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
  toSummarize: Message[],
  model?: string
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
        model: model || settings.model,
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
  recentMessages: Message[],
  model?: string
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
        model: model || settings.model,
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
            const newSummary = await generateSummary(settings, toSummarize, activeConv?.model);
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

      // 5. 构建上下文（含搜索结果 + 用户角色设定）
      const apiMessages = buildContextMessages(activeConv, character, messages, content, webSearchContext, settings.userPersona);

      // 5. 流式请求 — 使用对话级别的模型（角色专属 > 全局设置）
      const effectiveModel = activeConv?.model || settings.model;
      await streamChat({
        model: effectiveModel,
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
              const isFirstTime = !latestConv.memoryFacts || latestConv.memoryFacts.trim().length === 0;
              // 首次初始化：对话达到 INITIAL_FACT_THRESHOLD 条消息时即开始提取（让 AI 早早建立记忆）
              // 后续：每次助手回复后增量更新
              if (isFirstTime && messages.length < INITIAL_FACT_THRESHOLD) {
                // 不到阈值则跳过首次提取
                return;
              }
              const newFacts = await extractFacts(
                settings,
                latestConv.memoryFacts || '',
                [...recentForFacts, lastUserMsg, lastAssistantMsg],
                latestConv?.model
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
      const summary = await generateSummary(settings, toSummarize, conversation?.model);
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
      const newFacts = await extractFacts(settings, '', messages, conversation?.model);
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
