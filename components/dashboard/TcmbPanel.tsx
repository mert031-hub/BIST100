'use client';

import { useEffect, useState } from 'react';
import { TcmbIndicator } from '@/types/tcmb';

const CAT_COLOR: Record<string, string> = {
  FAIZ:       '#D97706',
  ENFLASYON:  '#DC2626',
  KUR:        '#2563EB',
  REZERV:     '#16A34A',
  DISTICARET: '#D97706',
  ISTIHDAM:   '#374151',
  URETIM:     '#374151',
};

/* Indicators where "positive change" is actually bad (higher is worse) */
const INVERSE = new Set(['current_account', 'unemployment', 'tufe', 'ufe']);

/* Indicators updated monthly/infrequently — show date, not relative time */
const PERIODIC = new Set(['policy_rate', 'tufe', 'ufe', 'reserves', 'current_account', 'industrial_production', 'unemployment']);

function fmtDate(isoOrDate: string) {
  const d = isoOrDate.slice(0, 10);
  const [y, m] = d.split('-');
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${months[(parseInt(m) - 1) % 12]} ${y}`;
}

type DataSource = 'live' | 'partial' | 'mock';

export default function TcmbPanel() {
  const [indicators, setIndicators] = useState<TcmbIndicator[]>([]);
  const [source, setSource]         = useState<DataSource>('mock');
  const [liveCount, setLiveCount]   = useState(0);
  const [lastFetch, setLastFetch]   = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await (await fetch('/api/tcmb')).json();
        setIndicators(d.indicators ?? []);
        setSource(d.source ?? 'mock');
        setLiveCount(d.liveCount ?? 0);
        setLastFetch(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      } catch { /* keep previous */ }
      finally { setLoading(false); }
    };
    load();
    // TCMB data is monthly — refresh every 30 minutes is plenty
    const iv = setInterval(load, 30 * 60_000);
    return () => clearInterval(iv);
  }, []);

  const dotClass  = source === 'live' ? 'dot-live' : source === 'partial' ? '' : 'dot-mock';
  const partialSt = source === 'partial'
    ? { background: 'var(--amber)', boxShadow: '0 0 4px var(--amber)' } as React.CSSProperties
    : undefined;

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="ph">
        <span className={`dot ${dotClass}`} style={partialSt} />
        <span className="ph-title">TCMB · EVDS</span>
        <span className="ph-sub">MAKROEKONOMİ</span>
        {source === 'mock' && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 3,
            background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
            marginLeft: 4,
          }}>DEMO VERİ</span>
        )}
        {source === 'partial' && (
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
            background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A',
            marginLeft: 4,
          }}>{liveCount} CANLI</span>
        )}
        {source === 'live' && (
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
            background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC',
            marginLeft: 4,
          }}>CANLI</span>
        )}
        <span className="ph-right">{lastFetch ? `↻ ${lastFetch}` : ''}</span>
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

              // Individual live/mock indicator
              // A date equal to today's ISO date means it was live-fetched
              const today = new Date().toISOString().slice(0, 10);
              const indIsLive = source !== 'mock' && ind.date.slice(0, 10) === today;

              return (
                <div key={ind.key} className="tcmb-cell">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, flex: 1 }}>
                      {ind.label}
                    </span>
                    {!indIsLive && source !== 'live' && (
                      <span style={{ fontSize: 7, color: '#9CA3AF', fontStyle: 'italic' }}>demo</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontSize: 16, color: CAT_COLOR[ind.category] ?? 'var(--cream)', fontWeight: 700 }}>
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
                    {PERIODIC.has(ind.key)
                      ? fmtDate(ind.date)
                      : ind.date.slice(0, 10)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {source === 'mock' && (
          <div style={{
            margin: '8px 8px 0',
            padding: '6px 10px',
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 4,
            fontSize: 10, color: '#1D4ED8', lineHeight: 1.4,
          }}>
            ℹ EVDS_API_KEY ortam değişkeni tanımlı değil — demo veriler gösteriliyor.
            Canlı TCMB verisi için{' '}
            <a
              href="https://evds2.tcmb.gov.tr"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1D4ED8', fontWeight: 600 }}
            >
              EVDS kayıt
            </a>{' '}
            gereklidir.
          </div>
        )}
        <div className="disc-footer" style={{ marginTop: 4 }}>
          KAYNAK: TCMB EVDS · TÜİK · BİLGİLENDİRME AMAÇLIDIR
        </div>
      </div>
    </div>
  );
}
