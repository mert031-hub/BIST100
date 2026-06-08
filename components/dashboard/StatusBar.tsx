'use client';

import { useEffect, useState } from 'react';

export default function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    u();
    const iv = setInterval(u, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="status-bar">
      <div className="sb-item">
        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--cream)' }}>BIST RADAR</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>v1.0.0</span>
      </div>
      <div className="sb-item">
        <span className="dot dot-live" />
        <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Aktif</span>
      </div>
      <div className="sb-item" style={{ gap: 8 }}>
        {['BIST100', 'KAP', 'EVDS', 'RSS'].map((s) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s}</span>
          </span>
        ))}
      </div>
      <div className="sb-item">
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{time}</span>
      </div>
      <div className="sb-disc">
        ⚠ Bilgilendirme amaçlıdır · Yatırım tavsiyesi değildir · Gecikmeli veri
      </div>
    </div>
  );
}
