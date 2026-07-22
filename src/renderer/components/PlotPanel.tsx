import React, { useState } from 'react';
import type { Conversation } from '../../shared/types';

interface Props {
  conversation: Conversation;
  messageCount: number;
  characterGreeting?: string;
  onUpdate: (data: Partial<Conversation>) => void;
  onSaveGreeting: (content: string) => Promise<void>;
  onClose: () => void;
}

const PLOT_PRESETS = [
  {
    name: '奇幻冒险',
    en: 'Fantasy',
    glyph: '✦',
    setting: `【世界观】剑与魔法的艾泽拉大陆，由人、精灵、兽人、龙族共同居住。光明教廷与暗影议会暗中角力。
【主角设定】你是一位刚离开新手村的年轻冒险者，怀揣梦想来到王都。
【剧情起点】王都广场的告示板上贴着一张悬赏令：边境村庄遭哥布林袭击，需要冒险者前往调查。
【剧情节奏】
- 第一章：接受委托，组建小队（可招募 NPC）
- 第二章：抵达边境村庄，发现事态比想象中严重
- 第三章：深入哥布林巢穴，揭开背后更大阴谋
【铁律】所有对话必须发生在该世界观内；任何 OOC 指令由用户用 [] 标注。`,
  },
  {
    name: '现代恋爱',
    en: 'Romance',
    glyph: '✿',
    setting: `【世界观】现代都市，温馨日常生活。
【角色】你是我（同班同学/同事/邻居/学长学姐…）的设定。
【关系】我们相识不久，关系正在升温中。
【剧情】一段细水长流、心动邂逅的爱情故事。
【节奏】
- 日常互动：聊天、吃饭、散步、互相了解
- 关系推进：表白、约会、磨合、危机、和好
- 高潮：误会解开、关系确立
【铁律】保持生活气息，符合现代人说话方式；情感递进要自然。`,
  },
  {
    name: '悬疑推理',
    en: 'Mystery',
    glyph: '◐',
    setting: `【世界观】一座与世隔绝的深山度假山庄，暴风雪封山。
【人物】山庄主人、管家、若干住客、神秘访客。
【剧情】一个密室杀人事件，所有人都有嫌疑。
【节奏】
- 开场：暴风雪来临，众人被困
- 发展：发现尸体，逐一调查每位嫌疑人
- 转折：揭露每个人都有秘密
- 高潮：找出真凶
【铁律】对话中要埋线索、藏矛盾、给暗示；每条对话都需要推动调查。`,
  },
  {
    name: '末日求生',
    en: 'Apocalypse',
    glyph: '◬',
    setting: `【世界观】丧尸病毒爆发后的第三个月，文明崩塌。
【角色】你是一名幸存者，在废墟城市中求生。
【场景】废弃的商场、地铁站、加油站、临时避难所。
【节奏】
- 资源搜寻：食物、武器、药品
- 遭遇危机：丧尸潮、敌对幸存者、自然灾害
- 关键抉择：救人还是自保？信任还是怀疑？
- 长期目标：寻找安全区、组建小队
【铁律】保持紧张感，每次抉择都有代价；不要让末日生活变得轻松。`,
  },
  {
    name: '校园青春',
    en: 'School',
    glyph: '✾',
    setting: `【世界观】樱花盛开的高中校园。
【角色】你是我（转学生/同班同学/社团成员…）的设定。
【场景】教室、社团活动室、天台、校门口、商店街。
【剧情】青春期的友谊、暗恋、社团活动、考试、毕业季的故事。
【节奏】
- 日常：上课、午饭、放学、社团
- 事件：文化祭、修学旅行、体育祭
- 情感：心动告白、误会、毕业
【铁律】保持校园的纯真感，台词符合高中生口吻。`,
  },
  {
    name: '赛博朋克',
    en: 'Cyber',
    glyph: '◈',
    setting: `【世界观】2077 年的新东京，霓虹灯下永不停歇的酸雨。
【角色】你是一名落魄的私家侦探，欠着黑帮一屁股债。
【场景】霓虹街区、地下黑市、企业总部、贫民窟。
【剧情】受神秘客户委托调查一系列失踪案，每条线索都指向巨型企业的秘密。
【节奏】
- 接案：酒吧里接到神秘委托
- 调查：追踪失踪者、潜入企业
- 转折：发现自己也是棋子
- 终局：与幕后势力的对决
【铁律】对话中需带赛博朋克语感（植入体、神经接口、ICE 等）；节奏紧凑。`,
  },
];

export const PlotPanel: React.FC<Props> = ({
  conversation,
  messageCount,
  characterGreeting,
  onUpdate,
  onSaveGreeting,
  onClose
}) => {
  const [plotMode, setPlotMode] = useState(conversation.plotMode);
  const [plotSetting, setPlotSetting] = useState(conversation.plotSetting);
  const [plotProgress, setPlotProgress] = useState(conversation.plotProgress);

  // 检查是否需要自动发送开场白
  const shouldSendGreeting = (
    plotMode && // 剧情模式开启
    messageCount === 0 && // 没有消息
    characterGreeting && // 有开场白
    characterGreeting.trim().length > 0
  );

  const handleToggle = (v: boolean) => {
    setPlotMode(v);
    onUpdate({ plotMode: v });
  };

  const handleApply = async () => {
    try {
      onUpdate({ plotSetting, plotProgress, plotMode });
      // 如果满足条件，自动发送开场白
      if (shouldSendGreeting) {
        await onSaveGreeting(characterGreeting!);
      }
      // 成功后关闭
      onClose();
    } catch (err) {
      console.error('Failed to apply plot settings:', err);
      // 即使失败也关闭，避免卡住
      onClose();
    }
  };

  const applyPreset = async (preset: typeof PLOT_PRESETS[0]) => {
    try {
      setPlotSetting(preset.setting);
      setPlotMode(true);
      onUpdate({ plotSetting: preset.setting, plotMode: true });
      // 如果满足条件，自动发送开场白
      if (messageCount === 0 && characterGreeting && characterGreeting.trim().length > 0) {
        await onSaveGreeting(characterGreeting);
      }
      // 成功后关闭
      onClose();
    } catch (err) {
      console.error('Failed to apply preset:', err);
      // 即使失败也关闭
      onClose();
    }
  };

  return (
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
              <div className="eyebrow eyebrow-accent mb-1.5">No. 03 — Narrative</div>
              <h2 className="font-display text-[28px] leading-[1.05] font-light tracking-[-0.025em]" style={{ color: 'var(--ink)' }}>
                剧情<em className="italic font-extralight" style={{ color: 'var(--accent)' }}> 模式</em>
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
            智能体将严格按你的剧情设定进行演绎 — 设定越细致，演绎越生动
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7">
          {/* 开关 — 编辑设计 toggle */}
          <div className="flex items-center justify-between p-4 hairline">
            <div className="flex-1 pr-6">
              <div className="font-display text-[17px] font-light tracking-[-0.01em] mb-1" style={{ color: 'var(--ink)' }}>
                启用剧情模式
              </div>
              <p className="text-[12px] leading-[1.6]" style={{ color: 'var(--muted)' }}>
                开启后，AI 将作为"导演"在剧情轨道内推动故事
              </p>
            </div>
            <button
              onClick={() => handleToggle(!plotMode)}
              className={`toggle-editorial ${plotMode ? 'is-on' : ''} flex-shrink-0`}
            />
          </div>

          {/* 预设 */}
          <div className="cinematic-fade">
            <div className="hairline-ticker mb-4">
              <span>A · 剧本集</span>
              <span>{PLOT_PRESETS.length} 款</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PLOT_PRESETS.map((p, idx) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="group relative p-4 hairline hover:border-[var(--ink-2)] hover:bg-[var(--paper-2)] transition-quick text-left press-shrink cinematic-fade"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className="font-display text-[26px] font-light leading-none"
                      style={{ color: 'var(--accent)' }}
                    >
                      {p.glyph}
                    </span>
                    <span className="numeric-badge" style={{ color: 'var(--muted-2)' }}>{p.en}</span>
                  </div>
                  <div className="font-display text-[15px] font-light tracking-[-0.01em] mt-3" style={{ color: 'var(--ink)' }}>
                    {p.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 剧情设定 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>B · 剧情设定</span>
              <span>必填</span>
            </div>
            <textarea
              value={plotSetting}
              onChange={(e) => setPlotSetting(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 text-[13.5px] leading-[1.75] hairline bg-transparent focus:outline-none focus:border-[var(--ink-2)] glow-on-focus transition-quick resize-none font-mono-ui"
              style={{ color: 'var(--ink)', borderRadius: 4 }}
              placeholder={`请描述：
• 世界观 / 时代背景
• 场景设定（地点、时间）
• 主要角色身份与性格
• 剧情主线 / 故事走向
• 关键节点 / 起承转合
• 任何特殊规则或铁律`}
            />
            <div className="mt-1.5 flex items-center justify-between text-[10.5px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
              <span>世界观 · 角色 · 主线 · 铁律</span>
              <span className="numeric-badge">{String(plotSetting.length).padStart(4, '0')} 字</span>
            </div>
          </div>

          {/* 当前进度 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>C · 当前进度</span>
              <span>可选</span>
            </div>
            <textarea
              value={plotProgress}
              onChange={(e) => setPlotProgress(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-[13.5px] leading-[1.75] hairline bg-transparent focus:outline-none focus:border-[var(--ink-2)] glow-on-focus transition-quick resize-none font-mono-ui"
              style={{ color: 'var(--ink)', borderRadius: 4 }}
              placeholder={`记录当前剧情已经推进到哪里，方便 AI 把握节奏。

例如：
- 第一章已完成：与女主角在咖啡馆相遇
- 第二章进行中：调查废弃工厂
- 已解锁线索：神秘符号、半截照片、加密录音`}
            />
            <div className="mt-1.5 flex items-center justify-end">
              <span className="numeric-badge">{String(plotProgress.length).padStart(4, '0')} 字</span>
            </div>
          </div>

          {/* 提示 */}
          <div className="p-5 hairline relative">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'var(--accent)' }} />
            <div className="flex items-baseline gap-2 mb-3">
              <span className="eyebrow eyebrow-accent">D · 提示</span>
              <span className="numeric-badge">DIRECTOR'S NOTE</span>
            </div>
            <ul className="text-[12.5px] space-y-2 pl-0 list-none" style={{ color: 'var(--ink-2)' }}>
              <li className="flex items-start gap-3">
                <span className="numeric-badge pt-1 flex-shrink-0">01</span>
                <span>可用 <code className="px-1.5 py-0.5 bg-[var(--paper-2)] rounded-sm font-mono-ui text-[11.5px]" style={{ color: 'var(--accent)' }}>[行动描述]</code> 给智能体指令</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="numeric-badge pt-1 flex-shrink-0">02</span>
                <span>智能体会主动推进剧情、抛悬念、留钩子</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="numeric-badge pt-1 flex-shrink-0">03</span>
                <span>长期对话会自动压缩早期记忆，但剧情设定永久保留</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="numeric-badge pt-1 flex-shrink-0">04</span>
                <span>每次回复结尾 AI 会给出剧情走向建议</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-7 py-4 hairline-t flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 text-[10.5px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
            {plotMode ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: 'var(--accent)' }} />
                <span>剧情模式 · 已激活</span>
              </>
            ) : (
              <span>普通对话模式</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="tactile-ghost press-shrink">取消</button>
            <button
              onClick={handleApply}
              className="tactile press-shrink"
            >
              <span>保存设定</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
