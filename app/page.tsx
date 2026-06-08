'use client';

import LeftPanel from '@/components/dashboard/LeftPanel';
import CenterPanel from '@/components/dashboard/CenterPanel';
import ContentStudio from '@/components/dashboard/ContentStudio';
import StatusBar from '@/components/dashboard/StatusBar';
import TopBar from '@/components/dashboard/TopBar';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 960 }}>
      <TopBar />

      <div
        className="main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr 320px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ borderRight: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <LeftPanel />
        </div>

        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CenterPanel />
        </div>

        <div style={{ borderLeft: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ContentStudio />
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
