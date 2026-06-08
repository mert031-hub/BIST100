'use client';

import { useEffect, useState } from 'react';
import { KapDisclosure } from '@/types/kap';
import { useDashboardStore } from '@/store/dashboard-store';
import PanelHeader from '@/components/ui/PanelHeader';
import ScoreBadge from '@/components/ui/ScoreBadge';

const CAT_LABELS: Record<string, string> = {
  OZEL_DURUM: 'ÖZEL',
  FINANSAL_TABLO: 'FİNANSAL',
  TEMETTU: 'TEMETTÜ',
  SERMAYE_ARTIRIMI: 'SERMAYE',
  GERI_ALIM: 'GERİ ALIM',
  IHALE: 'İHALE',
  YK_KARARI: 'YK',
  BORCLANMA: 'BORÇ',
  DIGER: 'DİĞER',
};

function timeAgo(isoDate: string) {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (diff < 60) return `${diff}dk`;
  if (diff < 1440) return `${Math.floor(diff / 60)}sa`;
  return `${Math.floor(diff / 1440)}g`;
}

export default function KapPanel() {
  const [disclosures, setDisclosures] = useState<KapDisclosure[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);
  const { selectedSources, addSource, removeSource, kapFilter, setKapFilter } = useDashboardStore();

  async function fetchKap() {
    try {
      const res = await fetch('/api/kap');
      const d = await res.json();
      setDisclosures(d.disclosures ?? []);
      setSource(d.source);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKap();
    const iv = setInterval(fetchKap, 120000);
    return () => clearInterval(iv);
  }, []);

  const filtered = kapFilter
    ? disclosures.filter((d) =>
        d.companyCode.toLowerCase().includes(kapFilter.toLowerCase()) ||
        d.title.toLowerCase().includes(kapFilter.toLowerCase())
      )
    : disclosures;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title="KAP BİLDİRİMLERİ" live={source === 'live'} />
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--terminal-border)' }}>
        <input
          className="terminal-input"
          placeholder="FİLTRE: şirket veya başlık..."
          value={kapFilter}
          onChange={(e) => setKapFilter(e.target.value)}
        />
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, color: 'var(--terminal-text-dim)', fontSize: 11 }}>YÜKLENİYOR...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 8, color: 'var(--terminal-text-dim)', fontSize: 11 }}>VERİ BULUNAMADI</div>
        ) : filtered.map((d) => {
          const isSelected = selectedSources.some((s) => s.id === d.id);
          return (
            <div
              key={d.id}
              className={`list-item fade-in ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                if (isSelected) {
                  removeSource(d.id);
                } else {
                  addSource({ type: 'KAP', id: d.id, title: d.title, date: d.date, url: d.sourceUrl });
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ color: 'var(--terminal-amber-bright)', fontSize: 11, fontWeight: 'bold', minWidth: 40 }}>
                  {d.companyCode}
                </span>
                <span className="cat-badge">{CAT_LABELS[d.category] ?? d.category}</span>
                <ScoreBadge score={d.importanceScore} />
                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--terminal-text-dim)' }}>
                  {timeAgo(d.date)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--terminal-cream)', lineHeight: 1.4 }}>
                {d.title}
              </div>
              {isSelected && (
                <div style={{ fontSize: 9, color: 'var(--terminal-amber)', marginTop: 3 }}>
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
