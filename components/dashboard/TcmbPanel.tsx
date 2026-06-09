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

const INVERSE = new Set(['current_account', 'unemployment', 'tufe', 'ufe']);
const PERIODIC = new Set(['policy_rate', 'tufe', 'ufe', 'reserves', 'current_account', 'industrial_production', 'unemployment']);

function fmtDate(isoOrDate: string) {
  if (!isoOrDate || isoOrDate === '—') return '—';
  const d = isoOrDate.slice(0, 10);
  const [y, m] = d.split('-');
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${months[(parseInt(m) - 1) % 12]} ${y}`;
}

type DataSource = 'live' | 'partial' | 'none';

export default function TcmbPanel() {
  const [indicators, setIndicators] = useState<TcmbIndicator[]>([]);
  const [source, setSource]         = useState<DataSource>('none');
  const [liveCount, setLiveCount]   = useState(0);
  const [errorReason, setErrorReason] = useState<string | undefined>();
  const [lastFetch, setLastFetch]   = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await (await fetch('/api/tcmb')).json();
        setIndicators(d.indicators ?? []);
        setSource(d.source ?? 'none');
        setLiveCount(d.liveCount ?? 0);
        setErrorReason(d.errorReason);
        setLastFetch(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      } catch { /* keep previous */ }
      finally { setLoading(false); }
    };
    load();
    const iv = setInterval(load, 30 * 60_000);
    return () => clearInterval(iv);
  }, []);

  const dotStyle: React.CSSProperties =
    source === 'live'    ? {} :
    source === 'partial' ? { background: 'var(--amber)', boxShadow: '0 0 4px var(--amber)' } :
                           { background: 'var(--red)' };

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="ph">
        <span className="dot" style={dotStyle} />
        <span className="ph-title">TCMB · EVDS</span>
        <span className="ph-sub">MAKROEKONOMİ</span>
        {source === 'none' && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 3,
            background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA',
            marginLeft: 4,
          }}>KAYNAK YOK</span>
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
        ) : source === 'none' && indicators.length === 0 ? (
          <div style={{
            margin: 8, padding: '10px 12px',
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4,
            fontSize: 11, color: '#991B1B', lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>EVDS Bağlantısı Yok</div>
            <div>{errorReason ?? 'Veri kaynağına erişilemiyor'}</div>
            {errorReason?.includes('KEY') && (
              <div style={{ marginTop: 6, fontSize: 10, color: '#B91C1C' }}>
                Canlı veri için{' '}
                <a href="https://evds2.tcmb.gov.tr" target="_blank" rel="noopener noreferrer"
                  style={{ color: '#1D4ED8', fontWeight: 600 }}>EVDS</a>
                {' '}üzerinden API anahtarı alın ve EVDS_API_KEY değişkenini tanımlayın.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {indicators.map((ind) => {
              const ch = ind.change ?? 0;
              const isInverse = INVERSE.has(ind.key);
              const upGood = isInverse ? ch <= 0 : ch >= 0;
              const chColor = ch === 0
                ? 'var(--text-dim)'
                : upGood ? 'var(--green)' : 'var(--red)';

              if (!ind.isLive) {
                return (
                  <div key={ind.key} className="tcmb-cell" style={{ opacity: 0.6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>
                      {ind.label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 700 }}>—</div>
                    <div style={{ fontSize: 8, color: '#EF4444', marginTop: 2, fontWeight: 600 }}>
                      {ind.errorReason ?? 'VERİ YOK'}
                    </div>
                  </div>
                );
              }

              return (
                <div key={ind.key} className="tcmb-cell">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, flex: 1 }}>
                      {ind.label}
                    </span>
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
                    {PERIODIC.has(ind.key) ? fmtDate(ind.date) : ind.date.slice(0, 10)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="disc-footer" style={{ marginTop: 4 }}>
          KAYNAK: TCMB EVDS · TÜİK · BİLGİLENDİRME AMAÇLIDIR
        </div>
      </div>
    </div>
  );
}
