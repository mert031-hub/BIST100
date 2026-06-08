'use client';

import { useEffect, useState } from 'react';
import type { MarketKpi } from '@/app/api/market/route';

// Displayed while first fetch is in-flight
const FALLBACK_KPIS: MarketKpi[] = [
  { key: 'bist100', label: 'BIST100',   value: '—',      changeStr: '', up: true,  isLive: false },
  { key: 'usd_try', label: 'USD/TRY',   value: '—',      changeStr: '', up: true,  isLive: false },
  { key: 'eur_try', label: 'EUR/TRY',   value: '—',      changeStr: '', up: true,  isLive: false },
  { key: 'brent',   label: 'Brent',     value: '—',      changeStr: '', up: true,  isLive: false },
  { key: 'faiz',    label: 'TCMB Faiz', value: '%50,00', changeStr: '', up: false, isLive: false },
];

function isMarketOpen() {
  const now  = new Date();
  const day  = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  return day >= 1 && day <= 5 && mins >= 600 && mins < 1090;
}

export default function TopBar() {
  const [time, setTime]         = useState('');
  const [date, setDate]         = useState('');
  const [open, setOpen]         = useState(false);
  const [kpis, setKpis]         = useState<MarketKpi[]>(FALLBACK_KPIS);
  const [mktSource, setMktSource] = useState<'live' | 'partial' | 'mock'>('mock');

  // Clock tick
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
      setOpen(isMarketOpen());
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  // Market KPI fetch — 60s polling
  useEffect(() => {
    const load = async () => {
      try {
        const d = await (await fetch('/api/market')).json();
        if (Array.isArray(d.kpis) && d.kpis.length > 0) {
          setKpis(d.kpis);
          setMktSource(d.source ?? 'mock');
        }
      } catch { /* keep fallback */ }
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, []);

  const allMock = mktSource === 'mock';

  return (
    <div className="top-bar" style={{ height: 64 }}>
      {/* Logo */}
      <div style={{
        padding: '0 20px', height: '100%', flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        borderRight: '1px solid var(--border)', minWidth: 200,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', letterSpacing: '-0.3px', lineHeight: 1 }}>
          BIST RADAR STUDIO
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
          Piyasa İstihbaratı &amp; İçerik Merkezi
        </div>
      </div>

      {/* Market status */}
      <div style={{
        padding: '0 16px', height: '100%', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        borderRight: '1px solid var(--border)',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 9999,
          background: open ? '#DCFCE7' : '#F3F4F6',
          border: `1px solid ${open ? '#86EFAC' : '#E5E7EB'}`,
          fontSize: 11, fontWeight: 600,
          color: open ? 'var(--green)' : 'var(--text-dim)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: open ? 'var(--green)' : 'var(--border-3)',
            animation: open ? 'pulse 2s infinite' : 'none',
          }} />
          Borsa {open ? 'Açık' : 'Kapalı'}
        </span>
        {/* Data source badge */}
        {allMock ? (
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: 0.5,
            padding: '2px 6px', borderRadius: 3,
            background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
          }}>
            DEMO VERİ
          </span>
        ) : mktSource === 'partial' ? (
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: 0.5,
            padding: '2px 6px', borderRadius: 3,
            background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A',
          }}>
            KISMİ CANLI
          </span>
        ) : (
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: 0.5,
            padding: '2px 6px', borderRadius: 3,
            background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC',
          }}>
            CANLI
          </span>
        )}
      </div>

      {/* KPI items */}
      <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
        {kpis.map((item) => (
          <div key={item.key} style={{
            padding: '0 16px', height: '100%', flexShrink: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            borderRight: '1px solid var(--border)',
            opacity: item.isLive ? 1 : 0.75,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>
                {item.label}
              </span>
              {!item.isLive && (
                <span style={{ fontSize: 8, color: '#9CA3AF', fontStyle: 'italic' }}>demo</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', lineHeight: 1 }}>
                {item.value}
              </span>
              {item.changeStr && (
                <span style={{ fontSize: 12, fontWeight: 600, color: item.up ? 'var(--green)' : 'var(--red)' }}>
                  {item.changeStr}
                </span>
              )}
            </div>
            {!item.isLive && item.errorReason && (
              <div style={{
                fontSize: 8, fontWeight: 600, letterSpacing: 0.3,
                color: '#EF4444', marginTop: 1, whiteSpace: 'nowrap',
              }}>
                {item.errorReason}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Date + time */}
      <div style={{
        padding: '0 20px', height: '100%', flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'flex-end',
        borderLeft: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cream)', lineHeight: 1 }}>
          {time}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, textAlign: 'right' }}>
          {date}
        </div>
      </div>
    </div>
  );
}
