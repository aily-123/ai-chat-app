import { create } from 'zustand';
import type { Character, CreateCharacterParams, UpdateCharacterParams } from '../../shared/types';
import { backendApi } from '../api/backendApi';

interface CharacterState {
  // 角色列表
  characters: Character[];
  charactersLoaded: boolean;

  // 当前选中的角色
  activeCharacterId: string | null;

  // 操作方法
  loadCharacters: () => Promise<void>;
  createCharacter: (params?: Partial<CreateCharacterParams>) => Promise<Character>;
  deleteCharacter: (id: string) => Promise<void>;
  updateCharacter: (id: string, params: UpdateCharacterParams) => Promise<void>;
  selectCharacter: (id: string) => void;
}

// 获取API实例
const getApi = () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  return backendApi;
};

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  charactersLoaded: false,
  activeCharacterId: null,

  // ===== 角色操作 =====
  loadCharacters: async () => {
    try {
      const api = getApi();
      const list = await api.characters.list();
      set({ characters: list, charactersLoaded: true });
    } catch (err) {
      console.error('Failed to load characters:', err);
      set({ charactersLoaded: true });
    }
  },

  createCharacter: async (params = {}) => {
    const api = getApi();
    const character = await api.characters.create({
      name: params.name || '新角色',
      avatar: params.avatar || '',
      description: params.description || '',
      personality: params.personality || '',
      greeting: params.greeting || '',
      examples: params.examples || '',
      instructions: params.instructions || '',
      lore: params.lore || '',
      background: params.background || '',
      backgroundOpacity: params.backgroundOpacity ?? 0.85,
      backgroundFilter: params.backgroundFilter || '',
      backgroundAnimation: params.backgroundAnimation || 'none',
    });
    await get().loadCharacters();
    return character;
  },

  deleteCharacter: async (id: string) => {
    const api = getApi();
    await api.characters.delete(id);
    const { activeCharacterId } = get();

    // 如果删除的是当前角色，清空选中状态
    if (activeCharacterId === id) {
      set({ activeCharacterId: null });
    }

    await get().loadCharacters();
  },

  updateCharacter: async (id: string, params: UpdateCharacterParams) => {
    const api = getApi();
    await api.characters.update(id, params);
    await get().loadCharacters();
  },

  selectCharacter: (id: string) => {
    set({ activeCharacterId: id });
  },
}));
