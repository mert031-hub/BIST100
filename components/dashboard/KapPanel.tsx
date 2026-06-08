'use client';

import { useEffect, useState } from 'react';
import { KapDisclosure, KapCategory } from '@/types/kap';
import { useDashboardStore } from '@/store/dashboard-store';

const CAT_LABELS: Record<KapCategory, string> = {
  FINANSAL_TABLO:   'FİNANSAL',
  YEN_IS_ILISKISI:  'YENİ İŞ',
  IHALE:            'İHALE',
  TEMETTU:          'TEMETTÜ',
  SERMAYE_ARTIRIMI: 'SERMAYE',
  GERI_ALIM:        'GERİ ALIM',
  BORCLANMA:        'BORÇLANMA',
  OZEL_DURUM:       'ÖZEL DURUM',
  YK_KARARI:        'YK KARARI',
  DIGER:            'DİĞER',
};

const CAT_COLORS: Record<KapCategory, string> = {
  FINANSAL_TABLO:   'var(--green)',
  YEN_IS_ILISKISI:  '#7ab8d4',
  IHALE:            'var(--amber-bright)',
  TEMETTU:          '#c080c0',
  SERMAYE_ARTIRIMI: '#80c080',
  GERI_ALIM:        '#a0c8a0',
  BORCLANMA:        '#b8a060',
  OZEL_DURUM:       'var(--amber)',
  YK_KARARI:        'var(--text-dim)',
  DIGER:            'var(--text-faint)',
};

// Filter chips shown in the panel — ordered by content relevance
const FILTER_CATS: Array<{ key: KapCategory | 'ALL'; label: string }> = [
  { key: 'ALL',             label: 'TÜMÜ' },
  { key: 'FINANSAL_TABLO',  label: 'FİNANSAL' },
  { key: 'YEN_IS_ILISKISI', label: 'YENİ İŞ' },
  { key: 'IHALE',           label: 'İHALE' },
  { key: 'TEMETTU',         label: 'TEMETTÜ' },
  { key: 'SERMAYE_ARTIRIMI',label: 'SERMAYE' },
  { key: 'GERI_ALIM',       label: 'GERİ ALIM' },
  { key: 'DIGER',           label: 'DİĞER' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60)   return `${m}dk`;
  if (m < 1440) return `${Math.floor(m / 60)}sa`;
  return `${Math.floor(m / 1440)}g`;
}

function ImpBar({ score }: { score: number }) {
  const cls = score >= 80 ? 'imp-high' : score >= 55 ? 'imp-mid' : 'imp-low';
  return <div className="imp-bar"><div className={`imp-bar-fill ${cls}`} style={{ width: `${score}%` }} /></div>;
}
function Score({ score }: { score: number }) {
  const cls = score >= 80 ? 'score score-h' : score >= 55 ? 'score score-m' : 'score score-l';
  return <span className={cls}>{score}</span>;
}

export default function KapPanel() {
  const [disclosures, setDisclosures] = useState<KapDisclosure[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState<KapCategory | 'ALL'>('ALL');

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

  const filtered = disclosures.filter((d) => {
    const matchesCat = catFilter === 'ALL' || d.category === catFilter;
    const matchesText = !kapFilter || (
      d.companyCode.toLowerCase().includes(kapFilter.toLowerCase()) ||
      d.title.toLowerCase().includes(kapFilter.toLowerCase()) ||
      d.summary.toLowerCase().includes(kapFilter.toLowerCase())
    );
    return matchesCat && matchesText;
  });

  return (
    <div className="panel">
      {/* Header */}
      <div className="ph">
        <span className={`dot ${source === 'live' ? 'dot-live' : 'dot-mock'}`} />
        <span className="ph-title">KAP BİLDİRİMLERİ</span>
        {source === 'mock' && (
          <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>DEMO VERİ</span>
        )}
        <span className="ph-right">{filtered.length} KAYIT</span>
      </div>

      {/* Category filter chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, padding: '5px 8px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {FILTER_CATS.map(({ key, label }) => {
          const active = catFilter === key;
          const color = key === 'ALL' ? 'var(--text-dim)' : CAT_COLORS[key as KapCategory];
          return (
            <button
              key={key}
              onClick={() => setCatFilter(key)}
              style={{
                fontSize: 8, letterSpacing: 0.5, padding: '2px 6px',
                background: active ? color : 'transparent',
                color: active ? 'var(--bg)' : color,
                border: `1px solid ${color}`,
                cursor: 'pointer', fontFamily: 'inherit',
                opacity: active ? 1 : 0.7,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Text filter */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          className="t-input"
          placeholder="filtre: şirket kodu, başlık, özet..."
          value={kapFilter}
          onChange={(e) => setKapFilter(e.target.value)}
        />
      </div>

      {/* Cards */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">YÜKLENİYOR...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">VERİ BULUNAMADI</div>
        ) : filtered.map((d) => {
          const sel = selectedSources.some((s) => s.id === d.id);
          const catColor = CAT_COLORS[d.category];
          return (
            <div key={d.id} className={`card fi ${sel ? 'sel' : ''}`}>
              <ImpBar score={d.importanceScore} />
              <div style={{ padding: '5px 8px 6px' }}>
                {/* Row 1: code + category badge + score + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ color: 'var(--amber-bright)', fontWeight: 'bold', fontSize: 11, minWidth: 42, flexShrink: 0 }}>
                    {d.companyCode}
                  </span>
                  <span style={{
                    fontSize: 8, color: catColor, letterSpacing: 0.5,
                    border: '1px solid', borderColor: catColor,
                    padding: '0 4px', opacity: 0.85, flexShrink: 0,
                  }}>
                    {CAT_LABELS[d.category]}
                  </span>
                  <Score score={d.importanceScore} />
                  <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {timeAgo(d.date)}
                  </span>
                </div>

                {/* Company name */}
                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 3, letterSpacing: 0.5 }}>
                  {d.companyName}
                </div>

                {/* Title */}
                <div style={{ fontSize: 11, color: 'var(--cream)', lineHeight: 1.45, marginBottom: 4 }}>
                  {d.title}
                </div>

                {/* Summary (truncated) */}
                {d.summary && (
                  <div style={{
                    fontSize: 9, color: 'var(--text-dim)', lineHeight: 1.4, marginBottom: 5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {d.summary}
                  </div>
                )}

                {/* Row: date + KAP link + İçeriğe Ekle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>
                    {fmtDate(d.date)}
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

                  {d.contentReady && (
                    sel ? (
                      <button
                        style={{
                          marginLeft: 'auto', fontSize: 8, color: 'var(--amber)',
                          background: 'transparent', border: '1px solid var(--amber)',
                          padding: '1px 6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5,
                        }}
                        onClick={() => removeSource(d.id)}
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
                        onClick={() => addSource({ type: 'KAP', id: d.id, title: d.title, date: d.date, url: d.sourceUrl })}
                      >
                        + İÇERİĞE EKLE
                      </button>
                    )
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
