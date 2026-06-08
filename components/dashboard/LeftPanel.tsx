'use client';

import { useState } from 'react';
import StockPanel from './StockPanel';
import TcmbPanel from './TcmbPanel';
import SourceHealthBar from './SourceHealthBar';
import CompanyLeaderboard from './CompanyLeaderboard';

type LeftTab = 'RADAR' | 'PRICES';

export default function LeftPanel() {
  const [tab, setTab] = useState<LeftTab>('RADAR');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top section */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '42%', minHeight: 0, flexShrink: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', flexShrink: 0, height: 24,
          background: 'var(--bg-3)', borderBottom: '1px solid var(--border)',
        }}>
          {(['RADAR', 'PRICES'] as LeftTab[]).map((t) => {
            const label   = t === 'RADAR' ? 'HİSSE RADARI' : 'FİYATLAR';
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, height: '100%', background: 'transparent', border: 'none',
                  borderRight: '1px solid var(--border)',
                  borderBottom: isActive ? '2px solid var(--amber)' : '2px solid transparent',
                  color: isActive ? 'var(--amber)' : 'var(--text-dim)',
                  cursor: 'pointer', fontFamily: 'monospace',
                  fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Section header */}
        <div className="ph" style={{ height: 22 }}>
          <span className="ph-title">
            {tab === 'RADAR' ? 'EN ÇOK KONUŞULAN' : 'BIST100 FİYATLARI'}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {tab === 'RADAR' ? <CompanyLeaderboard /> : <StockPanel />}
        </div>
      </div>

      {/* TCMB / Macro */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <TcmbPanel />
      </div>

      <SourceHealthBar />
    </div>
  );
}
