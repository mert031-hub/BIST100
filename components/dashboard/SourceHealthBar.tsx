'use client';

import { useEffect, useState } from 'react';

interface SourceStatus {
  key: string;
  url: string;
  status: 'reachable' | 'blocked' | 'error';
}

interface HealthData {
  overall: 'live' | 'partial' | 'offline';
  reachable: number;
  total: number;
  sources: SourceStatus[];
  checkedAt: string;
}

const LABELS: Record<string, string> = {
  yahoo:   'YAHOO',
  bbc_rss: 'BBC',
  ntv_rss: 'NTV',
  kap_rss: 'KAP',
  evds:    'EVDS',
};

function StatusDot({ status }: { status: SourceStatus['status'] }) {
  const color =
    status === 'reachable' ? 'var(--green)' :
    status === 'blocked'   ? 'var(--amber)' :
    'var(--text-faint)';
  return (
    <span style={{
      display: 'inline-block',
      width: 5, height: 5,
      borderRadius: '50%',
      background: color,
      marginRight: 3,
      flexShrink: 0,
    }} />
  );
}

export default function SourceHealthBar() {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/health');
        setData(await res.json());
      } catch { /* silent */ }
    }
    load();
    const iv = setInterval(load, 120000);
    return () => clearInterval(iv);
  }, []);

  if (!data) return null;

  const overallColor =
    data.overall === 'live'    ? 'var(--green)' :
    data.overall === 'partial' ? 'var(--amber)' :
    'var(--text-faint)';

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '4px 8px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1, flexShrink: 0 }}>
          KAYNAK SAĞLIĞI
        </span>
        <span style={{ fontSize: 8, color: overallColor, letterSpacing: 1, flexShrink: 0 }}>
          {data.reachable}/{data.total}
        </span>
        {data.sources.map((s) => (
          <span key={s.key} style={{ display: 'flex', alignItems: 'center', fontSize: 8, color: 'var(--text-dim)' }}>
            <StatusDot status={s.status} />
            {LABELS[s.key] ?? s.key.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
