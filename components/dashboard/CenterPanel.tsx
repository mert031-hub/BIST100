'use client';

import { useDashboardStore } from '@/store/dashboard-store';
import KapPanel from './KapPanel';
import NewsPanel from './NewsPanel';
import BrokerRadar from './BrokerRadar';

const TABS = [
  { id: 'news'    as const, label: '▤ HABERLER',       icon: '▤' },
  { id: 'kap'     as const, label: '▦ KAP BİLDİRİMLERİ', icon: '▦' },
  { id: 'brokers' as const, label: '⊞ KURUM RADARI',   icon: '⊞' },
] as const;

export default function CenterPanel() {
  const { activePanel, setActivePanel } = useDashboardStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activePanel === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActivePanel(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activePanel === 'news'    && <NewsPanel />}
        {activePanel === 'kap'     && <KapPanel />}
        {activePanel === 'brokers' && <BrokerRadar />}
      </div>
    </div>
  );
}
