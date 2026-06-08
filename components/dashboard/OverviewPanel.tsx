'use client';

import { useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { PRIORITY_COMPANIES } from '@/data/companies';
import type { NewsItem } from '@/types/news';
import type { KapDisclosure } from '@/types/kap';

// ─── Combined signal type ─────────────────────────────────────────────────────

type SignalType = 'KAP' | 'HABER';

interface Signal {
  id: string;
  type: SignalType;
  title: string;
  companyCode?: string;
  effectiveScore: number;
  date: string;
  url?: string;
  isPriority: boolean;
}

// KAP items get +15 bonus — company disclosures are the most direct signal
const KAP_BONUS = 15;

function newsToSignal(item: NewsItem): Signal {
  const mainCode = item.relatedCompanies[0];
  return {
    id:             item.id,
    type:           'HABER',
    title:          item.title,
    companyCode:    mainCode,
    effectiveScore: item.importanceScore,
    date:           item.date,
    url:            item.sourceUrl,
    isPriority:     item.relatedCompanies.some((c) => PRIORITY_COMPANIES.has(c)),
  };
}

function kapToSignal(disc: KapDisclosure): Signal {
  return {
    id:             disc.id,
    type:           'KAP',
    title:          disc.title,
    companyCode:    disc.companyCode,
    effectiveScore: Math.min(100, disc.importanceScore + KAP_BONUS),
    date:           disc.date,
    url:            disc.sourceUrl,
    isPriority:     PRIORITY_COMPANIES.has(disc.companyCode),
  };
}

function ageLabel(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m <  1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)}g`;
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function OverviewPanel() {
  const { topNewsItems, topKapItems } = useDashboardStore();

  const signals = useMemo((): Signal[] => {
    const all: Signal[] = [
      ...topNewsItems.map(newsToSignal),
      ...topKapItems.map(kapToSignal),
    ];

    // Deduplicate by id, sort by effectiveScore desc
    const seen = new Set<string>();
    return all
      .filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
      .sort((a, b) => b.effectiveScore - a.effectiveScore)
      .slice(0, 5);
  }, [topNewsItems, topKapItems]);

  // Weighted company scores for leaderboard: news score/10 + KAP×3
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

    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [topNewsItems, topKapItems]);

  const isEmpty = signals.length === 0;

  return (
    <div className="panel">
      {/* ─── GÜNÜN SİNYALLERİ ──────────────────────────────────────────── */}
      <div className="ph">
        <span className="dot dot-live" style={{ animation: isEmpty ? 'none' : undefined }} />
        <span className="ph-title">GÜNÜN SİNYALLERİ</span>
        <span className="ph-sub">KAP + HABERLER · AĞIRLIKLI SKOR</span>
        <span className="ph-right">{signals.length} / 5</span>
      </div>

      <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {isEmpty ? (
          <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
            Haberler ve KAP bildirimleri yüklendikçe en önemli 5 sinyal burada görünecek.
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
              KAP bildirimleri haberlerden +{KAP_BONUS} puan avantajlı işlenir.
            </span>
          </div>
        ) : signals.map((sig, i) => (
          <div
            key={sig.id}
            style={{
              padding: '10px 16px',
              borderBottom: i < signals.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: i === 0 ? 'var(--bg-3)' : 'var(--bg-2)',
            }}
          >
            {/* Rank */}
            <span style={{
              fontSize: 13, fontWeight: 700, color: i === 0 ? 'var(--amber)' : 'var(--text-faint)',
              minWidth: 16, textAlign: 'right', flexShrink: 0, marginTop: 1,
            }}>
              {i + 1}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Row 1: type badge · company · score · time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                  background: sig.type === 'KAP' ? '#DBEAFE' : '#F3F4F6',
                  color:      sig.type === 'KAP' ? '#1D4ED8' : '#6B7280',
                  border:     `1px solid ${sig.type === 'KAP' ? '#BFDBFE' : '#E5E7EB'}`,
                }}>
                  {sig.type}
                </span>
                {sig.companyCode && (
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: sig.isPriority ? 'var(--amber)' : 'var(--text-dim)',
                    flexShrink: 0,
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

              {/* Title */}
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

              {sig.url && (
                <a
                  href={sig.url} target="_blank" rel="noopener noreferrer"
                  className="src-link"
                >
                  ↗ Kaynak
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ─── ÖN PLANA ÇIKAN HİSSELER ──────────────────────────────────── */}
      <div className="ph" style={{ marginTop: 0 }}>
        <span className="ph-title">ÖN PLANA ÇIKAN HİSSELER</span>
        <span className="ph-sub">Haber + KAP ağırlıklı skor</span>
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
