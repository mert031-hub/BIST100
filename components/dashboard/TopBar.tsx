'use client';

import { useEffect, useState } from 'react';

export default function TopBar() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const isMarketOpen = () => {
    const now = new Date();
    const day = now.getDay();
    const h = now.getHours();
    const m = now.getMinutes();
    const mins = h * 60 + m;
    return day >= 1 && day <= 5 && mins >= 10 * 60 && mins < 18 * 60 + 10;
  };

  const marketOpen = isMarketOpen();

  return (
    <div className="top-bar">
      <div className="top-bar-logo">
        <span style={{ fontSize: 11 }}>◈</span>
        BIST RADAR STUDIO
      </div>

      <div className="top-bar-item">
        <span className={marketOpen ? 'up' : 'dim'} style={{ fontSize: 8 }}>●</span>
        <span style={{ color: marketOpen ? 'var(--green)' : 'var(--text-dim)', fontSize: 9 }}>
          BORSA {marketOpen ? 'AÇIK' : 'KAPALI'}
        </span>
      </div>

      <div className="top-bar-item hide-sm">
        <span className="dim">BIST100</span>
        <span className="amber" style={{ fontSize: 10, fontWeight: 'bold' }}>10,428.54</span>
        <span className="up" style={{ fontSize: 9 }}>▲ +0.82%</span>
      </div>

      <div className="top-bar-item hide-sm">
        <span className="dim">USD/TL</span>
        <span className="cream" style={{ fontSize: 10 }}>32.47</span>
      </div>

      <div className="top-bar-item hide-sm">
        <span className="dim">EUR/TL</span>
        <span className="cream" style={{ fontSize: 10 }}>35.12</span>
      </div>

      <div className="top-bar-item hide-sm">
        <span className="dim">FAİZ</span>
        <span className="amber" style={{ fontSize: 10, fontWeight: 'bold' }}>%50.00</span>
      </div>

      <div className="top-bar-item hide-sm">
        <span className="dim">BRENT</span>
        <span className="cream" style={{ fontSize: 10 }}>85.42</span>
        <span className="up" style={{ fontSize: 9 }}>▲ +0.4%</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 0 }}>
        <div className="top-bar-item">
          <span className="dim">{date}</span>
          <span className="amber" style={{ fontWeight: 'bold', fontSize: 10 }}>{time}</span>
        </div>
      </div>
    </div>
  );
}
