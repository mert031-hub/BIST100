'use client';

import StockPanel from './StockPanel';
import TcmbPanel from './TcmbPanel';

export default function LeftPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--terminal-border)' }}>
      <div style={{ flex: '0 0 auto' }}>
        <StockPanel />
      </div>
      <div style={{ flex: 1, minHeight: 0, borderTop: '1px solid var(--terminal-border)' }}>
        <TcmbPanel />
      </div>
    </div>
  );
}
