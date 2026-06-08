'use client';

import { useEffect, useState } from 'react';

type KpiItem = {
  label: string;
  value: string;
  change?: string;
  up?: boolean;
};

const KPI_ITEMS: KpiItem[] = [
  { label: 'BIST100',    value: '10.428,54', change: '▲ 0,82%', up: true  },
  { label: 'USD/TRY',    value: '32,47',     change: '▲ 0,11%', up: true  },
  { label: 'EUR/TRY',    value: '35,12',     change: '▲ 0,07%', up: true  },
  { label: 'TCMB Faiz',  value: '%50,00'                                   },
  { label: 'Brent',      value: '85,42',     change: '▲ 0,41%', up: true  },
];

function isMarketOpen() {
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  return day >= 1 && day <= 5 && mins >= 600 && mins < 1090;
}

export default function TopBar() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [open, setOpen] = useState(false);

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
      </div>

      {/* KPI items */}
      <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
        {KPI_ITEMS.map((item) => (
          <div key={item.label} style={{
            padding: '0 20px', height: '100%', flexShrink: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            borderRight: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500, marginBottom: 1 }}>
              {item.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', lineHeight: 1 }}>
                {item.value}
              </span>
              {item.change && (
                <span style={{ fontSize: 12, fontWeight: 600, color: item.up ? 'var(--green)' : 'var(--red)' }}>
                  {item.change}
                </span>
              )}
            </div>
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
