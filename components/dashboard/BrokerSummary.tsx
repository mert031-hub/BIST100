'use client';

import { useEffect, useState } from 'react';
import { BrokerReport } from '@/types/broker';
import { useDashboardStore } from '@/store/dashboard-store';

function ageLabel(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m <  1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function fmtPrice(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function BrokerSummary() {
  const [reports, setReports] = useState<BrokerReport[]>([]);
  const [source, setSource]   = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);
  const { setActiveView }     = useDashboardStore();

  useEffect(() => {
    fetch('/api/brokers')
      .then((r) => r.json())
      .then((d) => { setReports(d.reports ?? []); setSource(d.source ?? 'mock'); })
      .catch(() => {})
      .finally(() => setLoading(false));
    const iv = setInterval(async () => {
      const r = await fetch('/api/brokers').catch(() => null);
      if (r) { const d = await r.json(); setReports(d.reports ?? []); }
    }, 300_000);
    return () => clearInterval(iv);
  }, []);

  const tpChanges = reports
    .filter((r) => r.oldTargetPrice != null && r.newTargetPrice !== r.oldTargetPrice)
    .slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-2)' }}>
      {/* Header */}
      <div style={{
        padding: '0 16px', height: 40, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: source === 'live' ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--cream)', textTransform: 'uppercase', letterSpacing: 0.2 }}>
          Kurum Radarı
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 2 }}>Hedef Fiyat Değişimleri</span>
        {source === 'mock' && (
          <span style={{
            fontSize: 10, padding: '1px 7px', borderRadius: 3, fontWeight: 600,
            background: '#FEF3C7', color: 'var(--amber)',
            border: '1px solid var(--amber-dim)',
          }}>DEMO</span>
        )}
        <button
          onClick={() => setActiveView('brokers')}
          style={{
            marginLeft: 'auto', fontSize: 11, color: 'var(--amber)',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 600, padding: 0, whiteSpace: 'nowrap',
          }}
        >
          Tümünü Gör →
        </button>
      </div>

      {/* Report list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--text-faint)' }}>Yükleniyor...</div>
        ) : tpChanges.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--text-faint)' }}>Hedef fiyat değişimi bulunamadı.</div>
        ) : tpChanges.map((r) => {
          const up      = r.newTargetPrice > (r.oldTargetPrice ?? 0);
          const priceChg = r.newTargetPrice - (r.oldTargetPrice ?? 0);
          const upside   = r.upside ?? 0;

          return (
            <div key={r.id} style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              {/* Left bar accent */}
              <div style={{
                width: 3, alignSelf: 'stretch', flexShrink: 0, borderRadius: 2,
                background: up ? 'var(--green)' : 'var(--red)',
              }} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.institution}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>
                    {ageLabel(r.date)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream)' }}>
                    {r.companyCode}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                    {fmtPrice(r.oldTargetPrice ?? 0)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>→</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: up ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPrice(r.newTargetPrice)}
                    <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2 }}>TL</span>
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 13, fontWeight: 700,
                    color: up ? 'var(--green)' : 'var(--red)',
                  }}>
                    {up ? '+' : ''}{priceChg > 0 ? '+' : ''}{upside.toFixed(1) !== '0.0' ? `${upside > 0 ? '+' : ''}${upside.toFixed(1)}%` : `${up ? '+' : ''}${((priceChg / (r.oldTargetPrice ?? 1)) * 100).toFixed(1)}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '6px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-faint)', background: 'var(--bg-3)' }}>
        Kaynak kurum görüşüdür · Yatırım tavsiyesi değildir
      </div>
    </div>
  );
}
