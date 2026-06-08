'use client';

import { useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { buildUnifiedFeed } from '@/lib/unified-feed';
import type { UnifiedSignal } from '@/lib/unified-feed';
import { PRIORITY_COMPANIES } from '@/data/companies';

function ageLabel(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m <  1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)}g`;
}

const TYPE_STYLE: Record<UnifiedSignal['type'], { bg: string; color: string; border: string }> = {
  KAP:    { bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
  NEWS:   { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  BROKER: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  TCMB:   { bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
};

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function OverviewPanel() {
  const { topNewsItems, topKapItems, topBrokerItems, topTcmbIndicators } = useDashboardStore();

  const top5 = useMemo(
    () => buildUnifiedFeed(topNewsItems, topKapItems, topBrokerItems, topTcmbIndicators).slice(0, 5),
    [topNewsItems, topKapItems, topBrokerItems, topTcmbIndicators],
  );

  // Weighted company scores for leaderboard
  const companyRanking = useMemo(() => {
    const scores: Record<string, number> = {};

    for (const item of topNewsItems) {
      for (const code of item.relatedCompanies) {
        scores[code] = (scores[code] ?? 0) + item.importanceScore / 10;
      }
    }
    for (const disc of topKapItems) {
      scores[disc.companyCode] = (scores[disc.companyCode] ?? 0) + 4;
    }
    for (const b of topBrokerItems) {
      if (b.companyCode) {
        scores[b.companyCode] = (scores[b.companyCode] ?? 0) + 3;
      }
    }

    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [topNewsItems, topKapItems, topBrokerItems]);

  const isEmpty = top5.length === 0;

  return (
    <div className="panel">
      {/* ─── GÜNÜN EN ÖNEMLİ 5 GELİŞMESİ ──────────────────────────── */}
      <div className="ph">
        <span className="dot dot-live" style={{ animation: isEmpty ? 'none' : undefined }} />
        <span className="ph-title">GÜNÜN EN ÖNEMLİ 5 GELİŞMESİ</span>
        <span className="ph-sub">KAP · HABERLER · KURUM · TCMB</span>
        <span className="ph-right">{top5.length} / 5</span>
      </div>

      <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {isEmpty ? (
          <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
            Veriler yüklendikçe en önemli 5 sinyal burada görünecek.
          </div>
        ) : top5.map((sig, i) => {
          const ts = TYPE_STYLE[sig.type];
          return (
            <div
              key={sig.id}
              style={{
                padding: '10px 16px',
                borderBottom: i < top5.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: i === 0 ? 'var(--bg-3)' : 'var(--bg-2)',
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: i === 0 ? 'var(--amber)' : 'var(--text-faint)',
                minWidth: 16, textAlign: 'right', flexShrink: 0, marginTop: 1,
              }}>
                {i + 1}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                    padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                    background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`,
                  }}>
                    {sig.type}
                  </span>
                  {sig.companyCode && (
                    <span style={{
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                      color: sig.isPriority ? 'var(--amber)' : 'var(--text-dim)',
                    }}>
                      {sig.companyCode}
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                    color: sig.effectiveScore >= 90 ? 'var(--red)' :
                           sig.effectiveScore >= 75 ? 'var(--amber)' : 'var(--text-dim)',
                  }}>
                    {sig.effectiveScore}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>
                    {ageLabel(sig.date)}
                  </span>
                </div>

                <div style={{
                  fontSize: i === 0 ? 14 : 13,
                  fontWeight: i === 0 ? 700 : 500,
                  color: 'var(--cream)',
                  lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  marginBottom: 2,
                }}>
                  {sig.title}
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 2 }}>
                  {sig.sourceLabel}
                </div>

                {sig.url && (
                  <a href={sig.url} target="_blank" rel="noopener noreferrer" className="src-link">
                    ↗ Kaynak
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── ÖN PLANA ÇIKAN HİSSELER ──────────────────────────────── */}
      <div className="ph" style={{ marginTop: 0 }}>
        <span className="ph-title">ÖN PLANA ÇIKAN HİSSELER</span>
        <span className="ph-sub">Haber + KAP + Kurum ağırlıklı skor</span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {companyRanking.length === 0 ? (
          <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-faint)' }}>
            Veriler yüklendikten sonra görünür.
          </div>
        ) : companyRanking.map(([code, score], rank) => {
          const isPriority = PRIORITY_COMPANIES.has(code);
          const maxScore   = companyRanking[0]?.[1] ?? 1;
          const pct        = Math.round((score / maxScore) * 100);

          return (
            <div key={code} style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 14, textAlign: 'right' }}>
                  {rank + 1}
                </span>
                <span style={{
                  fontSize: 14, fontWeight: 700, minWidth: 52,
                  color: rank === 0 ? 'var(--amber)' : isPriority ? 'var(--cream)' : 'var(--text-dim)',
                }}>
                  {code}
                </span>
                {!isPriority && (
                  <span style={{ fontSize: 9, color: 'var(--text-faint)', fontStyle: 'italic' }}>—</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>
                  {score.toFixed(1)}p
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginLeft: 22 }}>
                <div style={{
                  height: '100%', borderRadius: 2, width: `${pct}%`,
                  background: rank === 0 ? 'var(--amber)' : isPriority ? 'var(--border-3)' : 'var(--border-2)',
                  transition: 'width .3s ease',
                }} />
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
