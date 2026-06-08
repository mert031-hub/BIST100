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
  FINANSAL_TABLO:   '#16A34A',
  YEN_IS_ILISKISI:  '#2563EB',
  IHALE:            '#D97706',
  TEMETTU:          '#7C3AED',
  SERMAYE_ARTIRIMI: '#059669',
  GERI_ALIM:        '#16A34A',
  BORCLANMA:        '#D97706',
  OZEL_DURUM:       '#D97706',
  YK_KARARI:        '#6B7280',
  DIGER:            '#9CA3AF',
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
  const {
    selectedSources, addSource, removeSource,
    kapFilter, setKapFilter, setKapCounts,
    kapPrefetchData, setKapPrefetchData,
  } = useDashboardStore();

  // Initialise from prefetch if available — no loading spinner needed
  const [disclosures, setDisclosures] = useState<KapDisclosure[]>(kapPrefetchData?.disclosures ?? []);
  const [source, setSource]           = useState<string>(kapPrefetchData?.source ?? 'mock');
  const [loading, setLoading]         = useState(!kapPrefetchData);
  const [lastFetch, setLastFetch]     = useState('');
  const [catFilter, setCatFilter]     = useState<KapCategory | 'ALL'>('ALL');

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch('/api/kap');
        const d    = await res.json();
        const discs: KapDisclosure[] = d.disclosures ?? [];
        setDisclosures(discs);
        setSource(d.source ?? 'mock');
        setLastFetch(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        // Update store so other panels (LeftPanel leaderboard) see fresh counts
        setKapPrefetchData({ disclosures: discs, source: d.source ?? 'mock' });
        const counts: Record<string, number> = {};
        for (const disc of discs) { counts[disc.companyCode] = (counts[disc.companyCode] ?? 0) + 1; }
        setKapCounts(counts);
      } catch { /* keep previous state */ }
      finally { setLoading(false); }
    }
    // Skip initial fetch if prefetch data is already loaded
    if (!kapPrefetchData) {
      load();
    } else {
      setLoading(false);
    }
    // Always set up polling for refresh
    const iv = setInterval(load, 120_000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <span className={`dot ${source === 'live-rss' || source === 'live-json' ? 'dot-live' : 'dot-mock'}`} />
        <span className="ph-title">KAP BİLDİRİMLERİ</span>
        {source === 'mock' && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 3,
            background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
          }}>DEMO VERİ</span>
        )}
        {(source === 'live-rss' || source === 'live-json') && (
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
            background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC',
          }}>CANLI</span>
        )}
        <span className="ph-right">
          {lastFetch ? `↻ ${lastFetch} · ` : ''}{filtered.length} KAYIT
        </span>
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
              <div style={{ padding: '10px 16px 10px' }}>
                {/* Row 1: code + category badge + score + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 14, minWidth: 52, flexShrink: 0 }}>
                    {d.companyCode}
                  </span>
                  <span style={{
                    fontSize: 10, color: catColor, fontWeight: 600,
                    background: `${catColor}18`, border: `1px solid ${catColor}40`,
                    borderRadius: 3, padding: '1px 6px', flexShrink: 0,
                  }}>
                    {CAT_LABELS[d.category]}
                  </span>
                  <Score score={d.importanceScore} />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {timeAgo(d.date)}
                  </span>
                </div>

                {/* Company name */}
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, fontWeight: 500 }}>
                  {d.companyName}
                </div>

                {/* Title */}
                <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.45, marginBottom: 5, fontWeight: 600 }}>
                  {d.title}
                </div>

                {/* Summary (truncated) */}
                {d.summary && (
                  <div style={{
                    fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4, marginBottom: 6,
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
