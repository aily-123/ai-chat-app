import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../store/settingsStore';
import { useCharacterStore } from '../store/characterStore';
import { generateBackgroundImage } from '../services/backgroundImage';
import { backendApi } from '../api/backendApi';
import { compressImage } from '../lib/utils';
import type { Conversation, Character, SavedBackground } from '../../shared/types';

interface Props {
  background: string;
  backgroundOpacity: number;
  backgroundFilter?: string;
  backgroundAnimation?: string;
  conversation?: Conversation;
  character?: Character;
  onUpdate: (data: Partial<Pick<Conversation, 'background' | 'backgroundOpacity' | 'backgroundFilter' | 'backgroundAnimation'>>) => void;
  onClose: () => void;
}

// 编辑设计风格的预设 — 暖纸、暮色、雾境、墨海
const PRESETS: { name: string; value: string; swatch: string; mood: string }[] = [
  { name: '暖纸',   mood: 'Paper',     value: '#f4f1ea', swatch: '#f4f1ea' },
  { name: '暮色',   mood: 'Dusk',      value: 'linear-gradient(135deg, #d4a08a 0%, #8b5a47 100%)', swatch: 'linear-gradient(135deg, #d4a08a 0%, #8b5a47 100%)' },
  { name: '雾境',   mood: 'Mist',      value: 'linear-gradient(135deg, #d6e0d4 0%, #93a8a0 100%)', swatch: 'linear-gradient(135deg, #d6e0d4 0%, #93a8a0 100%)' },
  { name: '墨海',   mood: 'Ink',       value: 'linear-gradient(135deg, #2d2820 0%, #1a1714 100%)', swatch: 'linear-gradient(135deg, #2d2820 0%, #1a1714 100%)' },
  { name: '晨雾',   mood: 'Haze',      value: 'linear-gradient(135deg, #ece6da 0%, #c4b9a4 100%)', swatch: 'linear-gradient(135deg, #ece6da 0%, #c4b9a4 100%)' },
  { name: '沙漠',   mood: 'Desert',    value: 'linear-gradient(135deg, #f0d8b8 0%, #c79974 100%)', swatch: 'linear-gradient(135deg, #f0d8b8 0%, #c79974 100%)' },
  { name: '黄昏',   mood: 'Glow',      value: 'linear-gradient(135deg, #f4c8a8 0%, #a4503b 100%)', swatch: 'linear-gradient(135deg, #f4c8a8 0%, #a4503b 100%)' },
  { name: '苔痕',   mood: 'Moss',      value: 'linear-gradient(135deg, #b8b69b 0%, #5c6347 100%)', swatch: 'linear-gradient(135deg, #b8b69b 0%, #5c6347 100%)' },
  { name: '雪松',   mood: 'Cedar',     value: 'linear-gradient(135deg, #c9b89a 0%, #6b4a2e 100%)', swatch: 'linear-gradient(135deg, #c9b89a 0%, #6b4a2e 100%)' },
  { name: '玄青',   mood: 'Charcoal',  value: 'linear-gradient(135deg, #4a4a4a 0%, #1f1f1f 100%)', swatch: 'linear-gradient(135deg, #4a4a4a 0%, #1f1f1f 100%)' },
  { name: '牙白',   mood: 'Ivory',     value: '#fbfaf6', swatch: '#fbfaf6' },
  { name: '青瓷',   mood: 'Celadon',   value: '#d6e8e2', swatch: '#d6e8e2' },
  // 新增 4 个预设
  { name: '夜航',   mood: 'Voyage',    value: 'linear-gradient(135deg, #1a2a3a 0%, #0a141f 100%)', swatch: 'linear-gradient(135deg, #1a2a3a 0%, #0a141f 100%)' },
  { name: '桃绯',   mood: 'Bloom',     value: 'linear-gradient(135deg, #f4d4d4 0%, #c47878 100%)', swatch: 'linear-gradient(135deg, #f4d4d4 0%, #c47878 100%)' },
  { name: '苔玉',   mood: 'Jade',      value: 'linear-gradient(135deg, #a8c4a0 0%, #4a6840 100%)', swatch: 'linear-gradient(135deg, #a8c4a0 0%, #4a6840 100%)' },
  { name: '霜金',   mood: 'Frost',     value: 'linear-gradient(135deg, #e8e4d4 0%, #b8a878 100%)', swatch: 'linear-gradient(135deg, #e8e4d4 0%, #b8a878 100%)' },
];

// 滤镜预设
const FILTER_PRESETS: { name: string; value: string; swatch: string }[] = [
  { name: '无',     value: '',                              swatch: '' },
  { name: '柔焦',   value: 'blur(2px)',                     swatch: 'blur(2px)' },
  { name: '强焦',   value: 'blur(4px)',                     swatch: 'blur(4px)' },
  { name: '暗化',   value: 'brightness(0.7)',               swatch: 'brightness(0.7)' },
  { name: '灰度',   value: 'grayscale(1)',                  swatch: 'grayscale(1)' },
  { name: '复古',   value: 'sepia(0.6) contrast(1.1)',      swatch: 'sepia(0.6)' },
  { name: '高饱和', value: 'saturate(1.5)',                 swatch: 'saturate(1.5)' },
  { name: '低饱和', value: 'saturate(0.5)',                 swatch: 'saturate(0.5)' },
  { name: '高对比', value: 'contrast(1.3)',                 swatch: 'contrast(1.3)' },
  { name: '冷调',   value: 'hue-rotate(-15deg) saturate(1.2)', swatch: 'hue-rotate(-15deg)' },
  { name: '暖调',   value: 'hue-rotate(15deg) saturate(1.2)',  swatch: 'hue-rotate(15deg)' },
  { name: '梦境',   value: 'blur(1.5px) brightness(1.1) saturate(1.2)', swatch: 'blur(1.5px)' },
];

// 动画预设
const ANIMATION_PRESETS: { name: string; value: string; desc: string }[] = [
  { name: '无',       value: 'none',          desc: '静态' },
  { name: '视差',     value: 'parallax',      desc: '随滚动轻微位移' },
  { name: '流动渐变', value: 'gradient-flow', desc: '渐变缓慢流动（仅对渐变背景生效）' },
  { name: '呼吸',     value: 'pulse',         desc: '缓慢缩放呼吸' },
  { name: '漂移',     value: 'drift',         desc: '极慢漂移' },
];

export const BackgroundPanel: React.FC<Props> = ({
  background,
  backgroundOpacity,
  backgroundFilter = '',
  backgroundAnimation = 'none',
  conversation,
  character,
  onUpdate,
  onClose,
}) => {
  const [localBg, setLocalBg] = useState(background);
  const [localOpacity, setLocalOpacity] = useState(backgroundOpacity);
  const [localFilter, setLocalFilter] = useState(backgroundFilter);
  const [localAnimation, setLocalAnimation] = useState(backgroundAnimation);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [savedBackgrounds, setSavedBackgrounds] = useState<SavedBackground[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { settings, update: updateSettings } = useSettingsStore();
  const { characters } = useCharacterStore();

  useEffect(() => {
    backendApi.savedBackgrounds.getAll().then(setSavedBackgrounds).catch(console.error);
  }, []);

  // 当外部 prop 变化时（如切换对话、其他面板修改了背景），同步 local state
  // 这是关键修复：之前 localBg 不会跟随 prop 变化，导致面板预览与实际背景脱节
  useEffect(() => {
    setLocalBg(background);
  }, [background]);
  useEffect(() => {
    setLocalOpacity(backgroundOpacity);
  }, [backgroundOpacity]);
  useEffect(() => {
    setLocalFilter(backgroundFilter);
  }, [backgroundFilter]);
  useEffect(() => {
    setLocalAnimation(backgroundAnimation);
  }, [backgroundAnimation]);

  // 找到当前对话绑定的角色（优先用 props.character，回退到 store 中查找）
  const activeCharacter = character || (conversation?.characterId
    ? characters.find(c => c.id === conversation.characterId)
    : undefined);

  const apply = async (data: Partial<{ background: string; backgroundOpacity: number; backgroundFilter: string; backgroundAnimation: string }>) => {
    // 先快照旧值，便于失败时回滚
    const prevBg = localBg;
    const prevOpacity = localOpacity;
    const prevFilter = localFilter;
    const prevAnimation = localAnimation;

    if (data.background !== undefined) setLocalBg(data.background);
    if (data.backgroundOpacity !== undefined) setLocalOpacity(data.backgroundOpacity);
    if (data.backgroundFilter !== undefined) setLocalFilter(data.backgroundFilter);
    if (data.backgroundAnimation !== undefined) setLocalAnimation(data.backgroundAnimation);

    try {
      await onUpdate({
        background: data.background !== undefined ? data.background : localBg,
        backgroundOpacity: data.backgroundOpacity !== undefined ? data.backgroundOpacity : localOpacity,
        backgroundFilter: data.backgroundFilter !== undefined ? data.backgroundFilter : localFilter,
        backgroundAnimation: data.backgroundAnimation !== undefined ? data.backgroundAnimation : localAnimation,
      });
    } catch (err) {
      console.error('Failed to persist background:', err);
      const msg = err instanceof Error ? err.message : String(err);
      // 回滚 local state，保持 UI 与存储一致
      setLocalBg(prevBg);
      setLocalOpacity(prevOpacity);
      setLocalFilter(prevFilter);
      setLocalAnimation(prevAnimation);
      alert(`背景应用失败：${msg}\n\n可能原因：本地存储空间不足。请尝试较小的图片、清理旧对话，或使用图片 URL。`);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空 input value，确保再次选择同一文件能触发 change
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file, 1600, 0.8);
      apply({ background: compressed });
    } catch (err) {
      console.error('Background upload failed:', err);
      const msg = err instanceof Error ? err.message : '未知错误';
      alert(`背景图片上传失败：${msg}\n\n请尝试较小的图片（建议 < 4MB）或使用图片 URL。`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrl = () => {
    const url = prompt('请输入图片 URL：');
    if (url && url.trim()) {
      apply({ background: url.trim() });
    }
  };

  const handleClear = () => {
    apply({ background: '', backgroundFilter: '', backgroundAnimation: 'none' });
  };

  /**
   * AI 生成背景图：根据角色 + 剧情设定自动生成氛围背景
   */
  const handleAIGenerate = async () => {
    setGenError(null);
    if (!settings.apiKey) {
      setGenError('请先在设置中配置 API Key');
      return;
    }
    if (!conversation) {
      setGenError('未找到当前对话');
      return;
    }

    setIsGenerating(true);
    try {
      const dataUrl = await generateBackgroundImage(activeCharacter || null, conversation, settings);
      apply({ background: dataUrl });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 设为全局默认背景：将当前对话背景同步到 settings.wallpaper
   */
  const handleSetAsGlobal = () => {
    updateSettings({
      wallpaper: localBg,
      wallpaperOpacity: localOpacity,
      wallpaperFilter: localFilter,
      wallpaperAnimation: localAnimation,
    });
  };

  /**
   * 收藏当前背景
   */
  const handleSaveCurrent = async () => {
    if (!localBg) return;
    const name = prompt('为这个背景命名：', `背景 ${savedBackgrounds.length + 1}`);
    if (!name) return;
    try {
      await backendApi.savedBackgrounds.add({
        name,
        value: localBg,
        source: localBg.startsWith('data:') ? 'upload' :
                localBg.startsWith('http') ? 'url' :
                localBg.startsWith('linear') || localBg.startsWith('#') ? 'preset' : 'unknown',
      });
      const list = await backendApi.savedBackgrounds.getAll();
      setSavedBackgrounds(list);
    } catch (err) {
      console.error('Failed to save background:', err);
    }
  };

  /**
   * 应用收藏的背景
   */
  const handleApplySaved = (saved: SavedBackground) => {
    apply({ background: saved.value });
  };

  /**
   * 删除收藏
   */
  const handleRemoveSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await backendApi.savedBackgrounds.remove(id);
      const list = await backendApi.savedBackgrounds.getAll();
      setSavedBackgrounds(list);
    } catch (err) {
      console.error('Failed to remove background:', err);
    }
  };

  const isGradientOrImage = (val: string) =>
    val && (val.startsWith('linear') || val.startsWith('radial') || val.startsWith('http') ||
            val.startsWith('data:') || val.startsWith('#') || val.startsWith('conic'));

  /**
   * 将背景值格式化为 CSS background 属性值。
   * - http/data URL 必须 url() 包裹，否则浏览器无法解析
   * - linear/radial/conic 渐变、纯色（#xxx）直接使用
   * - 空值返回 'none'
   */
  const formatBg = (val: string): string => {
    if (!val) return 'none';
    if (val.startsWith('http') || val.startsWith('data:')) {
      return `url(${val})`;
    }
    return val;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-veil fade-in"
      onClick={onClose}
    >
      <div
        className="editorial-card w-full max-w-full md:max-w-2xl max-h-[88vh] overflow-hidden rounded-md cinematic-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-4 md:px-7 pt-5 md:pt-6 pb-4 md:pb-5 hairline-b">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="eyebrow eyebrow-accent mb-1.5">No. 02 — Backdrop</div>
              <h2 className="font-display text-[28px] leading-[1.05] font-light tracking-[-0.025em]" style={{ color: 'var(--ink)' }}>
                对话<em className="italic font-extralight" style={{ color: 'var(--accent)' }}> 背景</em>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--muted-2)] hover:text-[var(--ink)] transition-quick press-shrink"
              title="关闭"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[12.5px] leading-[1.7]" style={{ color: 'var(--muted)' }}>
            为每个对话设定独立的视觉氛围 — AI 生成 / 调色板 / 上传 / 滤镜 / 动画 / 收藏
          </p>
        </div>

        <div className="px-4 md:px-7 py-5 md:py-6 overflow-y-auto max-h-[calc(88vh-180px)] space-y-7">
          {/* A · 预览 */}
          <div className="cinematic-fade">
            <div className="flex items-baseline justify-between mb-3">
              <span className="eyebrow">A · 预览</span>
              <div className="flex items-center gap-3">
                {localBg && (
                  <button
                    onClick={handleSaveCurrent}
                    className="text-[10.5px] tracking-wider uppercase press-shrink hover:underline"
                    style={{ color: 'var(--accent)' }}
                    title="收藏当前背景供后续复用"
                  >
                    + 收藏
                  </button>
                )}
                <span className="numeric-badge">PREVIEW</span>
              </div>
            </div>
            <div
              className="w-full h-44 hairline overflow-hidden relative"
              style={{
                background: localBg
                  ? (localBg.startsWith('http') || localBg.startsWith('data:')
                    ? `${formatBg(localBg)} center/cover no-repeat`
                    : localBg)
                  : 'var(--paper-2)',
                filter: localFilter || undefined,
              }}
            >
              <div className="absolute inset-0 grain" />
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: `rgba(244,241,234,${1 - localOpacity})` }}
              >
                <div className="text-center px-6">
                  <div className="font-display text-[22px] font-light italic leading-tight" style={{ color: 'var(--ink)' }}>
                    The dialogue
                  </div>
                  <div className="font-display text-[14px] mt-1" style={{ color: 'var(--muted-2)' }}>
                    lives here.
                  </div>
                  {localAnimation !== 'none' && (
                    <div className="mt-2 text-[9px] tracking-[0.2em] uppercase" style={{ color: 'var(--accent)' }}>
                      ◆ {ANIMATION_PRESETS.find(a => a.value === localAnimation)?.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* B · AI 生成 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>B · AI 生成</span>
              <span>GENERATE</span>
            </div>
            <button
              onClick={handleAIGenerate}
              disabled={isGenerating}
              className="w-full px-4 py-4 hairline text-[13px] hover:bg-[var(--paper-2)] hover:border-[var(--ink-2)] transition-quick flex items-center gap-3 press-shrink disabled:opacity-50 disabled:cursor-wait"
              style={{ color: 'var(--ink)' }}
            >
              <span
                className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--ink)', color: 'var(--paper)', borderRadius: 3 }}
              >
                {isGenerating ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                )}
              </span>
              <span className="text-left flex-1">
                <span className="block font-medium text-[13px]">
                  {isGenerating ? 'AI 生成中…' : 'AI 生成场景背景'}
                </span>
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--muted-2)' }}>
                  {activeCharacter
                    ? `根据「${activeCharacter.name}」${conversation?.plotMode ? '的剧情设定' : ''}自动生成氛围背景`
                    : '根据当前对话自动生成氛围背景'}
                </span>
              </span>
              <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {genError && (
              <div className="mt-2 px-3 py-2 text-[11px] hairline" style={{ color: 'var(--accent)', background: 'var(--paper-2)' }}>
                {genError}
              </div>
            )}
          </div>

          {/* C · 调色板 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>C · 调色板</span>
              <span>{PRESETS.length}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PRESETS.map((p, idx) => {
                const isActive = localBg === p.value;
                return (
                  <button
                    key={p.name}
                    onClick={() => apply({ background: p.value })}
                    className="group relative press-shrink cinematic-fade"
                    style={{ animationDelay: `${idx * 25}ms` }}
                    title={p.name}
                  >
                    <div
                      className={`w-full aspect-[4/3] overflow-hidden relative hairline transition-quick ${
                        isActive ? 'ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--paper)]' : 'group-hover:scale-[1.03]'
                      }`}
                      style={{ background: p.swatch }}
                    >
                      <div className="absolute inset-0 grain opacity-30" />
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(244,241,234,0.7)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: 'var(--ink)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{p.name}</span>
                      <span className="numeric-badge" style={{ color: 'var(--muted-2)' }}>{p.mood}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* D · 自定义上传 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>D · 自定义</span>
              <span>UPLOAD</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isGenerating}
                className="group px-4 py-4 hairline text-[13px] hover:bg-[var(--paper-2)] hover:border-[var(--ink-2)] transition-quick flex items-center gap-3 press-shrink disabled:opacity-60 disabled:cursor-wait"
                style={{ color: 'var(--ink)' }}
              >
                <span className="w-8 h-8 hairline flex items-center justify-center flex-shrink-0" style={{ color: 'var(--muted)' }}>
                  {isUploading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                </span>
                <span className="text-left">
                  <span className="block font-medium text-[12.5px]">
                    {isUploading ? '压缩中…' : '上传图片'}
                  </span>
                  <span className="block numeric-badge mt-0.5">本地文件 · 自动压缩</span>
                </span>
              </button>
              <button
                onClick={handleUrl}
                className="group px-4 py-4 hairline text-[13px] hover:bg-[var(--paper-2)] hover:border-[var(--ink-2)] transition-quick flex items-center gap-3 press-shrink"
                style={{ color: 'var(--ink)' }}
              >
                <span className="w-8 h-8 hairline flex items-center justify-center flex-shrink-0" style={{ color: 'var(--muted)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </span>
                <span className="text-left">
                  <span className="block font-medium text-[12.5px]">图片 URL</span>
                  <span className="block numeric-badge mt-0.5">远程链接</span>
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          </div>

          {/* E · 收藏夹 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>E · 收藏夹</span>
              <span>{String(savedBackgrounds.length).padStart(2, '0')}</span>
            </div>
            {savedBackgrounds.length === 0 ? (
              <div className="px-4 py-6 hairline text-center text-[11.5px]" style={{ color: 'var(--muted-2)' }}>
                暂无收藏 — 选择背景后点击右上角「+ 收藏」即可保存
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {savedBackgrounds.map((saved) => {
                  const isActive = localBg === saved.value;
                  return (
                    <button
                      key={saved.id}
                      onClick={() => handleApplySaved(saved)}
                      className="group relative press-shrink text-left"
                      title={saved.name}
                    >
                      <div
                        className={`w-full aspect-[4/3] overflow-hidden relative hairline transition-quick ${
                          isActive ? 'ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--paper)]' : 'group-hover:scale-[1.03]'
                        }`}
                        style={{
                          background: saved.value
                            ? (saved.value.startsWith('http') || saved.value.startsWith('data:')
                              ? `${formatBg(saved.value)} center/cover no-repeat`
                              : saved.value)
                            : 'var(--paper-2)',
                        }}
                      >
                        <div className="absolute inset-0 grain opacity-30" />
                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => handleRemoveSaved(saved.id, e)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-quick"
                          style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
                          title="删除"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(244,241,234,0.7)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: 'var(--ink)' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-baseline justify-between">
                        <span className="text-[11px] font-medium truncate" style={{ color: 'var(--ink)' }}>{saved.name}</span>
                        <span className="numeric-badge text-[9px]" style={{ color: 'var(--muted-2)' }}>{saved.source}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* F · 滤镜 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>F · 滤镜</span>
              <span>{localFilter ? 'ON' : 'OFF'}</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {FILTER_PRESETS.map((f) => {
                const isActive = localFilter === f.value;
                return (
                  <button
                    key={f.name}
                    onClick={() => apply({ backgroundFilter: f.value })}
                    className={`px-2 py-2 text-[11px] hairline transition-quick press-shrink ${
                      isActive ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--paper-2)]'
                    }`}
                    style={{
                      borderRadius: 2,
                      color: isActive ? 'var(--paper)' : 'var(--ink)',
                    }}
                    title={f.value || '无滤镜'}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* G · 动画 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>G · 动画</span>
              <span>{ANIMATION_PRESETS.find(a => a.value === localAnimation)?.name || 'NONE'}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {ANIMATION_PRESETS.map((a) => {
                const isActive = localAnimation === a.value;
                return (
                  <button
                    key={a.name}
                    onClick={() => apply({ backgroundAnimation: a.value })}
                    className={`px-2 py-3 hairline text-center transition-quick press-shrink ${
                      isActive ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--paper-2)]'
                    }`}
                    style={{
                      borderRadius: 2,
                      color: isActive ? 'var(--paper)' : 'var(--ink)',
                    }}
                    title={a.desc}
                  >
                    <div className="text-[12px] font-medium">{a.name}</div>
                    <div className="text-[9px] mt-0.5 opacity-60 leading-tight">{a.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* H · 透明度 */}
          <div>
            <div className="hairline-ticker mb-4">
              <span>H · 透明度</span>
              <span>{String(Math.round(localOpacity * 100)).padStart(3, '0')}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localOpacity}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                apply({ backgroundOpacity: v });
              }}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="mt-2 flex items-center justify-between text-[10.5px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
              <span>背景清晰</span>
              <span>内容优先</span>
            </div>
          </div>

          {/* 操作行：设为全局默认 + 清除 */}
          <div className="flex gap-2">
            <button
              onClick={handleSetAsGlobal}
              disabled={!localBg}
              className="flex-1 px-4 py-2.5 text-[12px] tracking-wider hairline hover:bg-[var(--paper-2)] transition-quick press-shrink disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: 'var(--ink)' }}
              title="将当前背景同步为全局默认（新对话无独立背景时使用）"
            >
              <svg className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              设为全局默认
            </button>
            {localBg && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 text-[12px] tracking-wider hairline hover:bg-[var(--paper-2)] transition-quick press-shrink"
                style={{ color: 'var(--accent)' }}
              >
                <svg className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                清除
              </button>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="px-4 md:px-7 py-3 md:py-4 hairline-t flex justify-end items-center gap-3">
          <span className="text-[10.5px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
            — Atelier · Backdrop —
          </span>
          <button
            onClick={onClose}
            className="tactile press-shrink"
          >
            <span>完成</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
