'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { COMPANIES, PRIORITY_COMPANIES } from '@/data/companies';
import StockPanel from './StockPanel';
import SourceHealthBar from './SourceHealthBar';
import type { MarketKpi } from '@/app/api/market/route';

type LeftTab = 'RADAR' | 'PRICES';

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{
      padding: '8px 16px 6px', flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-3)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{subtitle}</div>
      )}
    </div>
  );
}

export default function LeftPanel() {
  const [tab, setTab] = useState<LeftTab>('RADAR');
  const { topNewsItems, kapCounts, marketKpis } = useDashboardStore();
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  }, [topNewsItems, kapCounts]);

  /* Weighted company score: news importanceScore/10 per mention + kapCounts * 3 */
  const topCompanies = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const item of topNewsItems) {
      for (const code of item.relatedCompanies) {
        scores[code] = (scores[code] ?? 0) + item.importanceScore / 10;
      }
    }
    for (const [code, count] of Object.entries(kapCounts)) {
      scores[code] = (scores[code] ?? 0) + count * 3;
    }
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [topNewsItems, kapCounts]);

  const maxScore = topCompanies[0]?.[1] ?? 1;

  /* Top KAP disclosure counts */
  const topKap = Object.entries(kapCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const maxKap = topKap[0]?.[1] ?? 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-2)' }}>

      {/* ─ Tab bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexShrink: 0, height: 40,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)',
      }}>
        {(['RADAR', 'PRICES'] as LeftTab[]).map((t) => {
          const label = t === 'RADAR' ? 'Hisse Radarı' : 'Fiyatlar';
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, height: '100%', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${active ? 'var(--amber)' : 'transparent'}`,
                color: active ? 'var(--amber)' : 'var(--text-dim)',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 12, fontWeight: active ? 600 : 500,
                transition: 'all .15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ─ Main scrollable area ──────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {tab === 'RADAR' ? (
          <>
            {/* EN ÇOK KONUŞULAN HİSSELER */}
            <SectionHeader title="En Çok Konuşulan Hisseler" subtitle="Haber + KAP ağırlıklı skor" />
            {topCompanies.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-faint)' }}>
                Haberler yüklendikten sonra görünür.
              </div>
            ) : (
              <div>
                {topCompanies.map(([code, score], rank) => {
                  const meta       = COMPANIES[code];
                  const isPriority = PRIORITY_COMPANIES.has(code);
                  const pct        = Math.round((score / maxScore) * 100);
                  const nameColor  = rank === 0 ? 'var(--amber)' : isPriority ? 'var(--cream)' : 'var(--text)';
                  return (
                    <div key={code} style={{ padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 14, textAlign: 'right' }}>
                          {rank + 1}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: nameColor, minWidth: 52, flexShrink: 0 }}>
                          {code}
                        </span>
                        {meta && (
                          <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {meta.name ?? meta.sector}
                          </span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', flexShrink: 0 }}>
                          {score.toFixed(1)}p
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginLeft: 22 }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${pct}%`,
                          background: rank === 0 ? 'var(--amber)' : isPriority ? 'var(--amber-dim)' : 'var(--border-3)',
                          transition: 'width .3s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BUGÜN EN ÇOK KAP AÇIKLAMASI */}
            <SectionHeader title="Bugün En Çok KAP Açıklaması" />
            {topKap.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-faint)' }}>
                KAP verisi yüklendikten sonra görünür.
              </div>
            ) : (
              <div>
                {topKap.map(([code, count]) => {
                  const pct = Math.round((count / maxKap) * 100);
                  return (
                    <div key={code} style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', flex: 1 }}>{code}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{count} açıklama</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: '#2563EB', transition: 'width .3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* FİYATLAR tab */
          <StockPanel />
        )}

        {/* PİYASA ÖZETİ — live data from /api/market via store */}
        <SectionHeader title="Piyasa Özeti" />
        <div>
          {marketKpis.length === 0 ? (
            <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-faint)' }}>
              Piyasa verisi yükleniyor...
            </div>
          ) : marketKpis.map((item: MarketKpi) => (
            <div key={item.key} style={{
              display: 'flex', alignItems: 'center', padding: '8px 16px',
              borderBottom: '1px solid var(--border)',
              opacity: item.isLive ? 1 : 0.7,
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, flex: 1 }}>
                {item.label}
              </span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: item.isLive ? 'var(--cream)' : 'var(--text-faint)' }}>
                    {item.value}
                  </span>
                  {item.changeStr && item.isLive && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: item.up ? 'var(--green)' : 'var(--red)' }}>
                      {item.changeStr}
                    </span>
                  )}
                </div>
                {!item.isLive && item.errorReason && (
                  <div style={{ fontSize: 8, color: '#EF4444', fontWeight: 600, letterSpacing: 0.3 }}>
                    {item.errorReason}
                  </div>
                )}
                {!item.isLive && !item.errorReason && (
                  <div style={{ fontSize: 8, color: 'var(--text-faint)' }}>Veri yok</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', marginTop: 'auto', flexShrink: 0,
          borderTop: '1px solid var(--border)', background: 'var(--bg-3)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-faint)', flex: 1 }}>
            {lastUpdate ? `Güncellendi: ${lastUpdate}` : 'Yükleniyor...'}
          </span>
          {marketKpis.some((k: MarketKpi) => k.isLive) && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3,
              background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC',
            }}>
              CANLI
            </span>
          )}
        </div>
      </div>

      <SourceHealthBar />
    </div>
  );
}
