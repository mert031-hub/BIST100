'use client';

import { useState, useCallback } from 'react';

const ENDPOINTS = [
  { key: 'health',  path: '/api/health',  label: 'HEALTH'  },
  { key: 'market',  path: '/api/market',  label: 'MARKET'  },
  { key: 'stocks',  path: '/api/stocks',  label: 'STOCKS'  },
  { key: 'news',    path: '/api/news',    label: 'NEWS'     },
  { key: 'kap',     path: '/api/kap',     label: 'KAP'     },
  { key: 'brokers', path: '/api/brokers', label: 'BROKERS' },
  { key: 'tcmb',    path: '/api/tcmb',    label: 'TCMB'    },
] as const;

type EndpointKey = (typeof ENDPOINTS)[number]['key'];

type Status = 'idle' | 'loading' | 'ok' | 'error';

interface EndpointState {
  status: Status;
  source: string | null;    // live / mock / partial / etc.
  responseMs: number | null;
  error: string | null;
  json: unknown;
  fetchedAt: string | null;
}

function extractSource(data: unknown): string | null {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    return (d.source as string) ?? (d.status as string) ?? null;
  }
  return null;
}

const INIT: EndpointState = {
  status: 'idle', source: null, responseMs: null,
  error: null, json: null, fetchedAt: null,
};

export default function DebugPage() {
  const [states, setStates] = useState<Record<EndpointKey, EndpointState>>({
    health: { ...INIT }, market: { ...INIT }, stocks: { ...INIT }, news: { ...INIT },
    kap:    { ...INIT }, brokers: { ...INIT }, tcmb: { ...INIT },
  });

  const [expanded, setExpanded] = useState<Record<EndpointKey, boolean>>({
    health: true, market: false, stocks: false, news: false,
    kap: false, brokers: false, tcmb: false,
  });

  const [allLoading, setAllLoading] = useState(false);

  const fetchOne = useCallback(async (key: EndpointKey, path: string) => {
    setStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: 'loading', error: null },
    }));

    const t0 = performance.now();
    try {
      const res = await fetch(path, { cache: 'no-store' });
      const responseMs = Math.round(performance.now() - t0);
      const text = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { json = text; }

      setStates((prev) => ({
        ...prev,
        [key]: {
          status: res.ok ? 'ok' : 'error',
          source: extractSource(json),
          responseMs,
          error: res.ok ? null : `HTTP ${res.status}`,
          json,
          fetchedAt: new Date().toLocaleTimeString('tr-TR', { hour12: false }),
        },
      }));
    } catch (err) {
      const responseMs = Math.round(performance.now() - t0);
      setStates((prev) => ({
        ...prev,
        [key]: {
          status: 'error',
          source: null,
          responseMs,
          error: err instanceof Error ? err.message : String(err),
          json: null,
          fetchedAt: new Date().toLocaleTimeString('tr-TR', { hour12: false }),
        },
      }));
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setAllLoading(true);
    await Promise.all(ENDPOINTS.map(({ key, path }) => fetchOne(key, path)));
    setAllLoading(false);
  }, [fetchOne]);

  const toggleExpand = (key: EndpointKey) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{
      minHeight: '100vh', background: '#080807',
      fontFamily: "'Courier New', Consolas, monospace",
      fontSize: 12, color: '#a89868',
      padding: '0 0 40px',
    }}>
      {/* Top bar */}
      <div style={{
        height: 32, background: '#111110',
        borderBottom: '1px solid #252520',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span style={{ color: '#e8c86b', fontWeight: 'bold', letterSpacing: 3, fontSize: 11 }}>
          BIST RADAR
        </span>
        <span style={{ color: '#252520', fontSize: 10 }}>│</span>
        <span style={{ color: '#5a5040', letterSpacing: 2, fontSize: 10 }}>API DEBUG CONSOLE</span>
        <span style={{ color: '#252520', fontSize: 10 }}>│</span>
        <span style={{ color: '#6e2828', fontSize: 9, letterSpacing: 1 }}>
          ⚠ SADECE GELİŞTİRME / TEST
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href="/"
            style={{
              fontSize: 9, letterSpacing: 1, color: '#7a6428',
              border: '1px solid #333328', padding: '2px 8px',
              textDecoration: 'none', fontFamily: 'monospace',
            }}
          >
            ← PANEL
          </a>
          <button
            onClick={fetchAll}
            disabled={allLoading}
            style={{
              fontSize: 9, letterSpacing: 1, padding: '2px 10px',
              background: allLoading ? 'transparent' : 'rgba(200,168,75,0.08)',
              border: `1px solid ${allLoading ? '#333328' : '#c8a84b'}`,
              color: allLoading ? '#5a5040' : '#e8c86b',
              cursor: allLoading ? 'default' : 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {allLoading ? '⧖ YÜKLENİYOR...' : '↺ TÜMÜNÜ YENİLE'}
          </button>
        </div>
      </div>

      {/* Endpoint cards */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 16px 0' }}>
        {ENDPOINTS.map(({ key, path, label }) => {
          const s = states[key];
          const isExpanded = expanded[key];

          const statusColor =
            s.status === 'ok'      ? '#4aac44' :
            s.status === 'error'   ? '#b84444' :
            s.status === 'loading' ? '#c8a84b' :
            '#3a3428';

          const sourceColor =
            s.source === 'live' || s.source === 'live-rss' || s.source === 'live-json'
              ? '#4aac44' :
            s.source === 'mock'
              ? '#7a6428' :
            s.source === 'partial'
              ? '#c8a84b' :
            '#5a5040';

          const jsonStr = s.json != null
            ? JSON.stringify(s.json, null, 2)
            : null;

          const lineCount = jsonStr ? jsonStr.split('\n').length : 0;

          return (
            <div
              key={key}
              style={{
                marginBottom: 10,
                border: `1px solid ${s.status === 'error' ? '#6e2828' : '#252520'}`,
                background: '#0d0d0b',
              }}
            >
              {/* Card header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px',
                background: '#111110',
                borderBottom: isExpanded ? '1px solid #252520' : 'none',
                cursor: 'pointer',
              }}
                onClick={() => toggleExpand(key)}
              >
                {/* Status dot */}
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: statusColor,
                  boxShadow: s.status === 'ok' ? `0 0 4px ${statusColor}` : 'none',
                  flexShrink: 0,
                }} />

                {/* Label + path */}
                <span style={{ color: '#e8c86b', fontWeight: 'bold', letterSpacing: 2, fontSize: 11, minWidth: 70 }}>
                  {label}
                </span>
                <span style={{ color: '#444438', fontSize: 10 }}>{path}</span>

                {/* Badges */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.source && (
                    <span style={{
                      fontSize: 8, letterSpacing: 1, padding: '1px 5px',
                      border: `1px solid ${sourceColor}`, color: sourceColor,
                    }}>
                      {s.source.toUpperCase()}
                    </span>
                  )}
                  {s.responseMs != null && (
                    <span style={{ fontSize: 9, color: s.responseMs > 3000 ? '#b84444' : '#5a5040' }}>
                      {s.responseMs}ms
                    </span>
                  )}
                  {s.fetchedAt && (
                    <span style={{ fontSize: 9, color: '#3a3428' }}>{s.fetchedAt}</span>
                  )}
                  {s.status === 'error' && s.error && (
                    <span style={{ fontSize: 8, color: '#b84444', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.error}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); fetchOne(key, path); }}
                    disabled={s.status === 'loading'}
                    style={{
                      fontSize: 8, letterSpacing: 1, padding: '1px 7px',
                      background: 'transparent',
                      border: `1px solid ${s.status === 'loading' ? '#333328' : '#333328'}`,
                      color: s.status === 'loading' ? '#5a5040' : '#7a6428',
                      cursor: s.status === 'loading' ? 'default' : 'pointer',
                      fontFamily: 'monospace',
                    }}
                  >
                    {s.status === 'loading' ? '⧖' : '↺'}
                  </button>
                  <span style={{ fontSize: 9, color: '#3a3428' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expanded body */}
              {isExpanded && (
                <div style={{ padding: '8px 0' }}>
                  {s.status === 'idle' && (
                    <div style={{ padding: '8px 12px', color: '#3a3428', fontSize: 10, letterSpacing: 1 }}>
                      — YENİLE BUTONUNA BAS —
                    </div>
                  )}

                  {s.status === 'loading' && (
                    <div style={{ padding: '8px 12px', color: '#c8a84b', fontSize: 10, letterSpacing: 1 }}>
                      ⧖ İSTEK GÖNDERİLİYOR...
                    </div>
                  )}

                  {s.status === 'error' && (
                    <div style={{
                      margin: '0 12px 8px',
                      padding: '6px 10px',
                      background: 'rgba(180,68,68,0.08)',
                      border: '1px solid #6e2828',
                      color: '#b84444', fontSize: 10, letterSpacing: 0.5,
                    }}>
                      ERR › {s.error}
                    </div>
                  )}

                  {jsonStr && (
                    <>
                      {/* Structured insight for specific endpoints */}
                      <EndpointInsight endpointKey={key} data={s.json} />

                      {/* Meta line */}
                      <div style={{
                        padding: '0 12px 6px',
                        display: 'flex', gap: 12, fontSize: 9, color: '#5a5040',
                      }}>
                        <span>{lineCount} SATIR</span>
                        <span>{jsonStr.length.toLocaleString()} KARAKTER</span>
                        {Array.isArray(s.json) && (
                          <span>{(s.json as unknown[]).length} ÖĞE</span>
                        )}
                        {s.json !== null && typeof s.json === 'object' && !Array.isArray(s.json) && (
                          <span>{Object.keys(s.json as Record<string, unknown>).join(' · ').toUpperCase()}</span>
                        )}
                      </div>

                      {/* JSON output */}
                      <pre style={{
                        margin: '0 12px',
                        padding: '10px',
                        background: '#080807',
                        border: '1px solid #1a1a18',
                        color: '#8a8070',
                        fontSize: 10,
                        lineHeight: 1.5,
                        overflowX: 'auto',
                        maxHeight: 500,
                        overflowY: 'auto',
                        whiteSpace: 'pre',
                      }}>
                        <JsonHighlight json={jsonStr} />
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: 1100, margin: '20px auto 0', padding: '0 16px',
        fontSize: 8, color: '#3a3428', letterSpacing: 1,
        borderTop: '1px solid #1a1a18', paddingTop: 10,
      }}>
        BİLGİLENDİRME AMAÇLIDIR · YATIRIM TAVSİYESİ DEĞİLDİR · BIST RADAR STUDIO DEBUG CONSOLE
      </div>
    </div>
  );
}

/** Structured insight panels for each endpoint type */
function EndpointInsight({ endpointKey, data }: { endpointKey: EndpointKey; data: unknown }) {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  const row = (label: string, value: React.ReactNode, color = '#8a8070') => (
    <div key={label} style={{ display: 'flex', gap: 8, padding: '1px 0' }}>
      <span style={{ color: '#5a5040', minWidth: 120, fontSize: 9 }}>{label}</span>
      <span style={{ color, fontSize: 9, fontWeight: 600 }}>{value}</span>
    </div>
  );

  const sourceColor = (src: string) =>
    src === 'live' || src.startsWith('live') ? '#4aac44' :
    src === 'partial' ? '#c8a84b' : '#7a6428';

  if (endpointKey === 'market') {
    const kpis = (d.kpis as Array<Record<string, unknown>>) ?? [];
    const srcLabel = (ds: string) =>
      ds === 'evds'           ? '● EVDS'          :
      ds === 'yahoo'          ? '● YF'             :
      ds === 'yahoo-fallback' ? '⚠ YF(fallback)'  :
      ds === 'none'           ? '○ kaynak yok'     : ds;
    const srcColor = (ds: string) =>
      ds === 'evds'           ? '#4aac44' :
      ds === 'yahoo'          ? '#4aac44' :
      ds === 'yahoo-fallback' ? '#c8a84b' : '#b84444';
    return (
      <div style={{ margin: '0 12px 8px', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a1a18' }}>
        <div style={{ fontSize: 8, color: '#c8a84b', letterSpacing: 1, marginBottom: 6 }}>MARKET KPI DURUMU</div>
        {kpis.map((k) => {
          const ds      = String(k.dataSource ?? 'none');
          const live    = Boolean(k.isLive);
          const errLine = k.errorReason ? `  ← ${k.errorReason}` : '';
          return row(
            String(k.label),
            `${k.value}  ${k.changeStr || ''}  ${srcLabel(ds)}${errLine}`,
            live ? srcColor(ds) : '#b84444',
          );
        })}
        <div style={{ borderTop: '1px solid #252520', marginTop: 4, paddingTop: 4 }}>
          {row('Genel kaynak', String(d.source ?? '—'), sourceColor(String(d.source ?? '')))}
          {row('Canlı / Toplam', `${d.liveCount} / ${d.total}`)}
          {row('Son güncelleme', String(d.lastFetch ?? '—'))}
        </div>
      </div>
    );
  }

  if (endpointKey === 'stocks') {
    return (
      <div style={{ margin: '0 12px 8px', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a1a18' }}>
        <div style={{ fontSize: 8, color: '#c8a84b', letterSpacing: 1, marginBottom: 6 }}>YAHOO FINANCE DURUMU</div>
        {row('Source', String(d.source ?? '—'), sourceColor(String(d.source ?? '')))}
        {row('Live / Total', `${d.liveCount ?? '?'} / ${d.totalCount ?? '?'}`)}
        {(() => {
          const stocks = (d.stocks as Array<Record<string, unknown>>) ?? [];
          return stocks.slice(0, 5).map((s) =>
            row(String(s.symbol ?? ''), `${s.price}  ${s.changePercent}%`),
          );
        })()}
      </div>
    );
  }

  if (endpointKey === 'news') {
    const feeds = (d.feedStatus as Array<Record<string, unknown>>) ?? [];
    return (
      <div style={{ margin: '0 12px 8px', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a1a18' }}>
        <div style={{ fontSize: 8, color: '#c8a84b', letterSpacing: 1, marginBottom: 6 }}>RSS FEED DURUMU</div>
        {row('Source', String(d.source ?? '—'), sourceColor(String(d.source ?? '')))}
        {row('Items', String((d.items as unknown[])?.length ?? 0))}
        {feeds.map((f) => row(
          String(f.source ?? ''),
          `${f.status === 'ok' ? '● OK' : '○ ERR'}  ${f.count ?? 0} haber  ${f.error ? `· ${f.error}` : ''}`,
          f.status === 'ok' ? '#4aac44' : '#b84444',
        ))}
      </div>
    );
  }

  if (endpointKey === 'kap') {
    const strategies = (d.strategies as Array<Record<string, unknown>>) ?? [];
    return (
      <div style={{ margin: '0 12px 8px', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a1a18' }}>
        <div style={{ fontSize: 8, color: '#c8a84b', letterSpacing: 1, marginBottom: 6 }}>KAP STRATEJİ DURUMU</div>
        {row('Source', String(d.source ?? '—'), sourceColor(String(d.source ?? '')))}
        {row('Bildirim', String((d.disclosures as unknown[])?.length ?? 0))}
        {strategies.map((s) => row(
          String(s.strategy ?? ''),
          `${s.success ? '● OK' : '○ FAIL'}  ${s.itemCount ?? 0} item  ${s.durationMs ?? 0}ms  ${s.error ? `· ${s.error}` : ''}`,
          s.success ? '#4aac44' : '#b84444',
        ))}
      </div>
    );
  }

  if (endpointKey === 'tcmb') {
    const inds = (d.indicators as Array<Record<string, unknown>>) ?? [];
    return (
      <div style={{ margin: '0 12px 8px', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a1a18' }}>
        <div style={{ fontSize: 8, color: '#c8a84b', letterSpacing: 1, marginBottom: 6 }}>EVDS GÖSTERGE DURUMU</div>
        {row('Source', String(d.source ?? '—'), sourceColor(String(d.source ?? '')))}
        {row('Live / Total', `${d.liveCount ?? 0} / ${inds.length}`)}
        {inds.map((ind) => row(
          String(ind.label ?? ind.key ?? ''),
          `${ind.value} ${ind.unit}  (${ind.date})`,
        ))}
      </div>
    );
  }

  if (endpointKey === 'health') {
    const sources = (d.sources as Array<Record<string, unknown>>) ?? [];
    return (
      <div style={{ margin: '0 12px 8px', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a1a18' }}>
        <div style={{ fontSize: 8, color: '#c8a84b', letterSpacing: 1, marginBottom: 6 }}>KAYNAK SAĞLIK RAPORU</div>
        {row('Overall', String(d.overall ?? '—'), sourceColor(String(d.overall ?? '')))}
        {row('Reachable', `${d.reachable} / ${d.total}`)}
        {sources.map((s) => row(
          String(s.key ?? ''),
          `${s.status === 'reachable' ? '● AÇIK' : s.status === 'blocked' ? '⊘ BLOK' : '○ HATA'}  ${s.url ?? ''}`,
          s.status === 'reachable' ? '#4aac44' : s.status === 'blocked' ? '#c8a84b' : '#b84444',
        ))}
      </div>
    );
  }

  return null;
}

/** Minimal JSON syntax highlighter — pure inline spans, no deps */
function JsonHighlight({ json }: { json: string }) {
  const parts: React.ReactNode[] = [];
  // Tokenize with a single regex pass
  const TOKEN = /("(?:[^"\\]|\\.)*")\s*(:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(json)) !== null) {
    if (m.index > last) {
      parts.push(json.slice(last, m.index));
    }

    if (m[1]) {
      // string — check if it's a key (followed by colon) or value
      if (m[2]) {
        // object key
        parts.push(<span key={m.index} style={{ color: '#c8a84b' }}>{m[1]}</span>);
        parts.push(':');
      } else {
        // string value
        parts.push(<span key={m.index} style={{ color: '#4aac44' }}>{m[1]}</span>);
      }
    } else if (m[3]) {
      // keyword
      parts.push(<span key={m.index} style={{ color: m[3] === 'null' ? '#5a5040' : '#e8c86b' }}>{m[3]}</span>);
    } else if (m[4]) {
      // number
      parts.push(<span key={m.index} style={{ color: '#a8c8e8' }}>{m[4]}</span>);
    } else if (m[5]) {
      // punctuation
      parts.push(<span key={m.index} style={{ color: '#444438' }}>{m[5]}</span>);
    }

    last = TOKEN.lastIndex;
  }

  if (last < json.length) parts.push(json.slice(last));

  return <>{parts}</>;
}
