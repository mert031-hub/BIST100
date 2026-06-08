'use client';

import { useEffect, useState } from 'react';
import { TcmbIndicator } from '@/types/tcmb';
import PanelHeader from '@/components/ui/PanelHeader';

function fmt(v: string | number) {
  if (typeof v === 'number') return v.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  return v;
}

const CAT_COLOR: Record<string, string> = {
  FAIZ: 'var(--terminal-amber-bright)',
  ENFLASYON: 'var(--terminal-red-bright)',
  KUR: 'var(--terminal-cream)',
  REZERV: 'var(--terminal-green-bright)',
  DISTICARET: 'var(--terminal-amber)',
  ISTIHDAM: 'var(--terminal-text)',
  URETIM: 'var(--terminal-text)',
};

export default function TcmbPanel() {
  const [indicators, setIndicators] = useState<TcmbIndicator[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tcmb')
      .then((r) => r.json())
      .then((d) => {
        setIndicators(d.indicators ?? []);
        setSource(d.source);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="TCMB / EVDS" subtitle="MAKROEKONOMİK" live={source === 'live'} />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, color: 'var(--terminal-text-dim)', fontSize: 11 }}>YÜKLENİYOR...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {indicators.map((ind) => {
              const isPositive = (ind.change ?? 0) >= 0;
              const changeColor = ind.key === 'current_account' || ind.key === 'unemployment'
                ? (isPositive ? 'var(--terminal-red-bright)' : 'var(--terminal-green-bright)')
                : (isPositive ? 'var(--terminal-green-bright)' : 'var(--terminal-red-bright)');

              return (
                <div key={ind.key} style={{
                  padding: '5px 8px',
                  borderBottom: '1px solid var(--terminal-border)',
                  borderRight: '1px solid var(--terminal-border)',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--terminal-text-dim)', letterSpacing: 1, marginBottom: 2 }}>
                    {ind.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 14, color: CAT_COLOR[ind.category] ?? 'var(--terminal-cream)', fontWeight: 'bold' }}>
                      {fmt(ind.value)}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--terminal-text-dim)' }}>{ind.unit}</span>
                  </div>
                  {ind.change !== undefined && ind.change !== 0 && (
                    <div style={{ fontSize: 9, color: changeColor, marginTop: 1 }}>
                      {ind.change > 0 ? '▲' : '▼'} {Math.abs(ind.change).toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
