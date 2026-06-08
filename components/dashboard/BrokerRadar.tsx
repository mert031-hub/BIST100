'use client';

import { useEffect, useState } from 'react';
import { BrokerReport, BrokerRecommendation } from '@/types/broker';
import { useDashboardStore } from '@/store/dashboard-store';
import PanelHeader from '@/components/ui/PanelHeader';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 60) return `${diff}dk`;
  if (diff < 1440) return `${Math.floor(diff / 60)}sa`;
  return `${Math.floor(diff / 1440)}g`;
}

function RecTag({ rec }: { rec: BrokerRecommendation }) {
  const cls = rec === 'AL' || rec === 'ENDEKS_USTU' ? 'tag-al' : rec === 'SAT' || rec === 'ENDEKS_ALTI' ? 'tag-sat' : 'tag-tut';
  return <span className={cls}>{rec.replace('_', ' ')}</span>;
}

export default function BrokerRadar() {
  const [reports, setReports] = useState<BrokerReport[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);
  const { selectedSources, addSource, removeSource } = useDashboardStore();

  useEffect(() => {
    fetch('/api/brokers')
      .then((r) => r.json())
      .then((d) => { setReports(d.reports ?? []); setSource(d.source); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title="ARACI KURUM RADARI" live={source === 'live'} />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, color: 'var(--terminal-text-dim)', fontSize: 11 }}>YÜKLENİYOR...</div>
        ) : reports.map((r) => {
          const isSelected = selectedSources.some((s) => s.id === r.id);
          const priceChange = r.oldTargetPrice ? r.newTargetPrice - r.oldTargetPrice : 0;
          const isUp = priceChange >= 0;
          return (
            <div
              key={r.id}
              className={`list-item fade-in ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                const title = `${r.institution}: ${r.companyCode} hedef fiyat ${r.newTargetPrice} TL (${r.recommendation})`;
                if (isSelected) removeSource(r.id);
                else addSource({ type: 'BROKER_REPORT', id: r.id, title, date: r.date, url: r.sourceUrl });
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ color: 'var(--terminal-amber-bright)', fontSize: 11, fontWeight: 'bold', minWidth: 44 }}>
                  {r.companyCode}
                </span>
                <RecTag rec={r.recommendation} />
                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--terminal-text-dim)' }}>
                  {timeAgo(r.date)}
                </span>
              </div>

              <div style={{ fontSize: 10, color: 'var(--terminal-cream-dim)', marginBottom: 3 }}>
                {r.institution}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                {r.oldTargetPrice && (
                  <span style={{ color: 'var(--terminal-text-dim)', textDecoration: 'line-through' }}>
                    {r.oldTargetPrice.toFixed(2)}
                  </span>
                )}
                <span style={{ color: 'var(--terminal-amber-bright)', fontWeight: 'bold' }}>
                  TP: {r.newTargetPrice.toFixed(2)} TL
                </span>
                {priceChange !== 0 && (
                  <span className={isUp ? 'text-up' : 'text-down'} style={{ fontSize: 10 }}>
                    {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}
                  </span>
                )}
                {r.upside !== undefined && r.upside > 0 && (
                  <span style={{ fontSize: 9, color: 'var(--terminal-green-bright)', marginLeft: 'auto' }}>
                    +{r.upside.toFixed(1)}% potansiyel
                  </span>
                )}
              </div>

              {r.notes && (
                <div style={{ fontSize: 9, color: 'var(--terminal-text-dim)', marginTop: 3, fontStyle: 'italic' }}>
                  {r.notes}
                </div>
              )}

              <div style={{ fontSize: 8, color: 'var(--terminal-text-dim)', marginTop: 4, letterSpacing: 1 }}>
                ⚠ KAYNAK KURUM GÖRÜŞÜDÜR · YATIRIM TAVSİYESİ DEĞİLDİR
              </div>

              {isSelected && (
                <div style={{ fontSize: 9, color: 'var(--terminal-amber)', marginTop: 2 }}>
                  ✓ STÜDYO'YA EKLENDİ
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
