import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { AppSettings, User } from '../../shared/types';
import { compressImage } from '../lib/utils';

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onClose: () => void;
  /** 登出回调 */
  onLogout?: () => void | Promise<void>;
  /** 当前登录用户 */
  currentUser?: User | null;
}

type Section = 'api' | 'model' | 'appearance' | 'wallpaper' | 'about';

// 编辑设计风格的预设背景 — 沉稳的色板而非刺眼渐变
const PRESET_WALLPAPERS: { name: string; en: string; value: string; tone: 'warm' | 'cool' | 'neutral' }[] = [
  { name: '暮色', en: 'Dusk', value: 'linear-gradient(160deg, #2d2820 0%, #4a3f33 50%, #6b5644 100%)', tone: 'warm' },
  { name: '羊皮纸', en: 'Parchment', value: 'linear-gradient(135deg, #e8e0cf 0%, #d4c8b0 100%)', tone: 'warm' },
  { name: '墨海', en: 'Ink Sea', value: 'linear-gradient(180deg, #0e0c0a 0%, #1a1714 100%)', tone: 'neutral' },
  { name: '雾境', en: 'Mist', value: 'linear-gradient(165deg, #c8c2b8 0%, #a89e90 50%, #7a7264 100%)', tone: 'neutral' },
  { name: '陶土', en: 'Terracotta', value: 'linear-gradient(145deg, #a4503b 0%, #c46f56 100%)', tone: 'warm' },
  { name: '苔痕', en: 'Moss', value: 'linear-gradient(150deg, #3a4a3a 0%, #5a6b55 100%)', tone: 'cool' },
  { name: '石灰', en: 'Limewash', value: 'linear-gradient(135deg, #f0ece2 0%, #d8d0c0 100%)', tone: 'warm' },
  { name: '铜绿', en: 'Verdigris', value: 'linear-gradient(160deg, #4a5e5a 0%, #6a7e78 100%)', tone: 'cool' },
];

// 滤镜预设 — 与 BackgroundPanel 保持一致
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

// 动画预设 — 与 BackgroundPanel 保持一致
const ANIMATION_PRESETS: { name: string; value: string; desc: string }[] = [
  { name: '无',       value: 'none',          desc: '静态' },
  { name: '视差',     value: 'parallax',      desc: '随滚动轻微位移' },
  { name: '流动渐变', value: 'gradient-flow', desc: '渐变缓慢流动（仅对渐变背景生效）' },
  { name: '呼吸',     value: 'pulse',         desc: '缓慢缩放呼吸' },
  { name: '漂移',     value: 'drift',         desc: '极慢漂移' },
];

const QUICK_PRESETS = [
  { name: 'OpenAI', base: 'https://api.openai.com/v1', code: 'A' },
  { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', code: 'D' },
  { name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', code: 'T' },
  { name: '月之暗面', base: 'https://api.moonshot.cn/v1', code: 'K' },
];

const FEATURES = [
  { name: '多智能体', en: 'Multi-Agent', desc: '创建专属角色' },
  { name: '剧情演绎', en: 'Plot Mode', desc: '沉浸式角色扮演' },
  { name: '长期记忆', en: 'Memory', desc: '告别对话失忆' },
  { name: '独立背景', en: 'Backdrop', desc: '每个对话的氛围' },
];

export const SettingsPanel: React.FC<Props> = ({ settings, onUpdate, onClose, onLogout, currentUser }) => {
  const [wallpaperPreview, setWallpaperPreview] = useState(settings.wallpaper);
  const [activeSection, setActiveSection] = useState<Section>('api');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 同步外部 settings.wallpaper 变化（如切换主题/重置后）
  React.useEffect(() => {
    setWallpaperPreview(settings.wallpaper);
  }, [settings.wallpaper]);

  const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空 input value，确保再次选择同一文件能触发 change
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const compressed = await compressImage(file, 1600, 0.8);
      setWallpaperPreview(compressed);
      onUpdate({ wallpaper: compressed });
    } catch (err) {
      console.error('Wallpaper upload failed:', err);
      const msg = err instanceof Error ? err.message : '未知错误';
      setUploadError(`上传失败：${msg}`);
      alert(`背景图片上传失败：${msg}\n\n请尝试较小的图片（建议 < 4MB）或使用图片 URL。`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleWallpaperUrl = () => {
    const url = prompt('请输入壁纸图片 URL：');
    if (url) {
      setUploadError(null);
      setWallpaperPreview(url);
      onUpdate({ wallpaper: url });
    }
  };

  const handleRemoveWallpaper = () => {
    setWallpaperPreview('');
    // 同步清空滤镜与动画（不透明度保留，作为用户下次设置时的偏好）
    onUpdate({ wallpaper: '', wallpaperFilter: '', wallpaperAnimation: 'none' });
  };

  const applyPreset = (value: string) => {
    setWallpaperPreview(value);
    onUpdate({ wallpaper: value });
  };

  const sections: { id: Section; label: string; en: string; icon: React.ReactNode; code: string }[] = [
    {
      id: 'api',
      label: 'API 配置',
      en: 'Credentials',
      code: '01',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
    {
      id: 'model',
      label: '模型参数',
      en: 'Model',
      code: '02',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'appearance',
      label: '外观',
      en: 'Appearance',
      code: '03',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      id: 'wallpaper',
      label: '全局背景',
      en: 'Wallpaper',
      code: '04',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'about',
      label: '关于',
      en: 'About',
      code: '05',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const activeSectionData = sections.find((s) => s.id === activeSection);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-veil fade-in"
      onClick={onClose}
    >
      <div
        className="editorial-card w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-md flex flex-col md:flex-row cinematic-rise"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--paper)' }}
      >
        {/* 左侧导航 */}
        <div
          className="w-full md:w-60 hairline-b md:hairline-r md:hairline-b-0 flex flex-col flex-shrink-0"
          style={{ background: 'var(--surface)' }}
        >
          {/* Masthead — 移动端隐藏 */}
          <div className="hidden md:block px-6 pt-6 pb-5 hairline-b">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="eyebrow eyebrow-accent mb-1.5">Preferences</div>
                <h2 className="font-display text-[24px] leading-[1.05] font-light tracking-[-0.025em]" style={{ color: 'var(--ink)' }}>
                  设<em className="italic font-extralight" style={{ color: 'var(--accent)' }}>置</em>
                </h2>
              </div>
              <span className="numeric-badge mt-1">05</span>
            </div>
            <p className="text-[11.5px] leading-[1.65]" style={{ color: 'var(--muted)' }}>
              个性化你的对话环境
            </p>
          </div>

          {/* 导航列表 - 移动端水平滚动 */}
          <nav className="flex-1 p-2 md:p-3 flex md:flex-col md:space-y-0.5 gap-1 overflow-x-auto md:overflow-x-visible">
            {sections.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`group relative flex items-center gap-2 md:gap-3 pl-2 md:pl-3 pr-2 md:pr-3 py-2 md:py-2.5 text-left transition-quick press-shrink whitespace-nowrap flex-shrink-0 md:flex-shrink ${
                    isActive ? '' : 'hover:bg-[var(--paper-2)]'
                  }`}
                  style={{
                    background: isActive ? 'var(--paper-2)' : 'transparent',
                    color: isActive ? 'var(--ink)' : 'var(--muted)',
                  }}
                >
                  {isActive && (
                    <span
                      className="vertical-accent absolute left-0 top-2 bottom-2 w-[2px] hidden md:block"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  <span
                    className="font-mono-ui text-[10px] tracking-[0.1em] w-5 hidden md:inline"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--muted-2)' }}
                  >
                    {s.code}
                  </span>
                  <span
                    className="transition-quick"
                    style={{ color: isActive ? 'var(--ink)' : 'var(--muted-2)' }}
                  >
                    {s.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] md:text-[13px] font-medium tracking-[-0.005em]">{s.label}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* 底部状态 — 移动端隐藏 */}
          <div className="hidden md:block p-4 hairline-t flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow" style={{ color: 'var(--muted-2)' }}>Status</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="text-[10.5px] font-mono-ui" style={{ color: 'var(--muted)' }}>Active</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="tactile w-full flex items-center justify-center gap-2 press-shrink text-[13px]"
            >
              <span>完成</span>
              <span className="font-mono-ui text-[9.5px] opacity-70">↩</span>
            </button>
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Section header */}
          <div className="px-4 md:px-7 pt-4 md:pt-6 pb-3 md:pb-4 hairline-b">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="eyebrow eyebrow-accent mb-1.5">
                  No.{activeSectionData?.code} — {activeSectionData?.en}
                </div>
                <h2 className="font-display text-[26px] leading-[1.05] font-light tracking-[-0.025em]" style={{ color: 'var(--ink)' }}>
                  {activeSectionData?.label}
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
            <div className="hairline-ticker">
              <span>编辑中</span>
              <span>实时同步</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-7 py-4 md:py-6">
            {activeSection === 'api' && (
              <div className="space-y-6 cinematic-fade">
                <div
                  className="p-4 hairline rounded-sm flex items-start gap-3"
                  style={{ background: 'var(--paper-2)' }}
                >
                  <span
                    className="font-display text-[28px] font-light leading-none italic"
                    style={{ color: 'var(--accent)' }}
                  >
                    i
                  </span>
                  <div className="flex-1 text-[12px] leading-[1.7]" style={{ color: 'var(--muted)' }}>
                    你的 API Key <strong style={{ color: 'var(--ink)' }}>仅保存在本地</strong>，不会上传到任何服务器。支持 OpenAI 兼容协议的服务（OpenAI、Azure、DeepSeek 等）。
                  </div>
                </div>

                <Field
                  code="A.1"
                  label="API Key"
                  tip="请填入你的 API 密钥"
                >
                  <div className="glow-on-focus rounded-sm" style={{ border: '1px solid var(--hairline-strong)' }}>
                    <input
                      type="password"
                      value={settings.apiKey}
                      onChange={(e) => onUpdate({ apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full px-3.5 py-2.5 bg-transparent text-[13px] focus:outline-none transition-quick"
                      style={{ color: 'var(--ink)' }}
                    />
                  </div>
                </Field>

                <Field
                  code="A.2"
                  label="API 地址"
                  tip="OpenAI 兼容协议的 API 服务地址"
                >
                  <div className="glow-on-focus rounded-sm" style={{ border: '1px solid var(--hairline-strong)' }}>
                    <input
                      type="text"
                      value={settings.apiBase}
                      onChange={(e) => onUpdate({ apiBase: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                      className="w-full px-3.5 py-2.5 bg-transparent text-[13px] focus:outline-none transition-quick"
                      style={{ color: 'var(--ink)' }}
                    />
                  </div>
                </Field>

                <Field
                  code="A.3"
                  label="快捷预设"
                  tip="点击快速填入对应服务地址"
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    {QUICK_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => onUpdate({ apiBase: p.base })}
                        className="group p-3 hairline rounded-sm text-left transition-quick press-shrink hover:border-[var(--ink-2)] hover:bg-[var(--paper-2)] magnetic"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <span
                            className="font-display text-[20px] font-light leading-none"
                            style={{ color: 'var(--accent)' }}
                          >
                            {p.code}
                          </span>
                          <span
                            className="font-mono-ui text-[9.5px] tracking-[0.1em]"
                            style={{ color: 'var(--muted-2)' }}
                          >
                            →
                          </span>
                        </div>
                        <div className="text-[12.5px] font-medium mb-0.5" style={{ color: 'var(--ink)' }}>
                          {p.name}
                        </div>
                        <div className="text-[10px] truncate font-mono-ui" style={{ color: 'var(--muted-2)' }}>
                          {p.base}
                        </div>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {activeSection === 'model' && (
              <div className="space-y-6 cinematic-fade">
                <Field code="B.1" label="模型选择" tip="选择要使用的 AI 模型">
                  <div className="glow-on-focus rounded-sm" style={{ border: '1px solid var(--hairline-strong)' }}>
                    <select
                      value={settings.model}
                      onChange={(e) => onUpdate({ model: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-transparent text-[13px] focus:outline-none transition-quick appearance-none cursor-pointer"
                      style={{ color: 'var(--ink)' }}
                    >
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="o1">o1</option>
                      <option value="o1-mini">o1 Mini</option>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                      <option value="deepseek-chat">DeepSeek Chat</option>
                    </select>
                  </div>
                </Field>

                <Field
                  code="B.2"
                  label="Temperature"
                  tip="控制回复的随机性。值越高越发散创意，越低越稳定精确"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: settings.temperature < 0.7 ? 'var(--accent)' : 'var(--muted-2)' }}
                        />
                        <span className="text-[10.5px] uppercase tracking-[0.12em] font-mono-ui" style={{ color: 'var(--muted)' }}>精确</span>
                      </div>
                      <span
                        className="font-mono-ui text-[12px] tabular-nums px-2 py-0.5 rounded-sm"
                        style={{ background: 'var(--paper-2)', color: 'var(--ink)' }}
                      >
                        {settings.temperature.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] uppercase tracking-[0.12em] font-mono-ui" style={{ color: 'var(--muted)' }}>创意</span>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: settings.temperature > 1.3 ? 'var(--accent)' : 'var(--muted-2)' }}
                        />
                      </div>
                    </div>
                    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
                      <div
                        className="absolute inset-y-0 left-0 transition-quick"
                        style={{
                          width: `${(settings.temperature / 2) * 100}%`,
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
                      className="w-full editorial-slider"
                    />
                  </div>
                </Field>

                <Field code="B.3" label="Max Tokens" tip="单次回复的最大长度">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative h-1 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
                      <div
                        className="absolute inset-y-0 left-0 transition-quick"
                        style={{
                          width: `${(settings.maxTokens / 32000) * 100}%`,
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="256"
                      max="32000"
                      step="256"
                      value={settings.maxTokens}
                      onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value, 10) })}
                      className="sr-only"
                    />
                    <div
                      className="px-3 py-1.5 rounded-sm font-mono-ui text-[12px] tabular-nums"
                      style={{ background: 'var(--paper-2)', color: 'var(--ink)', minWidth: '5.5rem', textAlign: 'center' }}
                    >
                      {settings.maxTokens.toLocaleString()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => onUpdate({ maxTokens: Math.min(32000, settings.maxTokens + 1024) })}
                        className="w-6 h-4 hairline rounded-sm text-[10px] font-mono-ui transition-quick press-shrink hover:bg-[var(--paper-2)]"
                        style={{ color: 'var(--muted)' }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => onUpdate({ maxTokens: Math.max(256, settings.maxTokens - 1024) })}
                        className="w-6 h-4 hairline rounded-sm text-[10px] font-mono-ui transition-quick press-shrink hover:bg-[var(--paper-2)]"
                        style={{ color: 'var(--muted)' }}
                      >
                        −
                      </button>
                    </div>
                  </div>
                </Field>

                <Field
                  code="B.4"
                  label="联网搜索"
                  tip="开启后，发送消息前自动检索网络信息注入上下文"
                >
                  <button
                    onClick={() => onUpdate({ webSearchEnabled: !settings.webSearchEnabled })}
                    className="group w-full p-4 hairline rounded-sm text-left transition-quick press-shrink hover:bg-[var(--paper-2)]"
                    style={{
                      background: settings.webSearchEnabled ? 'var(--paper-2)' : 'transparent',
                      borderColor: settings.webSearchEnabled ? 'var(--accent)' : 'var(--hairline)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ color: settings.webSearchEnabled ? 'var(--accent)' : 'var(--muted)' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                          {settings.webSearchEnabled ? '已开启' : '已关闭'}
                        </span>
                      </div>
                      <span
                        className="w-9 h-5 rounded-full relative transition-quick"
                        style={{
                          background: settings.webSearchEnabled ? 'var(--accent)' : 'var(--hairline-strong)',
                        }}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-quick"
                          style={{ left: settings.webSearchEnabled ? '18px' : '2px' }}
                        />
                      </span>
                    </div>
                    <p className="text-[11px] leading-[1.6]" style={{ color: 'var(--muted)' }}>
                      开启后，每次发送消息会先通过 Wikipedia + DuckDuckGo 搜索相关信息，注入到 AI 上下文。可在输入栏底部快速切换。
                    </p>
                  </button>
                </Field>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-6 cinematic-fade">
                <Field code="C.1" label="主题模式" tip="切换浅色 / 深色模式">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onUpdate({ theme: 'light' })}
                      className={`group p-4 hairline rounded-sm text-left transition-quick press-shrink magnetic ${
                        settings.theme === 'light' ? 'is-selected' : ''
                      }`}
                      style={{
                        background: settings.theme === 'light' ? 'var(--paper-2)' : 'transparent',
                        borderColor: settings.theme === 'light' ? 'var(--ink-2)' : 'var(--hairline)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span
                          className="font-display text-[20px] font-light leading-none italic"
                          style={{ color: 'var(--accent)' }}
                        >
                          ☉
                        </span>
                        {settings.theme === 'light' && <CheckMark />}
                      </div>
                      <div
                        className="h-12 rounded-sm mb-3 flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #f4f1ea 0%, #e8e0cf 100%)',
                          border: '1px solid var(--hairline)',
                        }}
                      >
                        <span className="font-mono-ui text-[10px] tracking-[0.15em]" style={{ color: 'var(--muted)' }}>LIGHT</span>
                      </div>
                      <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>浅色模式</div>
                      <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--muted)' }}>明亮 · 清晰</div>
                    </button>

                    <button
                      onClick={() => onUpdate({ theme: 'dark' })}
                      className={`group p-4 hairline rounded-sm text-left transition-quick press-shrink magnetic ${
                        settings.theme === 'dark' ? 'is-selected' : ''
                      }`}
                      style={{
                        background: settings.theme === 'dark' ? 'var(--paper-2)' : 'transparent',
                        borderColor: settings.theme === 'dark' ? 'var(--ink-2)' : 'var(--hairline)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span
                          className="font-display text-[20px] font-light leading-none italic"
                          style={{ color: 'var(--accent)' }}
                        >
                          ☾
                        </span>
                        {settings.theme === 'dark' && <CheckMark />}
                      </div>
                      <div
                        className="h-12 rounded-sm mb-3 flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #1a1714 0%, #2d2820 100%)',
                          border: '1px solid var(--hairline)',
                        }}
                      >
                        <span className="font-mono-ui text-[10px] tracking-[0.15em]" style={{ color: 'var(--accent-soft)' }}>DARK</span>
                      </div>
                      <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>深色模式</div>
                      <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--muted)' }}>护眼 · 沉浸</div>
                    </button>
                  </div>
                </Field>

                <Field code="C.2" label="排版体验" tip="使用精致杂志式排版 — Fraunces + Inter Tight">
                  <div
                    className="p-4 hairline rounded-sm"
                    style={{ background: 'var(--paper-2)' }}
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <span
                        className="font-display text-[42px] font-light leading-none italic"
                        style={{ color: 'var(--accent)' }}
                      >
                        A
                      </span>
                      <span
                        className="font-display text-[24px] font-light leading-none"
                        style={{ color: 'var(--ink)' }}
                      >
                        a
                      </span>
                      <span
                        className="font-mono-ui text-[12px] tabular-nums"
                        style={{ color: 'var(--muted)' }}
                      >
                        01
                      </span>
                    </div>
                    <p
                      className="font-display text-[14px] leading-[1.5] tracking-[-0.005em]"
                      style={{ color: 'var(--ink)' }}
                    >
                      An <em className="italic" style={{ color: 'var(--accent)' }}>atelier</em> for thoughtful dialogue.
                    </p>
                    <p
                      className="text-[12px] leading-[1.65] mt-2"
                      style={{ color: 'var(--muted)' }}
                    >
                      通过字距、字重、留白与暖色调，构建克制的精致感。
                    </p>
                  </div>
                </Field>
              </div>
            )}

            {activeSection === 'wallpaper' && (
              <div className="space-y-6 cinematic-fade">
                <div
                  className="p-4 hairline rounded-sm flex items-start gap-3"
                  style={{ background: 'var(--paper-2)' }}
                >
                  <span
                    className="font-display text-[28px] font-light leading-none italic"
                    style={{ color: 'var(--accent)' }}
                  >
                    §
                  </span>
                  <div className="flex-1 text-[12px] leading-[1.7]" style={{ color: 'var(--muted)' }}>
                    这是<strong style={{ color: 'var(--ink)' }}>全局默认背景</strong>。单个对话可在聊天界面中设置独立的背景，会优先于此设置。
                  </div>
                </div>

                <Field code="D.0" label="当前预览" tip="实时反映滤镜 / 动画 / 不透明度效果">
                  <div
                    className={`w-full h-44 hairline rounded-sm overflow-hidden relative ${
                      (settings.wallpaperAnimation || 'none') === 'gradient-flow' ? 'bg-anim-gradient-flow' :
                      (settings.wallpaperAnimation || 'none') === 'pulse' ? 'bg-anim-pulse' :
                      (settings.wallpaperAnimation || 'none') === 'drift' ? 'bg-anim-drift' : ''
                    }`}
                  >
                    <div
                      className="parallax-layer absolute inset-0"
                      style={{
                        background: wallpaperPreview
                          ? wallpaperPreview.startsWith('http') || wallpaperPreview.startsWith('data:')
                            ? `url(${wallpaperPreview}) center/cover no-repeat`
                            : wallpaperPreview
                          : 'var(--paper-2)',
                        filter: settings.wallpaperFilter || undefined,
                        opacity: settings.wallpaperOpacity ?? 0.92,
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.35) 100%)' }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className="px-4 py-2 rounded-sm text-[11px] font-mono-ui tracking-[0.15em] uppercase"
                        style={{
                          background: 'rgba(255,255,255,0.85)',
                          color: 'var(--ink)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        {wallpaperPreview ? 'Preview' : 'No backdrop'}
                      </div>
                    </div>
                    {wallpaperPreview && (
                      <div
                        className="absolute bottom-3 left-3 text-[10px] font-mono-ui tracking-[0.1em] uppercase"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                      >
                        ▣ Current
                      </div>
                    )}
                  </div>
                </Field>

                <Field code="D.1" label="预设背景" tip="精选沉稳色板 · 编辑设计风格">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {PRESET_WALLPAPERS.map((p, idx) => (
                      <button
                        key={p.name}
                        onClick={() => applyPreset(p.value)}
                        className="group relative aspect-[4/3] hairline rounded-sm overflow-hidden transition-quick press-shrink magnetic cinematic-fade"
                        style={{
                          background: p.value,
                          animationDelay: `${idx * 40}ms`,
                        }}
                      >
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-quick flex items-end p-2"
                          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}
                        >
                          <div>
                            <div className="text-[11px] font-medium text-white leading-tight">{p.name}</div>
                            <div className="text-[8.5px] font-mono-ui tracking-[0.1em] uppercase text-white/70">{p.en}</div>
                          </div>
                        </div>
                        {wallpaperPreview === p.value && (
                          <div
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--accent)' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ color: 'var(--paper)' }} />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field code="D.2" label="自定义" tip="上传图片或填入 URL · 自动压缩到 1920px">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 hairline rounded-sm text-[12.5px] transition-quick press-shrink hover:bg-[var(--paper-2)] disabled:opacity-60 disabled:cursor-wait"
                      style={{ color: 'var(--ink)' }}
                    >
                      {isUploading ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          压缩中...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          上传图片
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleWallpaperUrl}
                      disabled={isUploading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 hairline rounded-sm text-[12.5px] transition-quick press-shrink hover:bg-[var(--paper-2)] disabled:opacity-60"
                      style={{ color: 'var(--ink)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      图片 URL
                    </button>
                    {wallpaperPreview && (
                      <button
                        onClick={handleRemoveWallpaper}
                        disabled={isUploading}
                        className="px-3 py-2.5 hairline rounded-sm text-[12.5px] transition-quick press-shrink hover:bg-[var(--paper-2)] disabled:opacity-60"
                        style={{ color: 'var(--accent)' }}
                        title="移除背景"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWallpaperChange}
                    className="hidden"
                    aria-hidden="true"
                  />
                  {uploadError && (
                    <div
                      className="mt-2 px-3 py-2 hairline rounded-sm text-[11px]"
                      style={{ color: 'var(--accent)', background: 'var(--paper-2)' }}
                    >
                      {uploadError}
                    </div>
                  )}
                </Field>

                <Field code="D.3" label="全局滤镜" tip="为全局默认背景叠加 CSS 滤镜">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {FILTER_PRESETS.map((f) => {
                      const isActive = (settings.wallpaperFilter || '') === f.value;
                      return (
                        <button
                          key={f.name}
                          onClick={() => onUpdate({ wallpaperFilter: f.value })}
                          className={`group relative h-14 hairline rounded-sm overflow-hidden transition-quick press-shrink ${
                            isActive ? 'ring-1 ring-[var(--accent)]' : 'hover:bg-[var(--paper-2)]'
                          }`}
                          style={{
                            background: f.swatch
                              ? `linear-gradient(135deg, #c46f56 0%, #e8b69e 50%, #4a3f33 100%)`
                              : 'var(--paper-2)',
                          }}
                        >
                          <span
                            className="absolute inset-0 pointer-events-none"
                            style={{ filter: f.swatch, background: 'linear-gradient(135deg, #c46f56 0%, #e8b69e 50%, #4a3f33 100%)' }}
                          />
                          <span
                            className="relative z-10 flex items-center justify-center h-full text-[11px] font-medium"
                            style={{
                              color: isActive ? 'var(--paper)' : 'var(--ink)',
                              textShadow: isActive
                                ? '0 1px 2px rgba(0,0,0,0.5)'
                                : '0 1px 2px rgba(255,255,255,0.6)',
                            }}
                          >
                            {f.name}
                          </span>
                          {isActive && (
                            <span
                              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                              style={{ background: 'var(--accent)' }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[10.5px] font-mono-ui tracking-[0.08em]" style={{ color: 'var(--muted-2)' }}>
                    {settings.wallpaperFilter ? `filter: ${settings.wallpaperFilter}` : 'filter: none'}
                  </div>
                </Field>

                <Field code="D.4" label="全局动画" tip="为全局默认背景添加动态效果">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {ANIMATION_PRESETS.map((a) => {
                      const isActive = (settings.wallpaperAnimation || 'none') === a.value;
                      return (
                        <button
                          key={a.name}
                          onClick={() => onUpdate({ wallpaperAnimation: a.value })}
                          className={`px-2 py-3 hairline rounded-sm text-center transition-quick press-shrink ${
                            isActive ? 'bg-[var(--ink)]' : 'hover:bg-[var(--paper-2)]'
                          }`}
                          style={{
                            color: isActive ? 'var(--paper)' : 'var(--ink)',
                          }}
                          title={a.desc}
                        >
                          <div className="text-[12px] font-medium leading-tight">{a.name}</div>
                          <div
                            className="mt-1 text-[9px] font-mono-ui tracking-[0.05em] uppercase opacity-70 leading-tight"
                            style={{ color: isActive ? 'var(--paper)' : 'var(--muted-2)' }}
                          >
                            {a.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field
                  code="D.5"
                  label="全局不透明度"
                  tip="调节背景图的显隐程度，过高可能影响消息可读性"
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={settings.wallpaperOpacity ?? 0.92}
                      onChange={(e) => onUpdate({ wallpaperOpacity: parseFloat(e.target.value) })}
                      className="editorial-slider flex-1"
                    />
                    <div
                      className="w-20 px-3 py-1.5 hairline rounded-sm text-center text-[11px] font-mono-ui tracking-[0.05em]"
                      style={{ color: 'var(--ink)' }}
                    >
                      {Math.round((settings.wallpaperOpacity ?? 0.92) * 100)}%
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => onUpdate({ wallpaperOpacity: 0.92 })}
                      className="px-2.5 py-1 hairline rounded-sm text-[10.5px] font-mono-ui tracking-[0.05em] transition-quick press-shrink hover:bg-[var(--paper-2)]"
                      style={{ color: 'var(--muted)' }}
                    >
                      默认 92%
                    </button>
                    <button
                      onClick={() => onUpdate({ wallpaperOpacity: 1 })}
                      className="px-2.5 py-1 hairline rounded-sm text-[10.5px] font-mono-ui tracking-[0.05em] transition-quick press-shrink hover:bg-[var(--paper-2)]"
                      style={{ color: 'var(--muted)' }}
                    >
                      全显 100%
                    </button>
                    <button
                      onClick={() => onUpdate({ wallpaperOpacity: 0.6 })}
                      className="px-2.5 py-1 hairline rounded-sm text-[10.5px] font-mono-ui tracking-[0.05em] transition-quick press-shrink hover:bg-[var(--paper-2)]"
                      style={{ color: 'var(--muted)' }}
                    >
                      轻透 60%
                    </button>
                  </div>
                </Field>

                <Field code="D.6" label="应用范围说明" tip="层级优先级">
                  <div
                    className="p-3 hairline rounded-sm text-[11.5px] leading-[1.7]"
                    style={{ background: 'var(--paper-2)', color: 'var(--muted)' }}
                  >
                    <strong style={{ color: 'var(--ink)' }}>对话级背景</strong> 优先于
                    <strong style={{ color: 'var(--ink)' }}> 全局默认背景</strong>。
                    若某个对话在聊天界面中设置了独立背景，将不会使用此处的全局设置。
                    全局滤镜 / 动画 / 不透明度仅在回退到全局背景时生效。
                  </div>
                </Field>
              </div>
            )}

            {activeSection === 'about' && (
              <div className="space-y-6 cinematic-fade">
                {/* 标志 */}
                <div className="text-center pt-2">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div
                      className="absolute inset-0 rounded-sm blur-xl opacity-30"
                      style={{ background: 'var(--accent)' }}
                    />
                    <div
                      className="relative w-full h-full rounded-sm flex items-center justify-center"
                      style={{
                        background: 'var(--ink)',
                        border: '1px solid var(--ink-2)',
                      }}
                    >
                      <span
                        className="font-display text-[36px] font-light leading-none italic"
                        style={{ color: 'var(--paper)' }}
                      >
                        A
                      </span>
                    </div>
                  </div>
                  <h3
                    className="font-display text-[28px] font-light tracking-[-0.025em] leading-[1.1]"
                    style={{ color: 'var(--ink)' }}
                  >
                    AI <em className="italic" style={{ color: 'var(--accent)' }}>Atelier</em>
                  </h3>
                  <p className="text-[12px] mt-1.5" style={{ color: 'var(--muted)' }}>
                    智能对话 · 剧情演绎 · 长期记忆
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="font-mono-ui text-[10px] tracking-[0.15em]" style={{ color: 'var(--muted-2)' }}>v</span>
                    <span className="font-mono-ui text-[10.5px]" style={{ color: 'var(--muted)' }}>1.0.0</span>
                    <span className="w-1 h-1 rounded-full" style={{ background: 'var(--muted-2)' }} />
                    <span className="font-mono-ui text-[10.5px] tracking-[0.1em]" style={{ color: 'var(--muted)' }}>BUILT WITH CARE</span>
                  </div>
                </div>

                {/* 功能矩阵 */}
                <div>
                  <div className="hairline-ticker mb-4">
                    <span>功能</span>
                    <span>{FEATURES.length} 项核心</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {FEATURES.map((f, idx) => (
                      <div
                        key={f.name}
                        className="p-3.5 hairline rounded-sm magnetic cinematic-fade"
                        style={{
                          background: 'var(--surface)',
                          animationDelay: `${idx * 50}ms`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span
                            className="font-display text-[24px] font-light leading-none"
                            style={{ color: 'var(--accent)' }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span
                            className="font-mono-ui text-[9px] tracking-[0.1em] uppercase"
                            style={{ color: 'var(--muted-2)' }}
                          >
                            {f.en}
                          </span>
                        </div>
                        <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{f.name}</div>
                        <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--muted)' }}>{f.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 致谢 */}
                <div
                  className="pt-3 hairline-t text-center"
                >
                  <p
                    className="font-display text-[12px] font-light italic tracking-[0.02em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    Made with intention · Powered by AI
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============== 子组件 ==============

const CheckMark: React.FC = () => (
  <div
    className="w-4 h-4 rounded-full flex items-center justify-center"
    style={{ background: 'var(--accent)' }}
  >
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ color: 'var(--paper)' }} />
    </svg>
  </div>
);

const Field: React.FC<{
  code: string;
  label: string;
  tip?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ code, label, tip, required, children }) => (
  <div>
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2">
        <span
          className="font-mono-ui text-[9.5px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
          style={{ background: 'var(--paper-2)', color: 'var(--muted)' }}
        >
          {code}
        </span>
        <label className="text-[12.5px] font-medium tracking-[-0.005em]" style={{ color: 'var(--ink)' }}>
          {label}
          {required && <span style={{ color: 'var(--accent)' }} className="ml-0.5">*</span>}
        </label>
      </div>
    </div>
    {children}
    {tip && (
      <p
        className="mt-1.5 text-[10.5px] leading-[1.55] tracking-[0.005em]"
        style={{ color: 'var(--muted-2)' }}
      >
        {tip}
      </p>
    )}
  </div>
);
