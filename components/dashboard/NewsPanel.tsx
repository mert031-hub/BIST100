'use client';

import { useEffect, useState } from 'react';
import { NewsItem, NewsCategory } from '@/types/news';
import { useDashboardStore } from '@/store/dashboard-store';
import PanelHeader from '@/components/ui/PanelHeader';
import ScoreBadge from '@/components/ui/ScoreBadge';

const CAT_COLORS: Record<NewsCategory, string> = {
  TCMB: 'var(--terminal-amber-bright)',
  ENFLASYON: 'var(--terminal-red-bright)',
  FAIZ: 'var(--terminal-amber)',
  KUR: '#a0b8d0',
  BORSA: 'var(--terminal-green-bright)',
  SIRKET: 'var(--terminal-cream)',
  JEOPOLITIK: '#c06060',
  ENERJI: '#c09040',
  SAVUNMA: '#80a080',
  BANKACILIK: '#a0a0c0',
  GENEL: 'var(--terminal-text-dim)',
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 60) return `${diff}dk`;
  if (diff < 1440) return `${Math.floor(diff / 60)}sa`;
  return `${Math.floor(diff / 1440)}g`;
}

export default function NewsPanel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [loading, setLoading] = useState(true);
  const { selectedSources, addSource, removeSource, newsFilter, setNewsFilter } = useDashboardStore();

  async function fetchNews() {
    try {
      const res = await fetch('/api/news');
      const d = await res.json();
      setItems(d.items ?? []);
      setSource(d.source);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNews();
    const iv = setInterval(fetchNews, 180000);
    return () => clearInterval(iv);
  }, []);

  const filtered = newsFilter
    ? items.filter((i) =>
        i.title.toLowerCase().includes(newsFilter.toLowerCase()) ||
        i.category.toLowerCase().includes(newsFilter.toLowerCase())
      )
    : items;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title="EKONOMİ HABERLERİ" live={source === 'live'} />
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--terminal-border)' }}>
        <input
          className="terminal-input"
          placeholder="FİLTRE: başlık veya kategori..."
          value={newsFilter}
          onChange={(e) => setNewsFilter(e.target.value)}
        />
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 8, color: 'var(--terminal-text-dim)', fontSize: 11 }}>YÜKLENİYOR...</div>
        ) : filtered.map((item) => {
          const isSelected = selectedSources.some((s) => s.id === item.id);
          return (
            <div
              key={item.id}
              className={`list-item fade-in ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                if (isSelected) {
                  removeSource(item.id);
                } else {
                  addSource({ type: 'NEWS', id: item.id, title: item.title, date: item.date, url: item.sourceUrl });
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: CAT_COLORS[item.category], letterSpacing: 1, minWidth: 55 }}>
                  {item.category}
                </span>
                <ScoreBadge score={item.importanceScore} />
                {item.relatedCompanies.length > 0 && (
                  <span style={{ fontSize: 9, color: 'var(--terminal-amber)', letterSpacing: 1 }}>
                    ${item.relatedCompanies.join(' $')}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--terminal-text-dim)' }}>
                  {timeAgo(item.date)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--terminal-cream)', lineHeight: 1.4, marginBottom: 2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--terminal-text-dim)' }}>
                {item.source}
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
