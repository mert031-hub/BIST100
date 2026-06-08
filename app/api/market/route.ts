import { NextResponse } from 'next/server';
import { withTimeout } from '@/lib/fetch-helpers';
import { makeRouteCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CACHE_TTL = 60_000;

export interface MarketKpi {
  key: string;
  label: string;
  value: string;
  changeStr: string;
  up: boolean;
  isLive: boolean;
  /** Shown inline in TopBar when isLive=false */
  errorReason?: string;
  /** Actual data source used — for debug */
  dataSource?: 'evds' | 'yahoo' | 'yahoo-fallback' | 'none';
}

interface MarketResponse {
  kpis: MarketKpi[];
  source: 'live' | 'partial' | 'none';
  liveCount: number;
  total: number;
  lastFetch: string;
}

type QuoteOk  = { value: string; changeStr: string; up: boolean };
type QuoteErr = { error: string };
type QuoteResult = QuoteOk | QuoteErr;

const cache = makeRouteCache<MarketResponse>(CACHE_TTL);

// ─── EVDS helpers ──────────────────────────────────────────────────────────────

const EVDS_BASE = 'https://evds2.tcmb.gov.tr/service/evds';
const EVDS_FMT  = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

async function evdsSeries(series: string, apiKey: string, days = 10): Promise<Record<string, string>[]> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - days);
  const url =
    `${EVDS_BASE}/series=${series}&type=json` +
    `&startDate=${EVDS_FMT(start)}&endDate=${EVDS_FMT(today)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(7000),
    headers: { key: apiKey },
  });
  if (!res.ok) throw new Error(`EVDS HTTP ${res.status}`);
  const data = await res.json();
  return (data?.items ?? []) as Record<string, string>[];
}

/** Fetch USD/TRY or EUR/TRY from EVDS. Returns last value + day-over-day change. */
async function fetchCurrencyEvds(series: string, apiKey: string, decimals = 4): Promise<QuoteResult> {
  if (!apiKey) return { error: 'EVDS API KEY YOK' };
  try {
    const items = await evdsSeries(series, apiKey, 10);
    const vals: number[] = [];
    for (let i = items.length - 1; i >= 0 && vals.length < 2; i--) {
      const raw = items[i][series];
      if (raw && raw !== '' && raw !== 'ND') {
        const n = parseFloat(raw);
        if (!isNaN(n)) vals.push(n);
      }
    }
    if (vals.length === 0) return { error: 'EVDS VERİ BOŞ' };
    const current  = vals[0];
    const previous = vals[1] ?? current;
    const changePct = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    return {
      value:     current.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
      changeStr: (changePct >= 0 ? '▲ ' : '▼ ') + Math.abs(changePct).toFixed(2) + '%',
      up:        changePct >= 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('EVDS HTTP')) return { error: msg };
    if (msg.includes('timeout') || msg.includes('abort')) return { error: 'EVDS ZAMAN AŞIMI' };
    return { error: 'EVDS ERİŞİM HATASI' };
  }
}

/** Fetch policy rate from EVDS. */
async function fetchFaizEvds(apiKey: string): Promise<QuoteResult> {
  if (!apiKey) return { error: 'EVDS API KEY YOK' };
  try {
    const items = await evdsSeries('TP.TG2.Y09', apiKey, 30);
    for (let i = items.length - 1; i >= 0; i--) {
      const raw = items[i]['TP.TG2.Y09'];
      if (raw && raw !== '' && raw !== 'ND') {
        const val = parseFloat(raw);
        if (!isNaN(val)) {
          return {
            value:     '%' + val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            changeStr: '',
            up:        false,
          };
        }
      }
    }
    return { error: 'EVDS VERİ BOŞ' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('timeout') || msg.includes('abort')) return { error: 'EVDS ZAMAN AŞIMI' };
    return { error: 'EVDS ERİŞİM HATASI' };
  }
}

// ─── Yahoo Finance helpers ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchYahooQuote(yf: any, symbol: string, decimals: number): Promise<QuoteResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (await withTimeout(yf.quote(symbol), 6000)) as Record<string, any>;
    if (!q || typeof q['regularMarketPrice'] !== 'number') return { error: 'YAHOO VERİ BOŞ' };
    const price     = q['regularMarketPrice']    as number;
    const changePct = (q['regularMarketChangePercent'] as number | undefined) ?? 0;
    return {
      value:     decimals === 0
        ? price.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      changeStr: (changePct >= 0 ? '▲ ' : '▼ ') + Math.abs(changePct).toFixed(2) + '%',
      up:        changePct >= 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('timeout') || msg.includes('abort')) return { error: 'YAHOO ZAMAN AŞIMI' };
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) return { error: 'YAHOO BAĞLANTI HATASI' };
    return { error: 'YAHOO ERİŞİM HATASI' };
  }
}

// ─── KPI builder helper ────────────────────────────────────────────────────────

function makeKpi(
  key: string, label: string, result: QuoteResult,
  dataSource: MarketKpi['dataSource'],
): MarketKpi {
  if ('error' in result) {
    return { key, label, value: '—', changeStr: '', up: true, isLive: false, errorReason: result.error, dataSource: 'none' };
  }
  return { key, label, value: result.value, changeStr: result.changeStr, up: result.up, isLive: true, dataSource };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const cached = cache.get();
  if (cached) return NextResponse.json(cached);

  const evdsKey = process.env.EVDS_API_KEY ?? '';

  // USD/TRY and EUR/TRY: EVDS primary, Yahoo fallback
  // BIST100 and Brent: Yahoo only
  // Policy rate: EVDS only
  // All fetch in parallel
  let yf: unknown = null;
  try {
    const { default: YahooFinance } = await import('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yf = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
  } catch {
    // Yahoo Finance module unavailable — proceed without it
  }

  const noYahoo: QuoteResult = { error: 'YAHOO MODÜL HATASI' };

  const [
    bist100Res,
    usdTryEvdsRes,
    eurTryEvdsRes,
    brentRes,
    faizRes,
  ] = await Promise.all([
    yf ? fetchYahooQuote(yf, '^XU100',   0) : Promise.resolve(noYahoo),
    fetchCurrencyEvds('TP.DK.USD.A.YTL', evdsKey, 4),
    fetchCurrencyEvds('TP.DK.EUR.A.YTL', evdsKey, 4),
    yf ? fetchYahooQuote(yf, 'BZ=F',     2) : Promise.resolve(noYahoo),
    fetchFaizEvds(evdsKey),
  ]);

  // For currencies: if EVDS failed (not "API KEY YOK"), try Yahoo as fallback
  async function withYahooFallback(
    evdsResult: QuoteResult,
    symbol: string,
    decimals: number,
  ): Promise<{ result: QuoteResult; source: MarketKpi['dataSource'] }> {
    if (!('error' in evdsResult)) return { result: evdsResult, source: 'evds' };
    // Don't fall back if key is simply missing — that's a config issue, not a transient error
    if (evdsResult.error === 'EVDS API KEY YOK') return { result: evdsResult, source: 'none' };
    if (!yf) return { result: evdsResult, source: 'none' };
    const fallback = await fetchYahooQuote(yf, symbol, decimals);
    if (!('error' in fallback)) return { result: fallback, source: 'yahoo-fallback' };
    // Both failed — return combined error
    return { result: { error: `EVDS: ${evdsResult.error} · YF: ${fallback.error}` }, source: 'none' };
  }

  const [usdTry, eurTry] = await Promise.all([
    withYahooFallback(usdTryEvdsRes, 'USDTRY=X', 4),
    withYahooFallback(eurTryEvdsRes, 'EURTRY=X', 4),
  ]);

  const kpis: MarketKpi[] = [
    makeKpi('bist100', 'BIST100',   bist100Res,    yf ? 'yahoo' : 'none'),
    makeKpi('usd_try', 'USD/TRY',   usdTry.result, usdTry.source),
    makeKpi('eur_try', 'EUR/TRY',   eurTry.result, eurTry.source),
    makeKpi('brent',   'Brent',     brentRes,      yf ? 'yahoo' : 'none'),
    makeKpi('faiz',    'TCMB Faiz', faizRes,       evdsKey ? 'evds' : 'none'),
  ];

  const liveCount = kpis.filter((k) => k.isLive).length;
  const source: MarketResponse['source'] =
    liveCount === kpis.length ? 'live' : liveCount > 0 ? 'partial' : 'none';

  const response: MarketResponse = {
    kpis, source, liveCount,
    total: kpis.length,
    lastFetch: new Date().toISOString(),
  };
  cache.set(response);
  return NextResponse.json(response);
}
