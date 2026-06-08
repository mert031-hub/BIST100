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
  TCMB:       '#e8c86b',
  ENFLASYON:  '#b84444',
  FAIZ:       '#c8a84b',
  KUR:        '#88aacc',
  BORSA:      '#4aac44',
  SIRKET:     '#ccc0a0',
  JEOPOLITIK: '#c06060',
  ENERJI:     '#cc9040',
  SAVUNMA:    '#80a880',
  BANKACILIK: '#9898cc',
  GENEL:      '#5a5040',
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
        padding: '6px 8px',
        background: selected ? 'rgba(200,168,75,0.10)' : 'rgba(200,168,75,0.04)',
        border: `1px solid ${selected ? 'var(--amber)' : 'var(--amber-dim)'}`,
        cursor: 'pointer',
        flexShrink: 0,
        minWidth: 176,
        maxWidth: 230,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, var(--amber-dim), transparent)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <ScoreBadge score={item.importanceScore} />
        {item.relatedCompanies[0] && (
          <span style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 'bold' }}>
            ${item.relatedCompanies[0]}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--green)', fontWeight: 'bold' }}>
          {ageLabel(item.date)}
        </span>
      </div>
      <div style={{
        fontSize: 10, color: 'var(--cream)', lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.title}
      </div>
      <div style={{ fontSize: 8, color: 'var(--text-dim)', marginTop: 3 }}>{item.source}</div>
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

  const { selectedSources, addSource, removeSource, newsFilter, setNewsFilter, setCompanyCounts } =
    useDashboardStore();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/news');
        const d   = await res.json();
        setItems(d.items ?? []);
        setSource(d.source ?? 'mock');
        setOkCount(d.okCount ?? 0);
        setFeedStatus(d.feedStatus ?? []);
        setCompanyCounts(d.companyCounts ?? {});
      } catch { /* keep previous state */ }
      finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 180_000);
    return () => clearInterval(iv);
  }, [setCompanyCounts]);

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
    { key: 'ALL',     label: `TÜMÜ (${items.length})` },
    { key: 'HOT',     label: '▲ SICAK' },
    { key: 'COMPANY', label: 'ŞİRKET' },
    { key: 'ECONOMY', label: 'EKONOMİ' },
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
        <span className="ph-title">EKONOMİ HABERLERİ</span>
        {source === 'mock' && (
          <span style={{ fontSize: 8, color: 'var(--amber-dim)', letterSpacing: 1,
            background: 'rgba(200,168,75,0.08)', border: '1px solid var(--amber-dim)',
            padding: '0 4px' }}>DEMO VERİ</span>
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
            padding: '3px 8px',
            background: 'rgba(200,168,75,0.06)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--amber)', boxShadow: '0 0 5px var(--amber)',
              animation: 'pulse 2s infinite', flexShrink: 0,
            }} />
            <span style={{ fontSize: 8, letterSpacing: 2, color: 'var(--amber)', fontWeight: 'bold' }}>
              KRİTİK GELİŞMELER
            </span>
            <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>
              SON 1 SAAT · {critical.length} HABER
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '6px 8px', overflowX: 'auto' }}>
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
            marginLeft: 'auto', padding: '0 8px', height: 28,
            background: 'transparent', border: 'none',
            borderLeft: '1px solid var(--border)',
            color: only24h ? 'var(--amber)' : 'var(--text-faint)',
            cursor: 'pointer', fontFamily: 'monospace',
            fontSize: 8, letterSpacing: 1, whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {only24h ? '24S ✓' : 'TÜMÜ'}
        </button>
      </div>

      {/* Search + feed status */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
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
              <div style={{ padding: '5px 8px 6px', paddingLeft: isHigh ? 10 : 8 }}>

                {/* Row 1: score · category · companies · time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <ScoreBadge score={item.importanceScore} />
                  <span style={{
                    fontSize: 8, color: cc, letterSpacing: 0.5,
                    border: `1px solid ${cc}`, padding: '0 3px', opacity: 0.85, flexShrink: 0,
                  }}>
                    {item.category}
                  </span>
                  {item.relatedCompanies.length > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 'bold', letterSpacing: 0.5 }}>
                      {item.relatedCompanies.map((c) => `$${c}`).join(' ')}
                    </span>
                  )}
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, flexShrink: 0,
                    color: ageColor(item.date), fontWeight: isFresh(item.date) ? 'bold' : 'normal',
                  }}>
                    {ageLabel(item.date)}
                  </span>
                </div>

                {/* Title */}
                <div style={{
                  fontSize: isHigh ? 12 : 11,
                  color: isHigh ? 'var(--cream)' : 'var(--text)',
                  lineHeight: 1.4, marginBottom: 4,
                  fontWeight: isHigh ? 'bold' : 'normal',
                }}>
                  {item.title}
                </div>

                {/* Footer: source · link · studio */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>{item.source}</span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="src-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗ KAYNAK
                  </a>
                  {sel ? (
                    <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--amber)', letterSpacing: 0.5 }}>
                      ✓ STÜDYO ✕
                    </span>
                  ) : (
                    <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--text-faint)', letterSpacing: 0.5 }}>
                      + EKLE
                    </span>
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
