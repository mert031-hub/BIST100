'use client';

import { useEffect, useState } from 'react';
import { TcmbIndicator } from '@/types/tcmb';

const CAT_COLOR: Record<string, string> = {
  FAIZ:      'var(--amber-bright)',
  ENFLASYON: 'var(--red)',
  KUR:       'var(--cream)',
  REZERV:    'var(--green)',
  DISTICARET:'var(--amber)',
  ISTIHDAM:  'var(--text)',
  URETIM:    'var(--text)',
};

/* Indicators where "positive change" is actually bad */
const INVERSE = new Set(['current_account', 'unemployment', 'tufe', 'ufe']);

export default function TcmbPanel() {
  const [indicators, setIndicators] = useState<TcmbIndicator[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tcmb')
      .then((r) => r.json())
      .then((d) => { setIndicators(d.indicators ?? []); setSource(d.source); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="ph">
        <span className={`dot ${source === 'live' ? 'dot-live' : 'dot-mock'}`} />
        <span className="ph-title">TCMB · EVDS</span>
        <span className="ph-sub">MAKROEKONOMİ</span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">YÜKLENİYOR...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {indicators.map((ind) => {
              const ch = ind.change ?? 0;
              const isInverse = INVERSE.has(ind.key);
              const upGood = isInverse ? ch <= 0 : ch >= 0;
              const chColor = ch === 0
                ? 'var(--text-dim)'
                : upGood ? 'var(--green)' : 'var(--red)';

              return (
                <div key={ind.key} className="tcmb-cell">
                  <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 2 }}>
                    {ind.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontSize: 13, color: CAT_COLOR[ind.category] ?? 'var(--cream)', fontWeight: 'bold' }}>
                      {typeof ind.value === 'number'
                        ? ind.value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
                        : ind.value}
                    </span>
                    <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>{ind.unit}</span>
                  </div>
                  {ch !== 0 && (
                    <div style={{ fontSize: 8, color: chColor, marginTop: 1 }}>
                      {ch > 0 ? '▲' : '▼'} {Math.abs(ch).toFixed(2)}
                    </div>
                  )}
                  <div style={{ fontSize: 7, color: 'var(--text-faint)', marginTop: 1 }}>
                    {ind.date.length > 10 ? ind.date.slice(0, 10) : ind.date}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
