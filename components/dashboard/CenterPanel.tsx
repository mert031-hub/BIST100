'use client';

import { useDashboardStore } from '@/store/dashboard-store';
import KapPanel from './KapPanel';
import NewsPanel from './NewsPanel';
import BrokerRadar from './BrokerRadar';

const TABS = [
  { id: 'news' as const, label: 'HABERLER' },
  { id: 'kap' as const, label: 'KAP BİLDİRİMLERİ' },
  { id: 'brokers' as const, label: 'KURUM RADARI' },
];

export default function CenterPanel() {
  const { activePanel, setActivePanel } = useDashboardStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--terminal-border)',
        background: 'var(--terminal-bg-3)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            style={{
              padding: '6px 12px',
              background: activePanel === tab.id ? 'var(--terminal-bg-2)' : 'transparent',
              border: 'none',
              borderRight: '1px solid var(--terminal-border)',
              borderBottom: activePanel === tab.id ? '2px solid var(--terminal-amber)' : '2px solid transparent',
              color: activePanel === tab.id ? 'var(--terminal-amber)' : 'var(--terminal-text-dim)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              transition: 'all 0.1s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activePanel === 'news' && <NewsPanel />}
        {activePanel === 'kap' && <KapPanel />}
        {activePanel === 'brokers' && <BrokerRadar />}
      </div>
    </div>
  );
}
