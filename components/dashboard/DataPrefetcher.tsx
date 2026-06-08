'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';

/**
 * Renders nothing. On mount, silently pre-fetches /api/kap and /api/tcmb so
 * those tabs open instantly. Also populates store slices used by OverviewPanel,
 * UnifiedFeedPanel, and ContentStudio.
 */
export default function DataPrefetcher() {
  const {
    setKapPrefetchData, setKapCounts, setTopKapItems,
    setTopTcmbIndicators,
  } = useDashboardStore();

  useEffect(() => {
    const loadKap = async () => {
      try {
        const res = await fetch('/api/kap');
        const d   = await res.json();
        const disclosures = d.disclosures ?? [];

        setKapPrefetchData({ disclosures, source: d.source ?? 'mock' });

        const sorted = [...disclosures].sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0),
        );
        setTopKapItems(sorted.slice(0, 10));

        const counts: Record<string, number> = {};
        for (const disc of disclosures) {
          counts[disc.companyCode] = (counts[disc.companyCode] ?? 0) + 1;
        }
        setKapCounts(counts);
      } catch {
        // silent — KapPanel will fetch on its own if needed
      }
    };

    const loadTcmb = async () => {
      try {
        const res = await fetch('/api/tcmb');
        const d   = await res.json();
        const indicators = d.indicators ?? [];
        setTopTcmbIndicators(indicators);
      } catch {
        // silent — TcmbPanel will fetch on its own if needed
      }
    };

    loadKap();
    loadTcmb();
  }, [setKapPrefetchData, setKapCounts, setTopKapItems, setTopTcmbIndicators]);

  return null;
}
