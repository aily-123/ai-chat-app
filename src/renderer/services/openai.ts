import OpenAI from 'openai';
import type { StreamChatOptions, StreamChatMessage } from '../../shared/types';

/**
 * 流式聊天 — 逐 token 回调
 * 在渲染进程中直接调用 OpenAI API（支持 CORS 的代理或直连）
 */
export async function streamChat(options: StreamChatOptions): Promise<void> {
  const { model, messages, temperature, maxTokens, apiKey, apiBase, onToken, onComplete, onError } = options;

  const client = new OpenAI({
    apiKey: apiKey || 'sk-placeholder',
    baseURL: apiBase || 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true, // Electron 渲染进程允许
  });

  const formattedMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  let fullContent = '';

  try {
    const stream = await client.chat.completions.create({
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        onToken(delta);
      }
    }

    onComplete(fullContent);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 非流式聊天（备用）
 */
export async function chat(
  messages: StreamChatMessage[],
  options: {
    model: string;
    temperature: number;
    maxTokens: number;
    apiKey: string;
    apiBase: string;
  }
): Promise<string> {
  const client = new OpenAI({
    apiKey: options.apiKey || 'sk-placeholder',
    baseURL: options.apiBase || 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: options.model,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    temperature: options.temperature,
    max_tokens: options.maxTokens,
  });

  return response.choices[0]?.message?.content || '';
}
