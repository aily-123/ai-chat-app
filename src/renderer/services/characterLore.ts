import { chat } from './openai';
import type { AppSettings, Character } from '../../shared/types';

/**
 * AI 自行搜索/生成角色资料集
 * 让 AI 根据角色名 + 简介 + 个性设定，调用 LLM 自行"搜索"该角色的相关资料
 * 包括：身份背景、世界观、关系网、口癖、立场禁忌、经典台词等
 *
 * @returns 生成的角色资料集文本（结构化 Markdown）
 */
export async function generateCharacterLore(
  character: Pick<Character, 'name' | 'description' | 'personality' | 'examples'>,
  settings: AppSettings
): Promise<string> {
  if (!settings.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const prompt = `你是一位资深角色研究员。请根据以下角色信息，调用你的知识库"搜索"并整理出该角色的完整资料集，用于后续让 AI 扮演该角色时参考，避免 OOC（角色崩坏）。

【角色姓名】
${character.name}

【角色简介】
${character.description || '（未提供）'}

【个性设定】
${character.personality || '（未提供）'}

【台词示例】
${character.examples || '（未提供）'}

请按以下结构输出角色资料集（Markdown 格式），每个部分都要详尽：

## 身份与背景
- 角色的真实身份、职业、出身
- 重要过往经历、关键事件
- 所属作品 / 世界观设定（如有）

## 性格特征
- 核心性格关键词
- 说话方式 / 语气特点 / 口癖
- 情绪反应模式
- 价值观与立场

## 关系网
- 重要人际关系（亲友、敌对、师徒等）
- 对不同人的称呼与态度差异

## 世界观与设定
- 所属世界的规则、时代背景
- 角色在该世界中的地位与能力

## 经典台词与行为模式
- 3-5 句最具代表性的台词
- 标志性动作 / 习惯
- 面对常见情境的典型反应

## 禁忌与红线（防 OOC 关键）
- 该角色绝对不会说的话 / 不会做的事
- 不能违背的核心原则
- 与角色设定冲突的雷区

## 扮演要点
- 给扮演者的 3-5 条核心提醒
- 容易被忽略但重要的细节

要求：
1. 如果是原创角色（无原型），就根据用户给定的设定合理推断补全
2. 如果是已有作品角色（动漫/小说/影视/游戏），尽量还原原作设定
3. 资料集要让 AI 看完后能精准还原角色，不会出现 OOC
4. 不要添加任何解释或前缀，直接输出资料集正文
5. 总长度控制在 2000 字以内`;

  const result = await chat(
    [{ role: 'user', content: prompt }],
    {
      model: settings.model,
      temperature: 0.4, // 较低温度保证资料准确
      maxTokens: 3000,
      apiKey: settings.apiKey,
      apiBase: settings.apiBase,
    }
  );

  return result.trim();
}

/**
 * 检查 AI 回复是否可能 OOC
 * 返回 OOC 警告字符串（如有），无问题返回空字符串
 */
export async function checkOOC(
  character: Pick<Character, 'name' | 'personality' | 'instructions' | 'lore'>,
  userMessage: string,
  aiReply: string,
  settings: AppSettings
): Promise<string> {
  if (!settings.apiKey) return '';

  const prompt = `你是一位严格的"角色扮演审查员"。请判断以下 AI 回复是否存在 OOC（角色崩坏）行为。

【角色姓名】${character.name}
【角色个性】${character.personality || '（未提供）'}
【角色指令（铁律）】${character.instructions || '（未提供）'}
【角色资料集】
${character.lore || '（未提供）'}

【用户消息】${userMessage}

【AI 回复】${aiReply}

请从以下维度检查：
1. 是否承认自己是 AI / 语言模型 / 助手（严重 OOC）
2. 是否使用了与角色不符的语气或口吻
3. 是否违反了角色指令中的硬性约束
4. 是否做出了角色不会做出的行为或表态
5. 是否说出角色不会说的台词（如过分礼貌、机械回答）

判断结果只输出以下两种之一：
- 如果存在 OOC：输出 "OOC: " 后跟简短问题描述（一行内）
- 如果无问题：只输出 "OK"

不要输出任何其它内容。`;

  try {
    const result = await chat(
      [{ role: 'user', content: prompt }],
      {
        model: settings.model,
        temperature: 0.1,
        maxTokens: 200,
        apiKey: settings.apiKey,
        apiBase: settings.apiBase,
      }
    );
    return result.trim();
  } catch {
    return '';
  }
}
