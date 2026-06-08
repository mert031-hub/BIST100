'use client';

import { useEffect, useState } from 'react';
import { Stock } from '@/types/stock';
import Sparkline from '@/components/ui/Sparkline';

function fmtPrice(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtVol(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

export default function StockPanel() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [source, setSource] = useState<'live' | 'mock'>('mock');
  const [lastFetch, setLastFetch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/stocks');
        const d = await res.json();
        setStocks(d.stocks ?? []);
        setSource(d.source);
        setLastFetch(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="panel" style={{ flexShrink: 0 }}>
      {/* Header */}
      <div className="ph">
        <span className={`dot ${source === 'live' ? 'dot-live' : 'dot-mock'}`} />
        <span className="ph-title">HİSSE TAKİP</span>
        <span className="ph-sub">BIST100</span>
        <span className="ph-right">{lastFetch ? `↻ ${lastFetch}` : ''}</span>
      </div>

      {/* Column headers */}
      <div className="col-hdr" style={{
        display: 'grid',
        gridTemplateColumns: '68px 62px 66px 54px 58px',
        padding: '2px 8px',
      }}>
        <span>KOD</span>
        <span style={{ textAlign: 'right' }}>FİYAT</span>
        <span style={{ textAlign: 'right' }}>DEĞİŞ%</span>
        <span style={{ textAlign: 'right' }}>HACİM</span>
        <span style={{ textAlign: 'center' }}>5G</span>
      </div>

      {/* Rows */}
      <div>
        {loading ? (
          <div style={{ padding: '10px 8px', fontSize: 10 }} className="dim cursor">
            VERİ YÜKLENİYOR
          </div>
        ) : stocks.map((s) => {
          const up = s.changePercent >= 0;
          return (
            <div key={s.symbol} className="ticker fi">
              <span style={{ color: 'var(--amber-bright)', fontWeight: 'bold', fontSize: 11 }}>
                {s.symbol.replace('.IS', '')}
              </span>
              <span className="cream" style={{ textAlign: 'right', fontSize: 11 }}>
                {fmtPrice(s.price)}
              </span>
              <span className={up ? 'up' : 'down'} style={{ textAlign: 'right', fontSize: 11 }}>
                {up ? '+' : ''}{s.changePercent.toFixed(2)}%
              </span>
              <span className="dim" style={{ textAlign: 'right', fontSize: 10 }}>
                {fmtVol(s.volume)}
              </span>
              <span style={{ textAlign: 'center' }}>
                <Sparkline data={s.sparkline} width={50} height={14} positive={up} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="disc-footer">⚠ GECİKMELİ VERİ · BİLGİLENDİRME AMAÇLIDIR</div>
    </div>
  );
}
