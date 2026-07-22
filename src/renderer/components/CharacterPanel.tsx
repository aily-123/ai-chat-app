import React, { useState, useEffect, useRef } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { useSettingsStore } from '../store/settingsStore';
import { generateCharacterLore } from '../services/characterLore';
import { compressImage } from '../lib/utils';
import type { Character } from '../../shared/types';

interface CharacterPanelProps {
  onClose: () => void;
  onStartChat?: (characterId: string) => void;
}

export const CharacterPanel: React.FC<CharacterPanelProps> = ({ onClose, onStartChat }) => {
  const { characters, loadCharacters, createCharacter, updateCharacter, deleteCharacter } = useCharacterStore();
  const { settings } = useSettingsStore();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingLore, setIsGeneratingLore] = useState(false);
  const [loreError, setLoreError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    description: '',
    personality: '',
    greeting: '',
    examples: '',
    instructions: '',
    lore: '',
    background: '',
    backgroundOpacity: 0.85,
    backgroundFilter: '',
    backgroundAnimation: 'none',
  });
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, []);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setFormData({
      name: character.name,
      avatar: character.avatar,
      description: character.description,
      personality: character.personality,
      greeting: character.greeting,
      examples: character.examples,
      instructions: character.instructions || '',
      lore: character.lore || '',
      background: character.background || '',
      backgroundOpacity: character.backgroundOpacity !== undefined ? character.backgroundOpacity : 0.85,
      backgroundFilter: character.backgroundFilter || '',
      backgroundAnimation: character.backgroundAnimation || 'none',
    });
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    setSelectedCharacter(null);
    setFormData({
      name: '',
      avatar: '',
      description: '',
      personality: '',
      greeting: '',
      examples: '',
      instructions: '',
      lore: '',
      background: '',
      backgroundOpacity: 0.85,
      backgroundFilter: '',
      backgroundAnimation: 'none',
    });
    setIsEditing(true);
  };

  /**
   * AI 自动搜索角色资料：让 LLM 根据角色名+简介生成完整资料集
   */
  const handleGenerateLore = async () => {
    if (!formData.name.trim()) {
      setLoreError('请先填写角色姓名');
      return;
    }
    if (!settings.apiKey) {
      setLoreError('请先在设置中配置 API Key');
      return;
    }

    setLoreError(null);
    setIsGeneratingLore(true);
    try {
      const lore = await generateCharacterLore(
        {
          name: formData.name,
          description: formData.description,
          personality: formData.personality,
          examples: formData.examples,
        },
        settings
      );
      setFormData({ ...formData, lore });
    } catch (err) {
      setLoreError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGeneratingLore(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    if (selectedCharacter) {
      await updateCharacter(selectedCharacter.id, formData);
    } else {
      const newCharacter = await createCharacter(formData);
      setSelectedCharacter(newCharacter);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (selectedCharacter && confirm(`确定要删除角色"${selectedCharacter.name}"吗？`)) {
      await deleteCharacter(selectedCharacter.id);
      setSelectedCharacter(null);
      setIsEditing(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUrl = () => {
    const url = prompt('请输入头像图片 URL：');
    if (url) setFormData({ ...formData, avatar: url });
  };

  // ===== 角色背景图片处理 =====
  const handleBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingBg(true);
    try {
      const compressed = await compressImage(file, 1600, 0.8);
      setFormData({ ...formData, background: compressed });
    } catch (err) {
      console.error('Background upload failed:', err);
      alert(`背景图片上传失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleBgUrl = () => {
    const url = prompt('请输入背景图片 URL：');
    if (url && url.trim()) setFormData({ ...formData, background: url.trim() });
  };

  const handleBgClear = () => {
    setFormData({ ...formData, background: '', backgroundFilter: '', backgroundAnimation: 'none' });
  };

  // 预设色板（与 BackgroundPanel 一致，精简版）
  const BG_PRESETS: { name: string; value: string }[] = [
    { name: '暖纸', value: '#f4f1ea' },
    { name: '暮色', value: 'linear-gradient(135deg, #d4a08a 0%, #8b5a47 100%)' },
    { name: '雾境', value: 'linear-gradient(135deg, #d6e0d4 0%, #93a8a0 100%)' },
    { name: '墨海', value: 'linear-gradient(135deg, #2d2820 0%, #1a1714 100%)' },
    { name: '晨雾', value: 'linear-gradient(135deg, #ece6da 0%, #c4b9a4 100%)' },
    { name: '沙漠', value: 'linear-gradient(135deg, #f0d8b8 0%, #c79974 100%)' },
    { name: '黄昏', value: 'linear-gradient(135deg, #f4c8a8 0%, #a4503b 100%)' },
    { name: '苔痕', value: 'linear-gradient(135deg, #b8b69b 0%, #5c6347 100%)' },
  ];

  const filtered = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-veil p-4 fade-in"
      onClick={onClose}
    >
      <div
        className="editorial-card w-full max-w-[1000px] max-h-[95vh] mx-0 md:mx-auto flex flex-col cinematic-rise"
        style={{ borderRadius: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header row ── */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 hairline-b flex-shrink-0">
          <div>
            <div className="eyebrow eyebrow-accent mb-1">
              {isEditing
                ? selectedCharacter ? 'A · 编辑' : 'A · 新建'
                : selectedCharacter ? 'A · 详情' : 'A · 角色管理'}
            </div>
            <h3 className="font-display text-[22px] leading-[1.1] font-light" style={{ color: 'var(--ink)' }}>
              {isEditing
                ? (selectedCharacter ? '编辑角色' : '新建角色')
                : (selectedCharacter ? selectedCharacter.name : '角色列表')}
            </h3>
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

        {/* ═══════════════════════════════════════════
            ROW 1 — Character list (horizontal cards)
           ═══════════════════════════════════════════ */}
        <div className="flex-shrink-0 hairline-b">
          {/* Toolbar: search + create button */}
          <div className="flex items-center gap-3 px-3 md:px-5 pt-4 pb-3">
            <div className="relative flex-1" style={{ border: '1px solid var(--hairline-strong)' }}>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                style={{ color: 'var(--muted-2)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索角色..."
                className="w-full text-[13px] pl-9 pr-3 py-2 bg-transparent focus:outline-none"
                style={{ color: 'var(--ink)' }}
              />
            </div>
            <span className="numeric-badge flex-shrink-0">{String(characters.length).padStart(2, '0')}</span>
            <button
              onClick={handleCreateNew}
              className="tactile flex items-center gap-2 px-4 py-2 text-[13px] press-shrink flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>新建角色</span>
            </button>
          </div>

          {/* Horizontal scrolling character cards */}
          <div className="overflow-x-auto px-3 md:px-5 pb-4">
            {filtered.length === 0 ? (
              <div className="text-center py-8 cinematic-fade">
                <p className="text-[13px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
                  {searchQuery ? '未找到匹配的角色' : '暂无角色 — 点击上方「新建角色」开始'}
                </p>
              </div>
            ) : (
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {filtered.map((character, idx) => {
                  const isActive = selectedCharacter?.id === character.id;
                  return (
                    <button
                      key={character.id}
                      onClick={() => handleSelectCharacter(character)}
                      className={`group relative flex-shrink-0 flex items-center gap-3 px-4 py-3 transition-quick cinematic-fade press-shrink hairline ${
                        isActive ? '' : 'hover:bg-[var(--paper-2)]'
                      }`}
                      style={{
                        animationDelay: `${idx * 25}ms`,
                        background: isActive ? 'var(--paper-2)' : 'transparent',
                        width: 220,
                        minWidth: 180,
                      }}
                    >
                      {isActive && (
                        <span
                          className="absolute top-0 left-0 right-0 h-[2px]"
                          style={{ background: 'var(--accent)' }}
                        />
                      )}
                      <span className="numeric-badge flex-shrink-0" style={{ color: isActive ? 'var(--accent)' : 'var(--muted-2)' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {character.avatar ? (
                        <img
                          src={character.avatar}
                          alt={character.name}
                          className="w-10 h-10 object-cover flex-shrink-0 hairline"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 flex items-center justify-center font-display text-[15px] font-medium flex-shrink-0"
                          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                        >
                          {character.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`text-[14px] truncate ${isActive ? 'font-medium' : ''}`} style={{ color: 'var(--ink)' }}>
                          {character.name}
                        </div>
                        <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--muted-2)' }}>
                          {character.description || '暂无描述'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            ROW 2 — Detail / Edit form
           ═══════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-3 md:p-5">
            {!selectedCharacter && !isEditing ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 cinematic-fade">
                <div
                  className="w-20 h-20 mb-6 flex items-center justify-center hairline"
                  style={{ color: 'var(--muted-2)' }}
                >
                  <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="font-display text-[18px] font-light italic mb-2" style={{ color: 'var(--ink)' }}>
                  The stage is empty
                </p>
                <p className="text-[12px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
                    从上方选择一个角色查看，或新建一位角色登场
                  </p>
              </div>
            ) : selectedCharacter && !isEditing ? (
              <div className="space-y-7 cinematic-rise">
                {/* Hero */}
                <div className="flex items-center gap-5 p-6 hairline relative">
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: 'var(--accent)' }}
                  />
                  {selectedCharacter.avatar ? (
                    <img
                      src={selectedCharacter.avatar}
                      alt={selectedCharacter.name}
                      className="w-20 h-20 object-cover hairline"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 flex items-center justify-center font-display text-[28px] font-light"
                      style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                    >
                      {selectedCharacter.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="eyebrow eyebrow-accent mb-1.5">B · 角色档案</div>
                    <h4 className="font-display text-[30px] leading-[1.05] font-light tracking-[-0.025em]">
                      <em className="italic font-extralight" style={{ color: 'var(--accent)' }}>{selectedCharacter.name}</em>
                    </h4>
                    <p className="text-[13px] mt-1.5 leading-[1.6]" style={{ color: 'var(--muted)' }}>
                      {selectedCharacter.description || '这个角色还没有简介'}
                    </p>
                  </div>
                </div>

                <FieldCard label="个性设定" en="PERSONALITY" num="01">
                  {selectedCharacter.personality || '暂无设定'}
                </FieldCard>

                <FieldCard label="开场白" en="OPENING" num="02" highlight>
                  {selectedCharacter.greeting || '暂无开场白'}
                </FieldCard>

                <FieldCard label="台词示例" en="EXAMPLES" num="03">
                  <pre className="whitespace-pre-wrap font-sans">
                    {selectedCharacter.examples || '暂无示例'}
                  </pre>
                </FieldCard>

                {/* 角色指令 - 最高优先级铁律 */}
                <FieldCard label="角色指令（铁律）" en="INSTRUCTIONS" num="04" highlight>
                  {selectedCharacter.instructions
                    ? <pre className="whitespace-pre-wrap font-sans">{selectedCharacter.instructions}</pre>
                    : '暂无指令 — 编辑角色后可添加，将作为 AI 必须遵守的硬性约束'}
                </FieldCard>

                {/* AI 自动生成的角色资料集 */}
                <FieldCard label="角色资料集（AI 生成）" en="LORE" num="05">
                  {selectedCharacter.lore
                    ? <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-[1.7]">{selectedCharacter.lore}</pre>
                    : '暂无资料 — 编辑角色后点击「AI 搜索资料」自动生成'}
                </FieldCard>

                <div className="flex gap-2 pt-2">
                  {onStartChat && (
                    <button
                      onClick={() => {
                        onStartChat(selectedCharacter.id);
                        onClose();
                      }}
                      className="tactile flex-1 flex items-center justify-center gap-2 press-shrink"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>开始对话</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="tactile-ghost flex-1 flex items-center justify-center gap-2 press-shrink"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>编辑</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 hairline text-[12px] tracking-wider uppercase hover:bg-[var(--paper-2)] transition-quick press-shrink"
                    style={{ color: 'var(--accent)', borderRadius: 4 }}
                    title="删除"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 cinematic-rise pb-1">
                {/* Row 1: Avatar + Name */}
                <div className="flex items-start gap-4 p-4 hairline">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="Avatar"
                      className="w-16 h-16 object-cover hairline flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--paper-2)', color: 'var(--muted-2)' }}
                    >
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-2">
                      <label className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                        角色姓名
                        <span className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
                      </label>
                      <span className="text-[10px] tracking-[0.2em] uppercase opacity-40">/ NAME</span>
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="给角色起个名字"
                      className="w-full px-3 py-2 text-[13px] bg-transparent hairline focus:outline-none"
                      style={{ color: 'var(--ink)', borderRadius: 3 }}
                    />
                    <div className="flex gap-2 mt-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <span className="px-3 py-1.5 text-[11px] tracking-wider uppercase hairline hover:bg-[var(--paper-2)] transition-quick inline-flex items-center gap-1.5" style={{ color: 'var(--ink)', borderRadius: 3 }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          上传
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAvatarUrl}
                        className="px-3 py-1.5 text-[11px] tracking-wider uppercase hairline hover:bg-[var(--paper-2)] transition-quick inline-flex items-center gap-1.5"
                        style={{ color: 'var(--ink)', borderRadius: 3 }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        URL
                      </button>
                      {formData.avatar && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar: '' })}
                          className="px-3 py-1.5 text-[11px] tracking-wider uppercase transition-quick"
                          style={{ color: 'var(--accent)' }}
                        >
                          清除
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Bio + Opening (2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <EditorialField
                    label="角色简介"
                    en="BIO"
                    textarea
                    rows={2}
                    value={formData.description}
                    onChange={(v) => setFormData({ ...formData, description: v })}
                    placeholder="简单描述角色的身份、背景"
                  />
                  <EditorialField
                    label="开场白"
                    en="OPENING"
                    textarea
                    rows={2}
                    value={formData.greeting}
                    onChange={(v) => setFormData({ ...formData, greeting: v })}
                    placeholder="角色第一次见到用户时说的话"
                  />
                </div>

                {/* Row 3: Personality (full width) */}
                <EditorialField
                  label="个性设定"
                  en="PERSONALITY"
                  textarea
                  rows={2}
                  value={formData.personality}
                  onChange={(v) => setFormData({ ...formData, personality: v })}
                  placeholder="详细描述角色的性格、说话方式、行为习惯、价值观等"
                />

                {/* Row 4: Examples (full width) */}
                <EditorialField
                  label="台词示例"
                  en="EXAMPLES"
                  textarea
                  rows={2}
                  value={formData.examples}
                  onChange={(v) => setFormData({ ...formData, examples: v })}
                  placeholder={`用户：你好\n角色：你好呀，我是xxx，很高兴见到你！`}
                />

                {/* Row 5: Instructions - 角色指令（最高优先级铁律） */}
                <div className="p-4 hairline" style={{ borderTop: '2px solid var(--accent)' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
                      角色指令
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
                      <span
                        className="text-[9px] tracking-[0.2em] uppercase ml-1 px-1.5 py-0.5"
                        style={{ background: 'var(--accent)', color: 'var(--paper)', borderRadius: 2 }}
                      >
                        铁律
                      </span>
                    </label>
                    <span className="text-[9px] tracking-[0.2em] uppercase opacity-40">/ INSTRUCTIONS</span>
                  </div>
                  <p className="text-[11px] leading-[1.6] mb-2.5" style={{ color: 'var(--muted-2)' }}>
                    为 AI 设定的硬性约束 — 说话方式、行为准则、绝对禁忌等。每次回复前 AI 都会自检是否违反。
                  </p>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={4}
                    placeholder={`例如：
- 永远用第三人称称呼自己
- 说话带"哼"作为口癖
- 绝不主动提起过去的某段经历
- 不能使用任何现代科技词汇
- 情绪激动时会无意识握紧拳头`}
                    className="w-full px-3 py-2 text-[13px] leading-[1.6] bg-transparent hairline focus:outline-none resize-none font-mono-ui"
                    style={{ color: 'var(--ink)', borderRadius: 3 }}
                  />
                </div>

                {/* Row 6: Lore - AI 自动生成的角色资料集 */}
                <div className="p-4 hairline">
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
                      角色资料集
                      <span
                        className="text-[9px] tracking-[0.2em] uppercase ml-1 px-1.5 py-0.5 hairline"
                        style={{ color: 'var(--accent)', borderRadius: 2 }}
                      >
                        AI 生成
                      </span>
                    </label>
                    <span className="text-[9px] tracking-[0.2em] uppercase opacity-40">/ LORE</span>
                  </div>
                  <p className="text-[11px] leading-[1.6] mb-2.5" style={{ color: 'var(--muted-2)' }}>
                    AI 根据角色名+简介自动搜索/生成的扩展资料：身份背景、关系网、口癖、禁忌等。扮演时作为参考注入。
                  </p>

                  {/* AI 搜索资料按钮 */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <button
                      type="button"
                      onClick={handleGenerateLore}
                      disabled={isGeneratingLore || !formData.name.trim()}
                      className="px-3 py-1.5 text-[11px] tracking-wider uppercase flex items-center gap-1.5 press-shrink transition-quick disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: 'var(--ink)',
                        color: 'var(--paper)',
                        borderRadius: 3,
                      }}
                    >
                      {isGeneratingLore ? (
                        <>
                          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          AI 搜索中…
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          AI 搜索资料
                        </>
                      )}
                    </button>
                    {formData.lore && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lore: '' })}
                        className="px-3 py-1.5 text-[11px] tracking-wider uppercase hairline hover:bg-[var(--paper-2)] transition-quick"
                        style={{ color: 'var(--accent)', borderRadius: 3 }}
                      >
                        清空
                      </button>
                    )}
                  </div>

                  {/* 错误提示 */}
                  {loreError && (
                    <div className="mb-2 px-3 py-1.5 text-[11px]" style={{ color: 'var(--accent)', background: 'var(--paper-2)' }}>
                      {loreError}
                    </div>
                  )}

                  {/* 资料集预览/编辑 */}
                  <textarea
                    value={formData.lore}
                    onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
                    rows={6}
                    placeholder="点击「AI 搜索资料」自动生成，或手动填写。生成后可二次编辑。"
                    className="w-full px-3 py-2 text-[12px] leading-[1.7] bg-transparent hairline focus:outline-none resize-none font-mono-ui"
                    style={{ color: 'var(--ink)', borderRadius: 3 }}
                  />
                  {formData.lore && (
                    <div className="mt-1.5 flex justify-end text-[10px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
                      <span className="numeric-badge">{String(formData.lore.length).padStart(4, '0')} 字</span>
                    </div>
                  )}
                </div>

                {/* Row 7: 角色默认背景 — 创建对话时自动应用 */}
                <div className="p-4 hairline" style={{ borderTop: '2px solid var(--accent)' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
                      角色默认背景
                      <span
                        className="text-[9px] tracking-[0.2em] uppercase ml-1 px-1.5 py-0.5"
                        style={{ background: 'var(--accent)', color: 'var(--paper)', borderRadius: 2 }}
                      >
                        自动应用
                      </span>
                    </label>
                    <span className="text-[9px] tracking-[0.2em] uppercase opacity-40">/ BACKDROP</span>
                  </div>
                  <p className="text-[11px] leading-[1.6] mb-3" style={{ color: 'var(--muted-2)' }}>
                    为角色设定默认视觉氛围 — 创建新对话时自动应用此背景。也可在对话中随时修改。
                  </p>

                  {/* 背景预览 */}
                  <div
                    className="w-full h-28 hairline overflow-hidden relative mb-3"
                    style={{
                      background: formData.background
                        ? (formData.background.startsWith('http') || formData.background.startsWith('data:')
                          ? `${formData.background.startsWith('http') || formData.background.startsWith('data:') ? `url(${formData.background})` : formData.background} center/cover no-repeat`
                          : formData.background)
                        : 'var(--paper-2)',
                    }}
                  >
                    <div className="absolute inset-0 grain" />
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: `rgba(244,241,234,${1 - formData.backgroundOpacity})` }}
                    >
                      {!formData.background && (
                        <span className="text-[11px] tracking-wider" style={{ color: 'var(--muted-2)' }}>
                          未设置背景
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 预设色板 */}
                  <div className="mb-3">
                    <div className="text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: 'var(--muted-2)' }}>
                      调色板
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {BG_PRESETS.map((p) => {
                        const isActive = formData.background === p.value;
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => setFormData({ ...formData, background: p.value })}
                            className={`group relative press-shrink hairline overflow-hidden ${isActive ? 'ring-2 ring-[var(--ink)] ring-offset-1 ring-offset-[var(--paper)]' : 'hover:scale-105'} transition-quick`}
                            title={p.name}
                            style={{ aspectRatio: '1', background: p.value }}
                          >
                            {isActive && (
                              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(244,241,234,0.7)' }}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} style={{ color: 'var(--ink)' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 上传 + URL + 清除 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => bgFileInputRef.current?.click()}
                      disabled={isUploadingBg}
                      className="px-3 py-2.5 text-[11px] tracking-wider uppercase hairline hover:bg-[var(--paper-2)] transition-quick flex items-center justify-center gap-1.5 press-shrink disabled:opacity-50"
                      style={{ color: 'var(--ink)', borderRadius: 3 }}
                    >
                      {isUploadingBg ? '压缩中…' : '上传图片'}
                    </button>
                    <button
                      type="button"
                      onClick={handleBgUrl}
                      className="px-3 py-2.5 text-[11px] tracking-wider uppercase hairline hover:bg-[var(--paper-2)] transition-quick flex items-center justify-center gap-1.5 press-shrink"
                      style={{ color: 'var(--ink)', borderRadius: 3 }}
                    >
                      图片 URL
                    </button>
                    {formData.background && (
                      <button
                        type="button"
                        onClick={handleBgClear}
                        className="px-3 py-2.5 text-[11px] tracking-wider uppercase hairline hover:bg-[var(--paper-2)] transition-quick flex items-center justify-center gap-1.5 press-shrink"
                        style={{ color: 'var(--accent)', borderRadius: 3 }}
                      >
                        清除
                      </button>
                    )}
                  </div>
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBgFile}
                    className="hidden"
                  />

                  {/* 透明度滑块 */}
                  {formData.background && (
                    <div>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--muted-2)' }}>
                          透明度
                        </span>
                        <span className="numeric-badge" style={{ color: 'var(--muted-2)' }}>
                          {String(Math.round(formData.backgroundOpacity * 100)).padStart(3, '0')}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={formData.backgroundOpacity}
                        onChange={(e) => setFormData({ ...formData, backgroundOpacity: parseFloat(e.target.value) })}
                        className="w-full"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sticky footer — save / cancel, always visible */}
          {isEditing && (
            <div
              className="px-5 py-3.5 hairline-b-0 flex items-center gap-3 flex-shrink-0"
              style={{
                borderTop: '1px solid var(--hairline-strong)',
                background: 'var(--paper)',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] tracking-[0.18em] uppercase truncate" style={{ color: 'var(--muted-2)' }}>
                  {selectedCharacter ? 'B · 编辑模式' : 'A · 新建角色'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedCharacter) {
                    setIsEditing(false);
                    setFormData({
                      name: selectedCharacter.name,
                      avatar: selectedCharacter.avatar,
                      description: selectedCharacter.description,
                      personality: selectedCharacter.personality,
                      greeting: selectedCharacter.greeting,
                      examples: selectedCharacter.examples,
                      instructions: selectedCharacter.instructions || '',
                      lore: selectedCharacter.lore || '',
                      background: selectedCharacter.background || '',
                      backgroundOpacity: selectedCharacter.backgroundOpacity !== undefined ? selectedCharacter.backgroundOpacity : 0.85,
                      backgroundFilter: selectedCharacter.backgroundFilter || '',
                      backgroundAnimation: selectedCharacter.backgroundAnimation || 'none',
                    });
                  } else {
                    onClose();
                  }
                }}
                className="px-5 py-2 text-[12px] tracking-wider uppercase hairline hover:bg-[var(--paper-2)] transition-quick"
                style={{ color: 'var(--ink)', borderRadius: 3 }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="px-5 py-2 text-[12px] tracking-wider uppercase flex items-center gap-2 transition-quick disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  borderRadius: 3,
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {selectedCharacter ? '保存修改' : '创建角色'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============== 子组件 — 编辑设计 ==============

const FieldCard: React.FC<{
  label: string;
  en: string;
  num: string;
  highlight?: boolean;
  children: React.ReactNode;
}> = ({ label, en, num, highlight, children }) => (
  <div className="p-5 hairline relative" style={highlight ? { borderTop: '2px solid var(--accent)' } : {}}>
    <div className="flex items-baseline justify-between mb-3">
      <div className="flex items-baseline gap-2">
        <span className="numeric-badge" style={{ color: 'var(--accent)' }}>{num}</span>
        <span className="eyebrow eyebrow-accent">{label}</span>
      </div>
      <span className="numeric-badge opacity-50">{en}</span>
    </div>
    <div className="text-[13.5px] leading-[1.8] whitespace-pre-wrap" style={{ color: 'var(--ink-2)' }}>
      {children}
    </div>
  </div>
);

const EditorialField: React.FC<{
  label: string;
  en: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
}> = ({ label, en, value, onChange, placeholder, required, textarea, rows = 2 }) => {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
          {label}
          {required && <span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />}
        </label>
        <span className="text-[9px] tracking-[0.2em] uppercase opacity-40">{en}</span>
      </div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-[13px] leading-[1.6] bg-transparent hairline focus:outline-none resize-none"
          style={{ color: 'var(--ink)', borderRadius: 3 }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-[13px] bg-transparent hairline focus:outline-none"
          style={{ color: 'var(--ink)', borderRadius: 3 }}
        />
      )}
    </div>
  );
};
