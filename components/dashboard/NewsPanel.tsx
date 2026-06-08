'use client';

import { useEffect, useState } from 'react';
import { NewsItem, NewsCategory } from '@/types/news';
import { useDashboardStore } from '@/store/dashboard-store';

// ─── Date helpers (client-side, no server import needed) ─────────────────────

function ageLabel(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m <  1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function ageColor(iso: string): string {
  const m = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (m < 30)  return 'var(--green)';
  if (m < 120) return 'var(--amber)';
  return 'var(--text-dim)';
}

function isFresh(iso: string)    { return Date.now() - new Date(iso).getTime() < 60 * 60 * 1000; }
function isWithin24h(iso: string) { return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000; }

// ─── Category colours ─────────────────────────────────────────────────────────

const CAT_COLORS: Record<NewsCategory, string> = {
  TCMB:       '#D97706',
  ENFLASYON:  '#DC2626',
  FAIZ:       '#D97706',
  KUR:        '#2563EB',
  BORSA:      '#16A34A',
  SIRKET:     '#374151',
  JEOPOLITIK: '#DC2626',
  ENERJI:     '#D97706',
  SAVUNMA:    '#059669',
  BANKACILIK: '#7C3AED',
  GENEL:      '#9CA3AF',
};

// ─── Tab logic ────────────────────────────────────────────────────────────────

type TabKey = 'ALL' | 'HOT' | 'COMPANY' | 'ECONOMY' | 'TCMB';
const ECONOMY_CATS = new Set<NewsCategory>(['ENFLASYON', 'FAIZ', 'KUR', 'BORSA', 'BANKACILIK', 'ENERJI', 'JEOPOLITIK']);

function matchesTab(item: NewsItem, tab: TabKey): boolean {
  switch (tab) {
    case 'ALL':     return true;
    case 'HOT':     return item.importanceScore >= 70;
    case 'COMPANY': return item.category === 'SIRKET' || item.category === 'SAVUNMA';
    case 'ECONOMY': return ECONOMY_CATS.has(item.category);
    case 'TCMB':    return item.category === 'TCMB';
  }
}

// ─── Tiny sub-components ──────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? 'score score-h' : score >= 55 ? 'score score-m' : 'score score-l';
  return <span className={cls}>{score}</span>;
}

function ImpBar({ score }: { score: number }) {
  const cls = score >= 80 ? 'imp-high' : score >= 55 ? 'imp-mid' : 'imp-low';
  return <div className="imp-bar"><div className={`imp-bar-fill ${cls}`} style={{ width: `${score}%` }} /></div>;
}

// ─── Horizontal critical card ─────────────────────────────────────────────────

function CriticalCard({ item, selected, onToggle }: {
  item: NewsItem; selected: boolean; onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: '10px 12px',
        background: selected ? '#FEF3C7' : 'var(--bg-2)',
        border: `1px solid ${selected ? 'var(--amber)' : 'var(--border)'}`,
        borderRadius: 8,
        cursor: 'pointer',
        flexShrink: 0,
        minWidth: 200,
        maxWidth: 260,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'var(--amber)', borderRadius: '8px 8px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <ScoreBadge score={item.importanceScore} />
        {item.relatedCompanies[0] && (
          <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>
            {item.relatedCompanies[0]}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
          {ageLabel(item.date)}
        </span>
      </div>
      <div style={{
        fontSize: 13, color: 'var(--cream)', lineHeight: 1.4, fontWeight: 600,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        marginBottom: 4,
      }}>
        {item.title}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.source}</div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type DataSource = 'live' | 'partial' | 'mock';

export default function NewsPanel() {
  const [items, setItems]           = useState<NewsItem[]>([]);
  const [source, setSource]         = useState<DataSource>('mock');
  const [okCount, setOkCount]       = useState(0);
  const [feedStatus, setFeedStatus] = useState<{ source: string; status: 'ok' | 'error'; count: number }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<TabKey>('HOT');
  const [only24h, setOnly24h]       = useState(true);

  const {
    selectedSources, addSource, removeSource,
    newsFilter, setNewsFilter, setCompanyCounts, setTopNewsItems,
  } = useDashboardStore();

  useEffect(() => {
    async function load() {
      try {
        const res   = await fetch('/api/news');
        const d     = await res.json();
        const items: NewsItem[] = d.items ?? [];
        setItems(items);
        setSource(d.source ?? 'mock');
        setOkCount(d.okCount ?? 0);
        setFeedStatus(d.feedStatus ?? []);
        setCompanyCounts(d.companyCounts ?? {});
        // Share top items with OverviewPanel and ContentStudio
        setTopNewsItems(items.slice(0, 20));
      } catch { /* keep previous state */ }
      finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 180_000);
    return () => clearInterval(iv);
  }, [setCompanyCounts, setTopNewsItems]);

  // KRİTİK: high score + fresh (<60 min)
  const critical = items.filter((i) => i.importanceScore >= 80 && isFresh(i.date));

  const filtered = items.filter((item) => {
    if (!matchesTab(item, activeTab)) return false;
    if (only24h && !isWithin24h(item.date)) return false;
    if (newsFilter) {
      const q = newsFilter.toLowerCase();
      return item.title.toLowerCase().includes(q) ||
             item.category.toLowerCase().includes(q) ||
             item.source.toLowerCase().includes(q);
    }
    return true;
  });

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'ALL',     label: `Tümü (${items.length})` },
    { key: 'HOT',     label: '▲ Sıcak' },
    { key: 'COMPANY', label: 'Şirket' },
    { key: 'ECONOMY', label: 'Ekonomi' },
    { key: 'TCMB',    label: 'TCMB' },
  ];

  const dotStyle  = source === 'live' ? 'dot-live' : source === 'partial' ? '' : 'dot-mock';
  const partialSt = source === 'partial'
    ? { background: 'var(--amber)', boxShadow: '0 0 4px var(--amber)' } as React.CSSProperties
    : undefined;

  return (
    <div className="panel">
      {/* Header */}
      <div className="ph">
        <span className={`dot ${dotStyle}`} style={partialSt} />
        <span className="ph-title">Haber Akışı</span>
        {source === 'mock' && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 3,
            background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
          }}>DEMO</span>
        )}
        {source === 'partial' && (
          <span style={{ fontSize: 8, color: 'var(--amber)', letterSpacing: 1 }}>{okCount} KAYNAK</span>
        )}
        <span className="ph-right">{filtered.length} HABER</span>
      </div>

      {/* KRİTİK GELİŞMELER — last hour, score ≥ 80 */}
      {critical.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div style={{
            padding: '10px 16px 6px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-2)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--amber)',
              animation: 'pulse 2s infinite', flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>
              Kritik Gelişmeler
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Son 1 saat · {critical.length} haber
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, padding: '10px 16px 12px', overflowX: 'auto' }}>
            {critical.map((item) => {
              const sel = selectedSources.some((s) => s.id === item.id);
              return (
                <CriticalCard
                  key={item.id}
                  item={item}
                  selected={sel}
                  onToggle={() => sel
                    ? removeSource(item.id)
                    : addSource({ type: 'NEWS', id: item.id, title: item.title, date: item.date, url: item.sourceUrl })
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Category tabs + 24h toggle */}
      <div className="tab-bar" style={{ overflowX: 'auto' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setOnly24h((v) => !v)}
          title={only24h ? 'Son 24 saat — tümünü görmek için tıkla' : 'Tüm haberler — 24sa için tıkla'}
          style={{
            marginLeft: 'auto', padding: '0 12px', height: 40,
            background: 'transparent', border: 'none',
            borderLeft: '1px solid var(--border)',
            color: only24h ? 'var(--amber)' : 'var(--text-faint)',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {only24h ? '24S ✓' : 'TÜMÜ'}
        </button>
      </div>

      {/* Search + feed status */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          className="t-input"
          placeholder="filtre: başlık, kategori, kaynak..."
          value={newsFilter}
          onChange={(e) => setNewsFilter(e.target.value)}
        />
        {feedStatus.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 6px', marginTop: 3 }}>
            {feedStatus.map((f) => (
              <span key={f.source} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 7, color: f.status === 'ok' ? 'var(--green)' : 'var(--text-faint)',
              }}>
                <span style={{
                  width: 3, height: 3, borderRadius: '50%',
                  background: f.status === 'ok' ? 'var(--green)' : 'var(--text-faint)',
                  display: 'inline-block', flexShrink: 0,
                }} />
                {f.source}{f.status === 'ok' ? ` ${f.count}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* News list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 10, fontSize: 10 }} className="dim">YÜKLENİYOR...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 10, fontSize: 10, color: 'var(--text-faint)' }}>
            {only24h ? 'Son 24 saatte ilgili haber bulunamadı.' : 'Bu filtrede haber yok.'}
          </div>
        ) : filtered.map((item) => {
          const sel    = selectedSources.some((s) => s.id === item.id);
          const isHigh = item.importanceScore >= 80;
          const isLow  = item.importanceScore < 55;
          const cc     = CAT_COLORS[item.category];

          return (
            <div
              key={item.id}
              className={`card fi ${sel ? 'sel' : ''}`}
              style={{ opacity: isLow ? 0.6 : 1 }}
              onClick={() => {
                if (sel) removeSource(item.id);
                else addSource({ type: 'NEWS', id: item.id, title: item.title, date: item.date, url: item.sourceUrl });
              }}
            >
              <ImpBar score={item.importanceScore} />
              {/* High-importance accent strip */}
              {isHigh && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--amber)' }} />
              )}
              <div style={{ padding: '10px 16px 10px', paddingLeft: isHigh ? 18 : 16 }}>

                {/* Row 1: score · category · time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <ScoreBadge score={item.importanceScore} />
                  <span style={{
                    fontSize: 10, color: cc, fontWeight: 600,
                    background: `${cc}18`, border: `1px solid ${cc}40`,
                    borderRadius: 3, padding: '1px 6px', flexShrink: 0,
                  }}>
                    {item.category}
                  </span>
                  {item.relatedCompanies.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>
                      {item.relatedCompanies.slice(0, 2).join(' · ')}
                    </span>
                  )}
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, flexShrink: 0,
                    color: ageColor(item.date), fontWeight: isFresh(item.date) ? 700 : 500,
                  }}>
                    {ageLabel(item.date)}
                  </span>
                </div>

                {/* Title */}
                <div style={{
                  fontSize: isHigh ? 14 : 13,
                  color: 'var(--cream)',
                  lineHeight: 1.4, marginBottom: 6,
                  fontWeight: isHigh ? 700 : 500,
                }}>
                  {item.title}
                </div>

                {/* Footer: source · link · studio */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{item.source}</span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="src-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗ Kaynak
                  </a>
                  {sel ? (
                    <button
                      style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--amber)', fontWeight: 600,
                        background: '#FEF3C7', border: '1px solid var(--amber-dim)', borderRadius: 4,
                        padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                      onClick={(e) => { e.stopPropagation(); removeSource(item.id); }}
                    >
                      ✓ Stüdyo ✕
                    </button>
                  ) : (
                    <button
                      style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)', fontWeight: 600,
                        background: 'var(--green-dim)', border: '1px solid #86EFAC', borderRadius: 4,
                        padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                      onClick={(e) => { e.stopPropagation(); addSource({ type: 'NEWS', id: item.id, title: item.title, date: item.date, url: item.sourceUrl }); }}
                    >
                      + Ekle
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="disc-footer">BİLGİLENDİRME AMAÇLIDIR · YATIRIM TAVSİYESİ DEĞİLDİR</div>
      </div>
    </div>
  );
}
