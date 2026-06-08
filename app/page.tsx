'use client';

import LeftPanel from '@/components/dashboard/LeftPanel';
import CenterPanel from '@/components/dashboard/CenterPanel';
import ContentStudio from '@/components/dashboard/ContentStudio';
import BrokerSummary from '@/components/dashboard/BrokerSummary';
import StatusBar from '@/components/dashboard/StatusBar';
import TopBar from '@/components/dashboard/TopBar';
import NavBar from '@/components/dashboard/NavBar';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 1024, background: 'var(--bg)' }}>
      <TopBar />
      <NavBar />

      <div
        className="main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 380px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          gap: 0,
        }}
      >
        {/* Left column */}
        <div style={{
          borderRight: '1px solid var(--border)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: 'var(--bg-2)',
        }}>
          <LeftPanel />
        </div>

        {/* Center column */}
        <div style={{
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: 'var(--bg)',
        }}>
          <CenterPanel />
        </div>

        {/* Right column: BrokerSummary (top) + ContentStudio (bottom) */}
        <div style={{
          borderLeft: '1px solid var(--border)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: 'var(--bg-2)',
        }}>
          <div style={{ flex: '0 0 46%', minHeight: 0, overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
            <BrokerSummary />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <ContentStudio />
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
