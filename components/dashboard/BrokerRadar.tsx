'use client';

import { useEffect, useState } from 'react';
import { BrokerReport, BrokerRecommendation } from '@/types/broker';
import { useDashboardStore } from '@/store/dashboard-store';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}dk`;
  if (m < 1440) return `${Math.floor(m / 60)}sa`;
  return `${Math.floor(m / 1440)}g`;
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
  return (
    <div className="imp-bar">
      <div className={`imp-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function BrokerRadar() {
  const [reports, setReports] = useState<BrokerReport[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);
  const { selectedSources, addSource, removeSource } = useDashboardStore();

  useEffect(() => {
    fetch('/api/brokers')
      .then((r) => r.json())
      .then((d) => { setReports(d.reports ?? []); setSource(d.source); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel">
      <div className="ph">
        <span className={`dot ${source === 'live' ? 'dot-live' : 'dot-mock'}`} />
        <span className="ph-title">ARACI KURUM RADARI</span>
        <span className="ph-right">{reports.length} RAPOR</span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">YÜKLENİYOR...</div>
        ) : reports.map((r) => {
          const sel = selectedSources.some((s) => s.id === r.id);
          const priceChg = r.oldTargetPrice ? r.newTargetPrice - r.oldTargetPrice : 0;
          const up = priceChg >= 0;
          const upside = r.upside ?? 0;

          return (
            <div
              key={r.id}
              className={`card fi ${sel ? 'sel' : ''}`}
              onClick={() => {
                const title = `${r.institution} → ${r.companyCode}: ${r.recommendation}, TP ${r.newTargetPrice} TL`;
                if (sel) removeSource(r.id);
                else addSource({ type: 'BROKER_REPORT', id: r.id, title, date: r.date, url: r.sourceUrl });
              }}
            >
              {/* Upside bar */}
              <UpsideBar upside={upside} />
              <div style={{ padding: '5px 8px 6px' }}>

                {/* Row 1: code + rec + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ color: 'var(--amber-bright)', fontWeight: 'bold', fontSize: 11, minWidth: 42 }}>
                    {r.companyCode}
                  </span>
                  <RecTag rec={r.recommendation} />
                  <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--text-dim)' }}>
                    {timeAgo(r.date)}
                  </span>
                </div>

                {/* Row 2: institution */}
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 5 }}>
                  {r.institution}
                  {r.analyst ? ` · ${r.analyst}` : ''}
                </div>

                {/* Row 3: prices */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  {r.oldTargetPrice && (
                    <span style={{ fontSize: 10, color: 'var(--text-faint)', textDecoration: 'line-through' }}>
                      {r.oldTargetPrice.toFixed(2)}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: 'var(--amber-bright)', fontWeight: 'bold' }}>
                    TP {r.newTargetPrice.toFixed(2)} TL
                  </span>
                  {priceChg !== 0 && (
                    <span className={up ? 'up' : 'down'} style={{ fontSize: 10 }}>
                      {up ? '▲' : '▼'} {Math.abs(priceChg).toFixed(2)}
                    </span>
                  )}
                  {upside > 0 && (
                    <span className="up" style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 'bold' }}>
                      +{upside.toFixed(1)}%↑
                    </span>
                  )}
                </div>

                {/* Notes */}
                {r.notes && (
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 5, fontStyle: 'italic' }}>
                    &ldquo;{r.notes}&rdquo;
                  </div>
                )}

                {/* Row 4: date + source link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>📅 {fmtDate(r.date)}</span>
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="src-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗ RAPOR
                  </a>
                  {sel && (
                    <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--amber)' }}>
                      ✓ STÜDYO
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 7, color: 'var(--text-faint)', marginTop: 5, letterSpacing: 1 }}>
                  ⚠ KAYNAK KURUM GÖRÜŞÜDÜR · YATIRIM TAVSİYESİ DEĞİLDİR
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
