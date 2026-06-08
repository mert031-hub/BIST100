'use client';

import { create } from 'zustand';
import { ContentSource, ContentPlatform, GeneratedContent } from '@/types/content';
import { generateContent } from '@/lib/content-generator';
import type { KapDisclosure } from '@/types/kap';

export type ActiveView = 'news' | 'kap' | 'brokers' | 'tcmb';

interface DashboardStore {
  selectedSources: ContentSource[];
  addSource: (source: ContentSource) => void;
  removeSource: (id: string) => void;
  clearSources: () => void;

  activePlatform: ContentPlatform;
  setActivePlatform: (platform: ContentPlatform) => void;
  generatedContent: GeneratedContent | null;
  generateForPlatform: () => void;

  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  /** @deprecated use activeView */
  activePanel: 'news' | 'kap' | 'brokers';
  setActivePanel: (panel: 'news' | 'kap' | 'brokers') => void;

  newsFilter: string;
  setNewsFilter: (filter: string) => void;
  kapFilter: string;
  setKapFilter: (filter: string) => void;

  companyCounts: Record<string, number>;
  setCompanyCounts: (counts: Record<string, number>) => void;

  kapCounts: Record<string, number>;
  setKapCounts: (counts: Record<string, number>) => void;

  /** KAP data pre-fetched on page load — so KAP tab opens instantly */
  kapPrefetchData: { disclosures: KapDisclosure[]; source: string } | null;
  setKapPrefetchData: (data: { disclosures: KapDisclosure[]; source: string }) => void;
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
    set((state) => ({ selectedSources: state.selectedSources.filter((s) => s.id !== id) })),
  clearSources: () => set({ selectedSources: [], generatedContent: null }),

  activePlatform: 'INSTAGRAM_POST',
  setActivePlatform: (platform) => set({ activePlatform: platform }),
  generatedContent: null,
  generateForPlatform: () => {
    const { selectedSources, activePlatform } = get();
    if (selectedSources.length === 0) return;
    set({ generatedContent: generateContent(activePlatform, selectedSources) });
  },

  activeView: 'news',
  setActiveView: (view) => set({ activeView: view }),

  activePanel: 'news',
  setActivePanel: (panel) => set({ activePanel: panel }),

  newsFilter: '',
  setNewsFilter: (filter) => set({ newsFilter: filter }),
  kapFilter: '',
  setKapFilter: (filter) => set({ kapFilter: filter }),

  companyCounts: {},
  setCompanyCounts: (counts) => set({ companyCounts: counts }),

  kapCounts: {},
  setKapCounts: (counts) => set({ kapCounts: counts }),

  kapPrefetchData: null,
  setKapPrefetchData: (data) => set({ kapPrefetchData: data }),
}));
