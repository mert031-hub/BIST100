'use client';

import { useEffect, useState } from 'react';

export default function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString('tr-TR'));
    u();
    const iv = setInterval(u, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="status-bar">
      <div className="sb-item">
        <span style={{ color: 'var(--amber)', fontWeight: 'bold', letterSpacing: 2 }}>BIST RADAR</span>
        <span className="dim">v1.0</span>
      </div>
      <div className="sb-item">
        <span className="dot dot-live" style={{ width: 4, height: 4 }} />
        <span className="up" style={{ fontSize: 8 }}>AKTİF</span>
      </div>
      <div className="sb-item">
        <span className="dim">BIST100</span>
        <span className="amber">●</span>
        <span className="dim">KAP</span>
        <span className="amber">●</span>
        <span className="dim">EVDS</span>
        <span className="amber">●</span>
        <span className="dim">RSS</span>
      </div>
      <div className="sb-item">
        <span className="faint">{time}</span>
      </div>
      <div className="sb-disc">
        ⚠ BİLGİLENDİRME AMAÇLIDIR · YATIRIM TAVSİYESİ DEĞİLDİR · GECİKMELİ VERİ
      </div>
    </div>
  );
}
