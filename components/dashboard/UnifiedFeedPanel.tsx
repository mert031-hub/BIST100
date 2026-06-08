'use client';

import { useMemo, useState } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { buildUnifiedFeed } from '@/lib/unified-feed';
import type { UnifiedSignal } from '@/lib/unified-feed';

type FeedFilter = 'ALL' | 'KAP' | 'NEWS' | 'BROKER' | 'TCMB';

const FILTERS: Array<{ key: FeedFilter; label: string }> = [
  { key: 'ALL',    label: 'TÜMÜ'   },
  { key: 'KAP',    label: 'KAP'    },
  { key: 'NEWS',   label: 'HABER'  },
  { key: 'BROKER', label: 'KURUM'  },
  { key: 'TCMB',   label: 'TCMB'   },
];

const TYPE_STYLE: Record<UnifiedSignal['type'], { bg: string; color: string; border: string }> = {
  KAP:    { bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
  NEWS:   { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  BROKER: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  TCMB:   { bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
};

function ageLabel(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m <  1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export default function UnifiedFeedPanel() {
  const {
    topNewsItems, topKapItems, topBrokerItems, topTcmbIndicators,
    setSelectedCompany, addSource, selectedSources, removeSource,
  } = useDashboardStore();

  const [filter, setFilter] = useState<FeedFilter>('ALL');

  const feed = useMemo(
    () => buildUnifiedFeed(topNewsItems, topKapItems, topBrokerItems, topTcmbIndicators),
    [topNewsItems, topKapItems, topBrokerItems, topTcmbIndicators],
  );

  const filtered = filter === 'ALL' ? feed : feed.filter((s) => s.type === filter);

  const sourceCount = {
    ALL:    feed.length,
    KAP:    feed.filter((s) => s.type === 'KAP').length,
    NEWS:   feed.filter((s) => s.type === 'NEWS').length,
    BROKER: feed.filter((s) => s.type === 'BROKER').length,
    TCMB:   feed.filter((s) => s.type === 'TCMB').length,
  };

  return (
    <div className="panel">
      <div className="ph">
        <span className={`dot ${feed.length > 0 ? 'dot-live' : ''}`} />
        <span className="ph-title">TEK AKIŞ</span>
        <span className="ph-sub">KAP · HABERLER · KURUM · TCMB</span>
        <span className="ph-right">{filtered.length} sinyal</span>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 0, flexShrink: 0,
        borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
      }}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          const count  = sourceCount[key];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 12px', height: '100%',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${active ? 'var(--amber)' : 'transparent'}`,
                color: active ? 'var(--amber)' : 'var(--text-dim)',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 11, fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  fontSize: 9, padding: '0 4px', borderRadius: 8,
                  background: active ? 'var(--amber)' : 'var(--border-2)',
                  color: active ? 'var(--bg)' : 'var(--text-faint)',
                  lineHeight: '14px',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
            {feed.length === 0
              ? 'Veriler yükleniyor...'
              : 'Bu filtrede sinyal yok.'}
          </div>
        ) : filtered.map((sig) => {
          const ts  = TYPE_STYLE[sig.type];
          const sel = selectedSources.some((s) => s.id === sig.id);
          return (
            <div
              key={sig.id}
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}
            >
              {/* Score badge */}
              <div style={{
                minWidth: 34, height: 34, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-3)', border: '1px solid var(--border-2)',
                borderRadius: 4,
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: sig.effectiveScore >= 90 ? 'var(--red)' :
                         sig.effectiveScore >= 75 ? 'var(--amber)' : 'var(--text-dim)',
                }}>
                  {sig.effectiveScore}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Row 1: type · company · source · time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                    padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                    background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`,
                  }}>
                    {sig.type}
                  </span>
                  {sig.companyCode && (
                    <button
                      onClick={() => setSelectedCompany(sig.companyCode!)}
                      style={{
                        fontSize: 12, fontWeight: 700, flexShrink: 0, padding: 0,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: sig.isPriority ? 'var(--amber)' : 'var(--text-dim)',
                        fontFamily: 'inherit',
                      }}
                      title={`${sig.companyCode} detayını gör`}
                    >
                      {sig.companyCode}
                    </button>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sig.sourceLabel}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>
                    {ageLabel(sig.date)}
                  </span>
                </div>

                {/* Title */}
                <div style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--cream)', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  marginBottom: 4,
                }}>
                  {sig.title}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {sig.url && (
                    <a href={sig.url} target="_blank" rel="noopener noreferrer" className="src-link">
                      ↗ Kaynak
                    </a>
                  )}
                  {sig.type !== 'TCMB' && (
                    sel ? (
                      <button
                        onClick={() => removeSource(sig.id)}
                        style={{
                          marginLeft: 'auto', fontSize: 8, color: 'var(--amber)',
                          background: 'transparent', border: '1px solid var(--amber)',
                          padding: '1px 6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5,
                        }}
                      >
                        ✓ STÜDYO&nbsp;✕
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          addSource({ id: sig.id, type: sig.type === 'BROKER' ? 'BROKER_REPORT' : sig.type, title: sig.title, date: sig.date, url: sig.url })
                        }
                        style={{
                          marginLeft: 'auto', fontSize: 8, color: 'var(--green)',
                          background: 'transparent', border: '1px solid var(--green)',
                          padding: '1px 6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5,
                        }}
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

        <div className="disc-footer">
          BİLGİLENDİRME AMAÇLIDIR · YATIRIM TAVSİYESİ DEĞİLDİR
        </div>
      </div>
    </div>
  );
}
