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
      <div style={{ padding: '10px 8px', fontSize: 9, color: 'var(--text-faint)',
        letterSpacing: 1, lineHeight: 1.6 }}>
        HABER YÜKLENDİKTEN<br />SONRA GÖRÜNÜR
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
          rank  <  3 ? 'var(--amber-dim)' :
          count >= 3 ? 'var(--border-3)' : 'var(--border-2)';
        const codeColor =
          rank === 0 ? 'var(--amber-bright)' :
          rank === 1 ? 'var(--amber)' :
          'var(--text)';

        return (
          <div key={code} style={{ padding: '5px 8px 4px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 8, color: 'var(--text-faint)', minWidth: 12, textAlign: 'right' }}>
                {rank + 1}
              </span>
              <span style={{ color: codeColor, fontWeight: 'bold', fontSize: 11, minWidth: 48, flexShrink: 0 }}>
                {code}
              </span>
              {meta && (
                <span style={{
                  fontSize: 8, color: 'var(--text-dim)', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {meta.sector.toUpperCase()}
                </span>
              )}
              <span style={{ fontSize: 10, color: codeColor, fontWeight: 'bold',
                minWidth: 14, textAlign: 'right', flexShrink: 0 }}>
                {count}
              </span>
            </div>
            <div style={{ height: 2, background: 'var(--border)', marginLeft: 20 }}>
              <div style={{ height: '100%', width: `${barPct}%`, background: barColor, transition: 'width .3s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
