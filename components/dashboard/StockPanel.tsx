'use client';

import { useEffect, useState } from 'react';
import { Stock } from '@/types/stock';
import Sparkline from '@/components/ui/Sparkline';
import PanelHeader from '@/components/ui/PanelHeader';

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtVol(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toString();
}

export default function StockPanel() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [lastFetch, setLastFetch] = useState<string>('');
  const [loading, setLoading] = useState(true);

  async function fetchStocks() {
    try {
      const res = await fetch('/api/stocks');
      const data = await res.json();
      setStocks(data.stocks ?? []);
      setSource(data.source);
      setLastFetch(new Date().toLocaleTimeString('tr-TR'));
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader
        title="HİSSE TAKİP"
        subtitle="BIST100"
        live={source === 'live'}
        right={
          <span style={{ fontSize: 9, color: 'var(--terminal-text-dim)' }}>
            {lastFetch ? `↻ ${lastFetch}` : ''}
          </span>
        }
      />

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '78px 60px 70px 70px 55px',
        padding: '3px 8px',
        fontSize: 9,
        color: 'var(--terminal-text-dim)',
        letterSpacing: '1px',
        borderBottom: '1px solid var(--terminal-border)',
        background: 'var(--terminal-bg-3)',
      }}>
        <span>KOD</span>
        <span style={{ textAlign: 'right' }}>FİYAT</span>
        <span style={{ textAlign: 'right' }}>DEĞ%</span>
        <span style={{ textAlign: 'right' }}>HACİM</span>
        <span style={{ textAlign: 'center' }}>GRAFİK</span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '12px 8px', color: 'var(--terminal-text-dim)', fontSize: 11 }}>
            VERİ YÜKLENİYOR<span className="cursor" />
          </div>
        ) : stocks.map((s) => {
          const isUp = s.changePercent >= 0;
          return (
            <div key={s.symbol} className="ticker-row fade-in">
              <span style={{ color: 'var(--terminal-amber-bright)', fontWeight: 'bold', fontSize: 11 }}>
                {s.symbol.replace('.IS', '')}
              </span>
              <span style={{ textAlign: 'right', color: 'var(--terminal-cream)' }}>
                {fmt(s.price)}
              </span>
              <span style={{ textAlign: 'right' }} className={isUp ? 'text-up' : 'text-down'}>
                {isUp ? '+' : ''}{fmt(s.changePercent)}%
              </span>
              <span style={{ textAlign: 'right', color: 'var(--terminal-text-dim)', fontSize: 10 }}>
                {fmtVol(s.volume)}
              </span>
              <span style={{ textAlign: 'center' }}>
                <Sparkline data={s.sparkline} width={50} height={16} positive={isUp} />
              </span>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '3px 8px',
        fontSize: 9,
        color: 'var(--terminal-text-dim)',
        borderTop: '1px solid var(--terminal-border)',
        background: 'var(--terminal-bg-3)',
        letterSpacing: '1px',
      }}>
        ⚠ BİLGİLENDİRME AMAÇLIDIR · GECİKMELİ VERİ
      </div>
    </div>
  );
}
