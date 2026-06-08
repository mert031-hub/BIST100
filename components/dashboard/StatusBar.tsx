'use client';

import { useEffect, useState } from 'react';

export default function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('tr-TR'));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="status-bar">
      <span style={{ color: 'var(--terminal-amber)', fontWeight: 'bold' }}>BIST RADAR STUDIO</span>
      <span>v1.0</span>
      <span style={{ color: 'var(--terminal-border-bright)' }}>|</span>
      <span>{time}</span>
      <span style={{ color: 'var(--terminal-border-bright)' }}>|</span>
      <span style={{ color: 'var(--terminal-green-bright)' }}>● SİSTEM AKTİF</span>
      <span style={{ color: 'var(--terminal-border-bright)' }}>|</span>
      <span>BIST100 · KAP · EVDS · RSS</span>
      <span style={{ marginLeft: 'auto', color: 'var(--terminal-text-dim)' }}>
        ⚠ BİLGİLENDİRME AMAÇLIDIR · YATIRIM TAVSİYESİ DEĞİLDİR
      </span>
    </div>
  );
}
