'use client';

import { create } from 'zustand';
import { ContentSource, ContentPlatform, GeneratedContent } from '@/types/content';
import { generateContent } from '@/lib/content-generator';

interface DashboardStore {
  // Selected items for content studio
  selectedSources: ContentSource[];
  addSource: (source: ContentSource) => void;
  removeSource: (id: string) => void;
  clearSources: () => void;

  // Content generation
  activePlatform: ContentPlatform;
  setActivePlatform: (platform: ContentPlatform) => void;
  generatedContent: GeneratedContent | null;
  generateForPlatform: (companyCode?: string) => void;

  // UI state
  activePanel: 'news' | 'kap' | 'brokers';
  setActivePanel: (panel: 'news' | 'kap' | 'brokers') => void;

  // Filter state
  newsFilter: string;
  setNewsFilter: (filter: string) => void;
  kapFilter: string;
  setKapFilter: (filter: string) => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  selectedSources: [],
  addSource: (source) =>
    set((state) => ({
      selectedSources: state.selectedSources.some((s) => s.id === source.id)
        ? state.selectedSources
        : [...state.selectedSources, source],
    })),
  removeSource: (id) =>
    set((state) => ({
      selectedSources: state.selectedSources.filter((s) => s.id !== id),
    })),
  clearSources: () => set({ selectedSources: [], generatedContent: null }),

  activePlatform: 'INSTAGRAM_POST',
  setActivePlatform: (platform) => set({ activePlatform: platform }),
  generatedContent: null,
  generateForPlatform: (companyCode) => {
    const { selectedSources, activePlatform } = get();
    if (selectedSources.length === 0) return;
    const content = generateContent(activePlatform, selectedSources, companyCode);
    set({ generatedContent: content });
  },

  activePanel: 'news',
  setActivePanel: (panel) => set({ activePanel: panel }),

  newsFilter: '',
  setNewsFilter: (filter) => set({ newsFilter: filter }),
  kapFilter: '',
  setKapFilter: (filter) => set({ kapFilter: filter }),
}));
