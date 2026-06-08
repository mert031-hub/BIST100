'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { COMPANIES } from '@/data/companies';
import StockPanel from './StockPanel';
import SourceHealthBar from './SourceHealthBar';
import { Stock } from '@/types/stock';

type LeftTab = 'RADAR' | 'PRICES';

/* ── Market summary items (demo data matching TopBar) ─────────────── */
const MARKET_ITEMS = [
  { label: 'BIST100',  value: '10.428,54', chg: '+0,82%', up: true  },
  { label: 'BIST30',   value: '11.358,19', chg: '+0,75%', up: true  },
  { label: 'Dolar/TL', value: '32,47',     chg: '+0,11%', up: true  },
  { label: 'Euro/TL',  value: '35,12',     chg: '+0,07%', up: true  },
  { label: 'Altın/gr', value: '2.420,31',  chg: '+0,28%', up: true  },
  { label: 'Brent',    value: '85,42',     chg: '+0,41%', up: true  },
];

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
  const { companyCounts, kapCounts } = useDashboardStore();
  const [lastUpdate, setLastUpdate] = useState('');
  const [isMock, setIsMock] = useState(true);

  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  }, [companyCounts]);

  /* Top 5 company mention counts */
  const topCompanies = Object.entries(companyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const maxCount = topCompanies[0]?.[1] ?? 1;

  /* Top 5 KAP disclosure counts */
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
            <SectionHeader title="En Çok Konuşulan Hisseler" subtitle="Son 24 saat · Haber bazlı" />
            {topCompanies.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-faint)' }}>
                Haberler yüklendikten sonra görünür.
              </div>
            ) : (
              <div>
                {topCompanies.map(([code, count], rank) => {
                  const meta = COMPANIES[code];
                  const pct  = Math.round((count / maxCount) * 100);
                  const nameColor = rank === 0 ? 'var(--amber)' : rank < 3 ? 'var(--cream)' : 'var(--text)';
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
                          {count} haber
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginLeft: 22 }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${pct}%`,
                          background: rank === 0 ? 'var(--amber)' : rank < 3 ? 'var(--amber-dim)' : 'var(--border-3)',
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

        {/* PİYASA ÖZETİ — always visible regardless of tab */}
        <SectionHeader title="Piyasa Özeti" />
        <div>
          {MARKET_ITEMS.map((item) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', padding: '8px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, flex: 1 }}>
                {item.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginRight: 8 }}>
                {item.value}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: item.up ? 'var(--green)' : 'var(--red)', minWidth: 54, textAlign: 'right' }}>
                {item.up ? '+' : ''}{item.chg}
              </span>
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
            {lastUpdate ? `Veriler ${lastUpdate} itibarıyla güncellendi.` : ''}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3,
            background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
          }}>
            DEMO VERİ
          </span>
        </div>
      </div>

      <SourceHealthBar />
    </div>
  );
}
