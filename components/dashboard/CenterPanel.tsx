'use client';

import { useDashboardStore } from '@/store/dashboard-store';
import NewsPanel from './NewsPanel';
import KapPanel from './KapPanel';
import BrokerRadar from './BrokerRadar';
import TcmbPanel from './TcmbPanel';
import OverviewPanel from './OverviewPanel';
import UnifiedFeedPanel from './UnifiedFeedPanel';
import CompanyPanel from './CompanyPanel';

export default function CenterPanel() {
  const { activeView, selectedCompany } = useDashboardStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeView === 'overview' && <OverviewPanel />}
        {activeView === 'feed'     && <UnifiedFeedPanel />}
        {activeView === 'news'     && <NewsPanel />}
        {activeView === 'kap'      && <KapPanel />}
        {activeView === 'brokers'  && <BrokerRadar />}
        {activeView === 'tcmb'     && (
          <div style={{ padding: 16, height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
            <TcmbPanel />
          </div>
        )}
      </div>

      {/* Company detail overlay — slides over current view */}
      {selectedCompany && <CompanyPanel />}
    </div>
  );
}
