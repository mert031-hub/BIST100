'use client';

import { useEffect, useState } from 'react';
import { KapDisclosure } from '@/types/kap';
import { useDashboardStore } from '@/store/dashboard-store';

const CAT_LABELS: Record<string, string> = {
  OZEL_DURUM:     'ÖZEL DURUM',
  FINANSAL_TABLO: 'FİNANSAL',
  TEMETTU:        'TEMETTÜ',
  SERMAYE_ARTIRIMI:'SERMAYE',
  GERI_ALIM:      'GERİ ALIM',
  IHALE:          'İHALE/SÖZLEŞME',
  YK_KARARI:      'YK KARARI',
  BORCLANMA:      'BORÇLANMA',
  DIGER:          'DİĞER',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}dk`;
  if (m < 1440) return `${Math.floor(m / 60)}sa`;
  return `${Math.floor(m / 1440)}g`;
}

interface ImpBarProps { score: number }
function ImpBar({ score }: ImpBarProps) {
  const cls = score >= 80 ? 'imp-high' : score >= 55 ? 'imp-mid' : 'imp-low';
  return (
    <div className="imp-bar">
      <div className={`imp-bar-fill ${cls}`} style={{ width: `${score}%` }} />
    </div>
  );
}

interface ScoreProps { score: number }
function Score({ score }: ScoreProps) {
  const cls = score >= 80 ? 'score score-h' : score >= 55 ? 'score score-m' : 'score score-l';
  return <span className={cls}>{score}</span>;
}

export default function KapPanel() {
  const [disclosures, setDisclosures] = useState<KapDisclosure[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);
  const { selectedSources, addSource, removeSource, kapFilter, setKapFilter } = useDashboardStore();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/kap');
        const d = await res.json();
        setDisclosures(d.disclosures ?? []);
        setSource(d.source);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 120000);
    return () => clearInterval(iv);
  }, []);

  const filtered = kapFilter
    ? disclosures.filter((d) =>
        d.companyCode.toLowerCase().includes(kapFilter.toLowerCase()) ||
        d.title.toLowerCase().includes(kapFilter.toLowerCase()) ||
        d.category.toLowerCase().includes(kapFilter.toLowerCase())
      )
    : disclosures;

  return (
    <div className="panel">
      <div className="ph">
        <span className={`dot ${source === 'live' ? 'dot-live' : 'dot-mock'}`} />
        <span className="ph-title">KAP BİLDİRİMLERİ</span>
        <span className="ph-right">{filtered.length} KAYIT</span>
      </div>

      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          className="t-input"
          placeholder="filtre: şirket kodu, başlık, kategori..."
          value={kapFilter}
          onChange={(e) => setKapFilter(e.target.value)}
        />
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">YÜKLENİYOR...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">VERİ BULUNAMADI</div>
        ) : filtered.map((d) => {
          const sel = selectedSources.some((s) => s.id === d.id);
          return (
            <div
              key={d.id}
              className={`card fi ${sel ? 'sel' : ''}`}
              onClick={() => {
                if (sel) removeSource(d.id);
                else addSource({ type: 'KAP', id: d.id, title: d.title, date: d.date, url: d.sourceUrl });
              }}
            >
              <ImpBar score={d.importanceScore} />
              <div style={{ padding: '5px 8px 6px' }}>
                {/* Row 1: code + category + score + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ color: 'var(--amber-bright)', fontWeight: 'bold', fontSize: 11, minWidth: 42 }}>
                    {d.companyCode}
                  </span>
                  <span className="cat">{CAT_LABELS[d.category] ?? d.category}</span>
                  <Score score={d.importanceScore} />
                  <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--text-dim)' }}>
                    {timeAgo(d.date)}
                  </span>
                </div>

                {/* Title */}
                <div style={{ fontSize: 11, color: 'var(--cream)', lineHeight: 1.45, marginBottom: 5 }}>
                  {d.title}
                </div>

                {/* Row 3: date + source link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>
                    📅 {fmtDate(d.date)}
                  </span>
                  <a
                    href={d.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="src-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗ KAP
                  </a>
                  {sel && (
                    <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--amber)' }}>
                      ✓ STÜDYO
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
