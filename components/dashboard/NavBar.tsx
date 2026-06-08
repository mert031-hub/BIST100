'use client';

import { useDashboardStore, ActiveView } from '@/store/dashboard-store';

type NavTab = { label: string; view: ActiveView; disabled?: boolean };

const TABS: NavTab[] = [
  { label: 'Genel Bakış',    view: 'overview' },
  { label: 'Haberler',       view: 'news' },
  { label: 'KAP',            view: 'kap' },
  { label: 'Kurum Radarı',   view: 'brokers' },
  { label: 'TCMB Verileri',  view: 'tcmb' },
  { label: 'Takvim',         view: 'news', disabled: true },
];

export default function NavBar() {
  const { activeView, setActiveView } = useDashboardStore();

  return (
    <div style={{
      flexShrink: 0, height: 40,
      background: 'var(--bg-2)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch',
      paddingLeft: 8,
    }}>
      {TABS.map((tab, i) => {
        const isActive = !tab.disabled && activeView === tab.view;

        return (
          <button
            key={i}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && setActiveView(tab.view)}
            style={{
              padding: '0 16px', height: '100%',
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
              color: tab.disabled
                ? 'var(--text-faint)'
                : isActive
                ? 'var(--amber)'
                : 'var(--text-dim)',
              cursor: tab.disabled ? 'default' : 'pointer',
              fontFamily: 'inherit', fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              whiteSpace: 'nowrap', transition: 'all .15s',
            }}
          >
            {tab.label}
          </button>
        );
      })}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: 16, gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>v1.0.0</span>
        <button style={{
          padding: '4px 12px', fontSize: 11, fontWeight: 500,
          border: '1px solid var(--border-2)', borderRadius: 4,
          background: 'var(--bg-3)', color: 'var(--text-dim)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Ayarlar
        </button>
      </div>
    </div>
  );
}
