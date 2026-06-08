'use client';

import { useEffect, useState } from 'react';

interface SourceStatus { key: string; url: string; status: 'reachable' | 'blocked' | 'error'; }
interface HealthData { overall: 'live' | 'partial' | 'offline'; reachable: number; total: number; sources: SourceStatus[]; checkedAt: string; }

const LABELS: Record<string, string> = {
  yahoo: 'Yahoo', bbc_rss: 'BBC', ntv_rss: 'NTV', kap_rss: 'KAP', evds: 'EVDS',
};

export default function SourceHealthBar() {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    const load = async () => {
      try { setData(await (await fetch('/api/health')).json()); } catch { /* silent */ }
    };
    load();
    const iv = setInterval(load, 120000);
    return () => clearInterval(iv);
  }, []);

  if (!data) return null;

  const overallColor =
    data.overall === 'live'    ? 'var(--green)' :
    data.overall === 'partial' ? 'var(--amber)' : 'var(--text-faint)';

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '6px 16px', flexShrink: 0, background: 'var(--bg-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, flexShrink: 0 }}>Kaynak Sağlığı</span>
        <span style={{ fontSize: 11, color: overallColor, fontWeight: 600, flexShrink: 0 }}>
          {data.reachable}/{data.total}
        </span>
        {data.sources.map((s) => (
          <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
              background: s.status === 'reachable' ? 'var(--green)' : s.status === 'blocked' ? 'var(--amber)' : 'var(--text-faint)',
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{LABELS[s.key] ?? s.key.toUpperCase()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
