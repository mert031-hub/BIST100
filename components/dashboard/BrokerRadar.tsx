'use client';

import { useEffect, useState } from 'react';
import { BrokerReport, BrokerRecommendation, BrokerReportType, REC_RANK } from '@/types/broker';
import { useDashboardStore } from '@/store/dashboard-store';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60)   return `${m}dk`;
  if (m < 1440) return `${Math.floor(m / 60)}sa`;
  return `${Math.floor(m / 1440)}g`;
}
function fmtPrice(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function RecTag({ rec }: { rec: BrokerRecommendation }) {
  const cls =
    rec === 'AL' || rec === 'ENDEKS_USTU'  ? 'tag-al' :
    rec === 'SAT' || rec === 'ENDEKS_ALTI' ? 'tag-sat' : 'tag-tut';
  return <span className={cls}>{rec.replace('_', ' ')}</span>;
}

function UpsideBar({ upside }: { upside: number }) {
  const pct = Math.min(Math.abs(upside), 50) / 50 * 100;
  const cls = upside >= 0 ? 'imp-high' : 'imp-low';
  return <div className="imp-bar"><div className={`imp-bar-fill ${cls}`} style={{ width: `${pct}%` }} /></div>;
}

const REPORT_TYPE_LABELS: Record<BrokerReportType, string> = {
  HEDEF_FIYAT:    'HEDEF FİYAT',
  TAVSIYE_DEGISIM:'TAVSİYE DEĞİŞİM',
  MODEL_PORTFOY:  'MODEL PORTFÖY',
  SEKTOR_RAPORU:  'SEKTÖR RAPORU',
  DIGER:          'DİĞER',
};

type FilterKey = 'ALL' | 'TP_UP' | 'TP_DOWN' | 'REC_UP' | 'REC_DOWN' | 'MODEL_PORTFOY';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL',          label: 'TÜMÜ' },
  { key: 'TP_UP',        label: 'TP ▲' },
  { key: 'TP_DOWN',      label: 'TP ▼' },
  { key: 'REC_UP',       label: 'TAVSİYE ▲' },
  { key: 'REC_DOWN',     label: 'TAVSİYE ▼' },
  { key: 'MODEL_PORTFOY',label: 'MODEL PORTFÖY' },
];

function matchesFilter(r: BrokerReport, key: FilterKey): boolean {
  switch (key) {
    case 'ALL': return true;
    case 'TP_UP':   return r.oldTargetPrice != null && r.newTargetPrice > r.oldTargetPrice;
    case 'TP_DOWN': return r.oldTargetPrice != null && r.newTargetPrice < r.oldTargetPrice;
    case 'REC_UP':
      return r.previousRecommendation != null &&
        REC_RANK[r.recommendation] > REC_RANK[r.previousRecommendation];
    case 'REC_DOWN':
      return r.previousRecommendation != null &&
        REC_RANK[r.recommendation] < REC_RANK[r.previousRecommendation];
    case 'MODEL_PORTFOY': return r.reportType === 'MODEL_PORTFOY';
  }
}

export default function BrokerRadar() {
  const [reports, setReports] = useState<BrokerReport[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const { selectedSources, addSource, removeSource } = useDashboardStore();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/brokers');
        const d = await res.json();
        setReports(d.reports ?? []);
        setSource(d.source ?? 'mock');
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 300000);
    return () => clearInterval(iv);
  }, []);

  const filtered = reports.filter((r) => matchesFilter(r, activeFilter));

  return (
    <div className="panel">
      {/* Header */}
      <div className="ph">
        <span className={`dot ${source === 'live' ? 'dot-live' : 'dot-mock'}`} />
        <span className="ph-title">ARACI KURUM RADARI</span>
        {source === 'mock' && (
          <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>DEMO VERİ</span>
        )}
        <span className="ph-right">{filtered.length} RAPOR</span>
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, padding: '5px 8px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {FILTERS.map(({ key, label }) => {
          const active = activeFilter === key;
          const color =
            key === 'TP_UP' || key === 'REC_UP'                  ? 'var(--green)' :
            key === 'TP_DOWN' || key === 'REC_DOWN'               ? 'var(--red)'   :
            key === 'MODEL_PORTFOY'                               ? 'var(--amber)' :
            'var(--text-dim)';
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              style={{
                fontSize: 8, letterSpacing: 0.5, padding: '2px 6px',
                background: active ? color : 'transparent',
                color: active ? 'var(--bg)' : color,
                border: `1px solid ${color}`,
                cursor: 'pointer', fontFamily: 'inherit',
                opacity: active ? 1 : 0.75,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">YÜKLENİYOR...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">BU FİLTREDE RAPOR YOK</div>
        ) : filtered.map((r) => {
          const sel = selectedSources.some((s) => s.id === r.id);
          const priceChg = r.oldTargetPrice ? r.newTargetPrice - r.oldTargetPrice : 0;
          const upside = r.upside ?? 0;
          const isSector = r.reportType === 'SEKTOR_RAPORU';

          const recChanged = r.previousRecommendation != null;
          const recUp = recChanged && REC_RANK[r.recommendation] > REC_RANK[r.previousRecommendation!];
          const recDown = recChanged && REC_RANK[r.recommendation] < REC_RANK[r.previousRecommendation!];

          return (
            <div key={r.id} className={`card fi ${sel ? 'sel' : ''}`}>
              <UpsideBar upside={upside} />
              <div style={{ padding: '5px 8px 6px' }}>

                {/* Row 1: code + report-type badge + rec + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ color: 'var(--amber-bright)', fontWeight: 'bold', fontSize: 11, minWidth: 52, flexShrink: 0 }}>
                    {r.companyCode}
                  </span>
                  <span style={{
                    fontSize: 7, letterSpacing: 0.5, padding: '0 4px',
                    border: '1px solid var(--border-2)', color: 'var(--text-dim)',
                    flexShrink: 0,
                  }}>
                    {REPORT_TYPE_LABELS[r.reportType]}
                  </span>
                  {r.modelPortfolioAction && (
                    <span style={{
                      fontSize: 7, padding: '0 4px', letterSpacing: 0.5, flexShrink: 0,
                      background: r.modelPortfolioAction === 'EKLENDI' ? 'var(--green)' : 'var(--red)',
                      color: 'var(--bg)',
                    }}>
                      {r.modelPortfolioAction === 'EKLENDI' ? '+ PORTFÖY' : '– PORTFÖY'}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {timeAgo(r.date)}
                  </span>
                </div>

                {/* Row 2: institution + analyst */}
                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 4 }}>
                  {r.institution}{r.analyst ? ` · ${r.analyst}` : ''}
                </div>

                {/* Row 3: recommendation change or current rec */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {recChanged ? (
                    <>
                      <RecTag rec={r.previousRecommendation!} />
                      <span style={{ fontSize: 9, color: recUp ? 'var(--green)' : 'var(--red)' }}>
                        {recUp ? '▶' : '▼'}
                      </span>
                      <RecTag rec={r.recommendation} />
                    </>
                  ) : (
                    <RecTag rec={r.recommendation} />
                  )}
                </div>

                {/* Row 4: target prices (skip for sector reports) */}
                {!isSector && r.newTargetPrice > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {r.oldTargetPrice != null && (
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', textDecoration: 'line-through' }}>
                        {fmtPrice(r.oldTargetPrice)}
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--amber-bright)', fontWeight: 'bold' }}>
                      TP {fmtPrice(r.newTargetPrice)} TL
                    </span>
                    {priceChg !== 0 && (
                      <span className={priceChg > 0 ? 'up' : 'down'} style={{ fontSize: 10 }}>
                        {priceChg > 0 ? '▲' : '▼'} {fmtPrice(Math.abs(priceChg))}
                      </span>
                    )}
                    {upside !== 0 && (
                      <span
                        className={upside > 0 ? 'up' : 'down'}
                        style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 'bold' }}
                      >
                        {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}

                {/* Notes */}
                {r.notes && (
                  <div style={{
                    fontSize: 9, color: 'var(--text-dim)', marginBottom: 5,
                    lineHeight: 1.4, fontStyle: 'italic',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    &ldquo;{r.notes}&rdquo;
                  </div>
                )}

                {/* Footer row: date + source link + content button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>{fmtDate(r.date)}</span>
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="src-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗ RAPOR
                  </a>

                  {r.contentReady && (
                    sel ? (
                      <button
                        style={{
                          marginLeft: 'auto', fontSize: 8, color: 'var(--amber)',
                          background: 'transparent', border: '1px solid var(--amber)',
                          padding: '1px 6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5,
                        }}
                        onClick={() => removeSource(r.id)}
                      >
                        ✓ STÜDYO&nbsp;✕
                      </button>
                    ) : (
                      <button
                        style={{
                          marginLeft: 'auto', fontSize: 8, color: 'var(--green)',
                          background: 'transparent', border: '1px solid var(--green)',
                          padding: '1px 6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5,
                        }}
                        onClick={() => {
                          const title = `${r.institution} → ${r.companyCode}: ${r.recommendation}${r.newTargetPrice > 0 ? `, TP ${fmtPrice(r.newTargetPrice)} TL` : ''}`;
                          addSource({ type: 'BROKER_REPORT', id: r.id, title, date: r.date, url: r.sourceUrl });
                        }}
                      >
                        + İÇERİĞE EKLE
                      </button>
                    )
                  )}
                </div>

                {/* Mandatory disclaimer */}
                <div style={{ fontSize: 7, color: 'var(--text-faint)', marginTop: 5, letterSpacing: 0.5 }}>
                  ⚠ Kaynak kurum görüşüdür. Yatırım tavsiyesi değildir.
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
