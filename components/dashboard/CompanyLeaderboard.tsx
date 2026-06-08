'use client';

import { useDashboardStore } from '@/store/dashboard-store';
import { COMPANIES } from '@/data/companies';

export default function CompanyLeaderboard() {
  const { companyCounts } = useDashboardStore();

  const sorted = Object.entries(companyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const maxCount = sorted[0]?.[1] ?? 1;

  if (sorted.length === 0) {
    return (
      <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
        Haberler yüklendikten sonra görünür.
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {sorted.map(([code, count], rank) => {
        const meta     = COMPANIES[code];
        const barPct   = Math.round((count / maxCount) * 100);
        const barColor =
          rank === 0 ? 'var(--amber)' :
          rank  <  3 ? '#FDE68A' :
          count >= 3 ? 'var(--border-3)' : 'var(--border-2)';
        const codeColor =
          rank === 0 ? 'var(--amber)' :
          rank === 1 ? 'var(--amber-bright)' :
          'var(--cream)';

        return (
          <div key={code} style={{ padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 14, textAlign: 'right', flexShrink: 0 }}>
                {rank + 1}
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, color: codeColor, minWidth: 52, flexShrink: 0 }}>
                {code}
              </span>
              {meta && (
                <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meta.name}
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', flexShrink: 0 }}>
                {count}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginLeft: 22 }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${barPct}%`, background: barColor, transition: 'width .3s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
