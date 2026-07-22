import type { AppSettings, Character, Conversation } from '../../shared/types';

/**
 * 根据角色 + 剧情设定，调用 LLM 生成符合氛围的背景图描述 prompt
 * 然后调用 text_to_image API 生成图片并返回 data URL
 */
export async function generateBackgroundImage(
  character: Character | null,
  conversation: Conversation,
  settings: AppSettings
): Promise<string> {
  // 步骤 1：让 LLM 生成符合角色/剧情氛围的图片 prompt
  const promptForImagePrompt = buildPromptForImagePrompt(character, conversation);

  let imagePrompt: string;
  try {
    imagePrompt = await callLLM(promptForImagePrompt, settings);
  } catch (err) {
    throw new Error(`生成图片描述失败：${err instanceof Error ? err.message : String(err)}`);
  }

  // 步骤 2：调用 text_to_image API 生成图片
  try {
    const dataUrl = await callTextToImage(imagePrompt, 'landscape_16_9');
    return dataUrl;
  } catch (err) {
    throw new Error(`生成图片失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

function buildPromptForImagePrompt(character: Character | null, conversation: Conversation): string {
  const parts: string[] = [];

  parts.push('你是一位资深场景美术师。请根据以下角色与剧情信息，生成一段用于 AI 图像生成的英文 prompt，描绘一个适合作为该对话背景的场景图。');

  if (character) {
    parts.push(`\n【角色姓名】${character.name}`);
    if (character.description) parts.push(`【角色简介】${character.description}`);
    if (character.lore) {
      // 取 lore 的前 500 字作为参考
      const loreSnippet = character.lore.slice(0, 500);
      parts.push(`【角色资料片段】${loreSnippet}`);
    }
  }

  if (conversation.plotMode) {
    if (conversation.plotSetting) parts.push(`\n【剧情设定】${conversation.plotSetting}`);
    if (conversation.plotProgress) parts.push(`【剧情进度】${conversation.plotProgress}`);
  }

  parts.push(`
要求：
1. 只输出英文 prompt，不要任何前缀、解释、引号、markdown 标记
2. 描绘一个氛围浓厚的场景（环境、光线、色调、构图），不要出现人物特写
3. 适合作为对话窗口的背景图（16:9 横向构图，留出中央空间给文字）
4. 风格倾向：电影感、有故事性、色彩饱和度适中
5. 长度 50-100 个英文单词
6. 不要使用 "masterpiece"、"best quality" 等套话，直接描述场景

直接输出英文 prompt：`);

  return parts.join('\n');
}

async function callLLM(prompt: string, settings: AppSettings): Promise<string> {
  if (!settings.apiKey) throw new Error('请先在设置中配置 API Key');

  const { chat } = await import('./openai');
  const result = await chat(
    [{ role: 'user', content: prompt }],
    {
      model: settings.model,
      temperature: 0.6,
      maxTokens: 300,
      apiKey: settings.apiKey,
      apiBase: settings.apiBase,
    }
  );
  return result.trim().replace(/^["']|["']$/g, '');
}

/**
 * 调用 text_to_image API 生成图片
 * 返回可直接用作 <img src> 或 CSS background 的 data URL
 */
async function callTextToImage(
  prompt: string,
  imageSize: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9' = 'landscape_16_9'
): Promise<string> {
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodedPrompt}&image_size=${imageSize}`;

  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) {
    throw new Error(`图片生成接口返回 ${resp.status}`);
  }

  // 接口可能返回 JSON 或图片二进制；优先尝试 JSON
  const contentType = resp.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await resp.json();
    // 兼容多种返回结构
    const imageUrl: string | undefined =
      data?.data?.[0]?.url ||
      data?.data?.url ||
      data?.url ||
      data?.image_url ||
      data?.output?.[0] ||
      (typeof data?.data === 'string' ? data.data : undefined);
    if (!imageUrl) {
      throw new Error('图片生成接口未返回有效图片 URL');
    }
    return imageUrl;
  }

  // 二进制图片 → 转 data URL
  const blob = await resp.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('图片转码失败'));
    reader.readAsDataURL(blob);
  });
}
