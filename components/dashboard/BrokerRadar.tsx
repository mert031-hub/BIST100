'use client';

import { useEffect, useState } from 'react';
import { BrokerReport, BrokerRecommendation, BrokerReportType, REC_RANK } from '@/types/broker';
import { useDashboardStore } from '@/store/dashboard-store';
import type { SourceProbeResult } from '@/lib/broker-sources';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageLabel(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m <  1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
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

const REPORT_TYPE_LABELS: Record<BrokerReportType, string> = {
  HEDEF_FIYAT:     'HEDEF FİYAT',
  TAVSIYE_DEGISIM: 'TAVSİYE DEĞİŞİM',
  MODEL_PORTFOY:   'MODEL PORTFÖY',
  SEKTOR_RAPORU:   'SEKTÖR RAPORU',
  DIGER:           'DİĞER',
};

type FilterKey = 'ALL' | 'TP_UP' | 'TP_DOWN' | 'REC_UP' | 'REC_DOWN' | 'MODEL_PORTFOY';

const FILTERS: Array<{ key: FilterKey; label: string; color: string }> = [
  { key: 'ALL',          label: 'TÜMÜ',         color: 'var(--text-dim)' },
  { key: 'TP_UP',        label: 'TP ▲',          color: 'var(--green)'   },
  { key: 'TP_DOWN',      label: 'TP ▼',          color: 'var(--red)'     },
  { key: 'REC_UP',       label: 'TAVSİYE ▲',     color: 'var(--green)'   },
  { key: 'REC_DOWN',     label: 'TAVSİYE ▼',     color: 'var(--red)'     },
  { key: 'MODEL_PORTFOY',label: 'MODEL PORTFÖY',  color: 'var(--amber)'   },
];

function matchesFilter(r: BrokerReport, key: FilterKey): boolean {
  switch (key) {
    case 'ALL':          return true;
    case 'TP_UP':        return r.oldTargetPrice != null && r.newTargetPrice > r.oldTargetPrice;
    case 'TP_DOWN':      return r.oldTargetPrice != null && r.newTargetPrice < r.oldTargetPrice;
    case 'REC_UP':
      return r.previousRecommendation != null &&
        REC_RANK[r.recommendation] > REC_RANK[r.previousRecommendation];
    case 'REC_DOWN':
      return r.previousRecommendation != null &&
        REC_RANK[r.recommendation] < REC_RANK[r.previousRecommendation];
    case 'MODEL_PORTFOY': return r.reportType === 'MODEL_PORTFOY';
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BrokerRadar() {
  const [reports, setReports]         = useState<BrokerReport[]>([]);
  const [source, setSource]           = useState<'live' | 'mock'>('mock');
  const [sourceStatus, setSourceStatus] = useState<SourceProbeResult[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [showProbes, setShowProbes]   = useState(false);

  const { selectedSources, addSource, removeSource, setTopBrokerItems } = useDashboardStore();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/brokers');
        const d   = await res.json();
        const rpts = d.reports ?? [];
        setReports(rpts);
        setSource(d.source ?? 'mock');
        setSourceStatus(d.sourceStatus ?? []);
        setTopBrokerItems(rpts.slice(0, 20));
      } catch { /* keep previous */ }
      finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 300_000);
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
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 3,
            background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
          }}>DEMO</span>
        )}
        <span className="ph-right">{filtered.length} RAPOR</span>
      </div>

      {/* Source probe bar */}
      {sourceStatus.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}>
          <button
            onClick={() => setShowProbes((v) => !v)}
            style={{
              width: '100%', padding: '3px 8px', background: 'transparent',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace',
            }}
          >
            <span style={{ fontSize: 8, letterSpacing: 1, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              KAYNAK DURUMU
            </span>
            <span style={{ fontSize: 8, color: 'var(--text-faint)', marginLeft: 2 }}>
              {sourceStatus.filter((p) => p.status === 'reachable').length}/{sourceStatus.length} ERİŞİLEBİLİR
            </span>
            <div style={{ display: 'flex', gap: 3, marginLeft: 6 }}>
              {sourceStatus.map((p) => (
                <div key={p.id}
                  title={`${p.institution}: ${p.status}${p.error ? ` — ${p.error}` : ''}`}
                  style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background:
                      p.status === 'reachable' ? 'var(--green)'    :
                      p.status === 'blocked'   ? 'var(--amber-dim)':
                      p.status === 'skipped'   ? 'var(--border-3)' : 'var(--red-dim)',
                  }} />
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--text-faint)' }}>
              {showProbes ? '▲' : '▼'}
            </span>
          </button>

          {showProbes && (
            <div style={{ padding: '0 8px 5px' }}>
              {sourceStatus.map((p) => {
                const sc =
                  p.status === 'reachable' ? 'var(--green)'       :
                  p.status === 'blocked'   ? 'var(--amber)'        :
                  p.status === 'skipped'   ? 'var(--text-faint)'   : 'var(--red)';
                const sl =
                  p.status === 'reachable' ? 'OK'                  :
                  p.status === 'blocked'   ? `BLK ${p.httpStatus ?? ''}` :
                  p.status === 'timeout'   ? 'TMO'                 :
                  p.status === 'skipped'   ? 'SKIP' : 'ERR';
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '2px 0', borderBottom: '1px solid var(--border)', fontSize: 8 }}>
                    <span style={{ color: sc, fontWeight: 'bold', minWidth: 34, letterSpacing: 0.5 }}>{sl}</span>
                    <span style={{ color: 'var(--cream-dim)', flexShrink: 0, minWidth: 30 }}>{p.type}</span>
                    <span style={{ color: 'var(--text-dim)', flex: 1, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.institution}</span>
                    <span style={{ color: 'var(--text-faint)', flexShrink: 0 }}>{p.durationMs}ms</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filter chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, padding: '5px 8px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {FILTERS.map(({ key, label, color }) => {
          const active = activeFilter === key;
          return (
            <button key={key} onClick={() => setActiveFilter(key)} style={{
              fontSize: 8, letterSpacing: 0.5, padding: '2px 6px',
              background: active ? color : 'transparent',
              color: active ? 'var(--bg)' : color,
              border: `1px solid ${color}`,
              cursor: 'pointer', fontFamily: 'inherit',
              opacity: active ? 1 : 0.75,
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Report cards */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">YÜKLENİYOR...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">BU FİLTREDE RAPOR YOK</div>
        ) : filtered.map((r) => {
          const sel      = selectedSources.some((s) => s.id === r.id);
          const isSector = r.reportType === 'SEKTOR_RAPORU';
          const upside   = r.upside ?? 0;
          const priceChg = r.oldTargetPrice != null ? r.newTargetPrice - r.oldTargetPrice : 0;
          const tpUp     = priceChg > 0;
          const tpDown   = priceChg < 0;
          const recChanged = r.previousRecommendation != null;
          const recUp    = recChanged && REC_RANK[r.recommendation] > REC_RANK[r.previousRecommendation!];

          return (
            <div key={r.id} className={`card fi ${sel ? 'sel' : ''}`}
              style={{ borderLeft: '2px solid transparent',
                borderLeftColor: tpUp ? 'var(--green)' : tpDown ? 'var(--red)' : 'var(--border)' }}>
              {/* Upside bar at very top */}
              {upside !== 0 && (
                <div className="imp-bar">
                  <div className={`imp-bar-fill ${upside >= 0 ? 'imp-high' : 'imp-low'}`}
                    style={{ width: `${Math.min(Math.abs(upside), 50) / 50 * 100}%` }} />
                </div>
              )}

              <div style={{ padding: '10px 16px 10px' }}>
                {/* Row 1: institution (hero) · time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.institution}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>
                    {ageLabel(r.date)}
                  </span>
                </div>

                {/* Row 2: company code + report type + model portfolio badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                    {r.companyCode}
                  </span>
                  <span style={{ fontSize: 7, letterSpacing: 0.5, padding: '0 4px',
                    border: '1px solid var(--border-2)', color: 'var(--text-dim)', flexShrink: 0 }}>
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
                </div>

                {/* ── HERO: Target price change ── */}
                {!isSector && r.newTargetPrice > 0 && (
                  <div style={{
                    background: tpUp ? 'var(--green-dim)' : tpDown ? 'var(--red-dim)' : 'var(--bg-3)',
                    border: `1px solid ${tpUp ? '#86EFAC' : tpDown ? '#FECACA' : 'var(--border-2)'}`,
                    borderRadius: 6,
                    padding: '8px 12px', marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {r.oldTargetPrice != null ? (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)', textDecoration: 'line-through' }}>
                            {fmtPrice(r.oldTargetPrice)}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>→</span>
                          <span style={{
                            fontSize: 18, fontWeight: 'bold', lineHeight: 1,
                            color: tpUp ? 'var(--green)' : tpDown ? 'var(--red)' : 'var(--amber-bright)',
                          }}>
                            {fmtPrice(r.newTargetPrice)}
                            <span style={{ fontSize: 10, marginLeft: 3, fontWeight: 'normal' }}>TL</span>
                          </span>
                          {priceChg !== 0 && (
                            <span style={{
                              fontSize: 11, color: tpUp ? 'var(--green)' : 'var(--red)',
                              fontWeight: 'bold',
                            }}>
                              {tpUp ? '▲' : '▼'} {fmtPrice(Math.abs(priceChg))}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--amber-bright)', lineHeight: 1 }}>
                          TP {fmtPrice(r.newTargetPrice)}
                          <span style={{ fontSize: 10, marginLeft: 3, fontWeight: 'normal' }}>TL</span>
                        </span>
                      )}
                      {upside !== 0 && (
                        <span style={{
                          marginLeft: 'auto', fontSize: 12, fontWeight: 'bold',
                          color: upside > 0 ? 'var(--green)' : 'var(--red)',
                        }}>
                          {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendation (change or current) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  {recChanged ? (
                    <>
                      <RecTag rec={r.previousRecommendation!} />
                      <span style={{ fontSize: 10, color: recUp ? 'var(--green)' : 'var(--red)', fontWeight: 'bold' }}>
                        {recUp ? '▲' : '▼'}
                      </span>
                      <RecTag rec={r.recommendation} />
                    </>
                  ) : (
                    <RecTag rec={r.recommendation} />
                  )}
                </div>

                {/* Notes */}
                {r.notes && (
                  <div style={{
                    fontSize: 9, color: 'var(--text-dim)', marginBottom: 5,
                    lineHeight: 1.4, fontStyle: 'italic',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    &ldquo;{r.notes}&rdquo;
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="src-link" onClick={(e) => e.stopPropagation()}>
                    ↗ RAPOR
                  </a>

                  {r.contentReady && (
                    sel ? (
                      <button style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--amber)',
                        background: 'transparent', border: '1px solid var(--amber)',
                        padding: '1px 6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5 }}
                        onClick={() => removeSource(r.id)}>
                        ✓ STÜDYO&nbsp;✕
                      </button>
                    ) : (
                      <button style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--green)',
                        background: 'transparent', border: '1px solid var(--green)',
                        padding: '1px 6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5 }}
                        onClick={() => {
                          const title = `${r.institution} → ${r.companyCode}: ${r.recommendation}${r.newTargetPrice > 0 ? `, TP ${fmtPrice(r.newTargetPrice)} TL` : ''}`;
                          addSource({ type: 'BROKER_REPORT', id: r.id, title, date: r.date, url: r.sourceUrl });
                        }}>
                        + İÇERİĞE EKLE
                      </button>
                    )
                  )}
                </div>

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
