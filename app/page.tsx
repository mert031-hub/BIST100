'use client';

import LeftPanel from '@/components/dashboard/LeftPanel';
import CenterPanel from '@/components/dashboard/CenterPanel';
import ContentStudio from '@/components/dashboard/ContentStudio';
import StatusBar from '@/components/dashboard/StatusBar';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--terminal-bg-3)',
        borderBottom: '1px solid var(--terminal-border)',
        padding: '4px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 28,
        flexShrink: 0,
      }}>
        <span style={{
          color: 'var(--terminal-amber-bright)',
          fontSize: 12,
          fontWeight: 'bold',
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}>
          ◈ BIST RADAR STUDIO
        </span>
        <span style={{ color: 'var(--terminal-border-bright)' }}>|</span>
        <span style={{ fontSize: 10, color: 'var(--terminal-amber-dim)', letterSpacing: 2 }}>
          BIST100 · KAP · EVDS · İÇERİK
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--terminal-text-dim)', letterSpacing: 1 }}>
          ⚠ BİLGİLENDİRME AMAÇLIDIR · YATIRIM TAVSİYESİ DEĞİLDİR
        </span>
      </div>

      {/* Main grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '230px 1fr 300px',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left: Stocks + TCMB */}
        <div style={{ borderRight: '1px solid var(--terminal-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <LeftPanel />
        </div>

        {/* Center: News / KAP / Brokers */}
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CenterPanel />
        </div>

        {/* Right: Content Studio */}
        <div style={{ borderLeft: '1px solid var(--terminal-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ContentStudio />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
