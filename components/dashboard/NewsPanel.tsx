'use client';

import { useEffect, useState } from 'react';
import { NewsItem, NewsCategory } from '@/types/news';
import { useDashboardStore } from '@/store/dashboard-store';

const CAT_COLORS: Record<NewsCategory, string> = {
  TCMB:       'var(--amber-bright)',
  ENFLASYON:  'var(--red)',
  FAIZ:       'var(--amber)',
  KUR:        '#88aacc',
  BORSA:      'var(--green)',
  SIRKET:     'var(--cream)',
  JEOPOLITIK: '#c06060',
  ENERJI:     '#cc9040',
  SAVUNMA:    '#80a880',
  BANKACILIK: '#9898cc',
  GENEL:      'var(--text-dim)',
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

function ImpBar({ score }: { score: number }) {
  const cls = score >= 80 ? 'imp-high' : score >= 55 ? 'imp-mid' : 'imp-low';
  return <div className="imp-bar"><div className={`imp-bar-fill ${cls}`} style={{ width: `${score}%` }} /></div>;
}
function Score({ score }: { score: number }) {
  const cls = score >= 80 ? 'score score-h' : score >= 55 ? 'score score-m' : 'score score-l';
  return <span className={cls}>{score}</span>;
}

type DataSource = 'live' | 'partial' | 'mock';

export default function NewsPanel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [source, setSource] = useState<DataSource>('mock');
  const [okCount, setOkCount] = useState(0);
  const [feedStatus, setFeedStatus] = useState<{ source: string; status: 'ok' | 'error'; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedSources, addSource, removeSource, newsFilter, setNewsFilter } = useDashboardStore();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/news');
        const d = await res.json();
        setItems(d.items ?? []);
        setSource(d.source ?? 'mock');
        setOkCount(d.okCount ?? 0);
        setFeedStatus(d.feedStatus ?? []);
      } catch { /* silent — keep previous state */ }
      finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 180000);
    return () => clearInterval(iv);
  }, []);

  const filtered = newsFilter
    ? items.filter((i) =>
        i.title.toLowerCase().includes(newsFilter.toLowerCase()) ||
        i.category.toLowerCase().includes(newsFilter.toLowerCase()) ||
        i.source.toLowerCase().includes(newsFilter.toLowerCase())
      )
    : items;

  return (
    <div className="panel">
      <div className="ph">
        <span className={`dot ${source === 'live' ? 'dot-live' : source === 'partial' ? '' : 'dot-mock'}`}
          style={source === 'partial' ? { background: 'var(--amber)', boxShadow: '0 0 4px var(--amber)' } : undefined}
        />
        <span className="ph-title">EKONOMİ HABERLERİ</span>
        {source === 'partial' && (
          <span style={{ fontSize: 8, color: 'var(--amber)', letterSpacing: 1 }}>{okCount} KAYNAK AKTİF</span>
        )}
        {source === 'mock' && (
          <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>DEMO VERİ</span>
        )}
        <span className="ph-right">{filtered.length} HABER</span>
      </div>

      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          className="t-input"
          placeholder="filtre: başlık, kategori, kaynak..."
          value={newsFilter}
          onChange={(e) => setNewsFilter(e.target.value)}
        />
        {feedStatus.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', marginTop: 4 }}>
            {feedStatus.map((f) => (
              <span key={f.source} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: f.status === 'ok' ? 'var(--green)' : 'var(--text-faint)' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: f.status === 'ok' ? 'var(--green)' : 'var(--text-faint)', display: 'inline-block', flexShrink: 0 }} />
                {f.source}{f.status === 'ok' ? ` (${f.count})` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, fontSize: 10 }} className="dim">YÜKLENİYOR...</div>
        ) : filtered.map((item) => {
          const sel = selectedSources.some((s) => s.id === item.id);
          return (
            <div
              key={item.id}
              className={`card fi ${sel ? 'sel' : ''}`}
              onClick={() => {
                if (sel) removeSource(item.id);
                else addSource({ type: 'NEWS', id: item.id, title: item.title, date: item.date, url: item.sourceUrl });
              }}
            >
              <ImpBar score={item.importanceScore} />
              <div style={{ padding: '5px 8px 6px' }}>
                {/* Row 1: category + score + companies + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 8, color: CAT_COLORS[item.category], letterSpacing: 1,
                    border: '1px solid', borderColor: CAT_COLORS[item.category],
                    padding: '0 4px', opacity: 0.85, flexShrink: 0,
                  }}>
                    {item.category}
                  </span>
                  <Score score={item.importanceScore} />
                  {item.relatedCompanies.length > 0 && (
                    <span style={{ fontSize: 8, color: 'var(--amber)', letterSpacing: 0.5 }}>
                      ${item.relatedCompanies.join(' $')}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--text-dim)' }}>
                    {timeAgo(item.date)}
                  </span>
                </div>

                {/* Title */}
                <div style={{ fontSize: 11, color: 'var(--cream)', lineHeight: 1.45, marginBottom: 5 }}>
                  {item.title}
                </div>

                {/* Row 3: source + date + link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>
                    {item.source}
                  </span>
                  <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>
                    {fmtDate(item.date)}
                  </span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="src-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗ KAYNAK
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
