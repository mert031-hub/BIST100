'use client';

import { useDashboardStore } from '@/store/dashboard-store';
import NewsPanel from './NewsPanel';
import KapPanel from './KapPanel';
import BrokerRadar from './BrokerRadar';
import TcmbPanel from './TcmbPanel';
import OverviewPanel from './OverviewPanel';

export default function CenterPanel() {
  const { activeView } = useDashboardStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeView === 'overview' && <OverviewPanel />}
        {activeView === 'news'    && <NewsPanel />}
        {activeView === 'kap'     && <KapPanel />}
        {activeView === 'brokers' && <BrokerRadar />}
        {activeView === 'tcmb'    && (
          <div style={{ padding: 16, height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
            <TcmbPanel />
          </div>
        )}
      </div>
    </div>
  );
}
