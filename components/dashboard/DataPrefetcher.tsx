'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';

/**
 * Renders nothing. On mount, silently pre-fetches /api/kap so the KAP tab
 * opens instantly without a loading spinner. Also populates kapCounts for
 * the LeftPanel leaderboard before the user visits the KAP tab.
 */
export default function DataPrefetcher() {
  const { setKapPrefetchData, setKapCounts } = useDashboardStore();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/kap');
        const d   = await res.json();
        const disclosures = d.disclosures ?? [];

        setKapPrefetchData({ disclosures, source: d.source ?? 'mock' });

        // Build company → count map for LeftPanel leaderboard
        const counts: Record<string, number> = {};
        for (const disc of disclosures) {
          counts[disc.companyCode] = (counts[disc.companyCode] ?? 0) + 1;
        }
        setKapCounts(counts);
      } catch {
        // silent — KapPanel will fetch on its own if needed
      }
    };

    load();
  }, [setKapPrefetchData, setKapCounts]);

  return null;
}
