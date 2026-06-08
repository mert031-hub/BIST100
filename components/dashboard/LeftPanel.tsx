'use client';

import StockPanel from './StockPanel';
import TcmbPanel from './TcmbPanel';
import SourceHealthBar from './SourceHealthBar';

export default function LeftPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <StockPanel />
      <div style={{ flex: 1, minHeight: 0, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <TcmbPanel />
      </div>
      <SourceHealthBar />
    </div>
  );
}
