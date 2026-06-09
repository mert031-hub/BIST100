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
  dataSource?: 'evds' | 'alpha-vantage' | 'fred' | 'yahoo' | 'yahoo-fallback' | 'none';
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

// ─── EVDS ──────────────────────────────────────────────────────────────────────

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
    headers: { key: apiKey.trim() },
  });
  if (!res.ok) throw new Error(`EVDS HTTP ${res.status}`);
  // EVDS returns HTML when key is invalid/expired (redirects to login page)
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('text/html')) {
    const preview = (await res.text()).slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(`EVDS HTML yanıtı (key geçersiz/süresi dolmuş?): ${preview}`);
  }
  const data = await res.json();
  return (data?.items ?? []) as Record<string, string>[];
}

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

// ─── Alpha Vantage ─────────────────────────────────────────────────────────────

async function fetchCurrencyAlphaVantage(
  fromCurrency: string,
  toCurrency: string,
  apiKey: string,
  decimals = 4,
): Promise<QuoteResult> {
  if (!apiKey) return { error: 'ALPHA VANTAGE API KEY YOK' };
  try {
    const url =
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE` +
      `&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`AV HTTP ${res.status}`);
    const data = await res.json();

    if (data?.Note) return { error: 'AV LİMİT: ' + String(data.Note).slice(0, 80) };
    if (data?.Information) {
      const info = String(data.Information);
      // Information can mean rate-limit OR invalid key — show actual message
      return { error: 'AV: ' + info.slice(0, 100) };
    }

    const rate = data?.['Realtime Currency Exchange Rate'];
    if (!rate) return { error: 'AV VERİ BOŞ' };

    const price = parseFloat(rate['5. Exchange Rate'] ?? '');
    if (isNaN(price)) return { error: 'AV VERİ GEÇERSİZ' };

    return {
      value:     price.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
      changeStr: '',
      up:        true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('AV HTTP')) return { error: msg };
    if (msg.includes('timeout') || msg.includes('abort')) return { error: 'AV ZAMAN AŞIMI' };
    return { error: 'AV ERİŞİM HATASI' };
  }
}

// ─── FRED (St. Louis Fed) ──────────────────────────────────────────────────────

async function fetchBrentFred(apiKey: string): Promise<QuoteResult> {
  if (!apiKey) return { error: 'FRED API KEY YOK' };
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=DCOILBRENTEU&api_key=${apiKey.trim()}&file_type=json&limit=3&sort_order=desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`FRED HTTP ${res.status}`);
    const data = await res.json();
    if (data?.error_message) return { error: `FRED: ${String(data.error_message).slice(0, 80)}` };

    const obs: Array<{ date: string; value: string }> = data?.observations ?? [];
    // FRED uses "." for missing observations — filter them out
    const valid = obs.filter((o) => o.value && o.value !== '.');
    if (valid.length === 0) return { error: 'FRED VERİ BOŞ' };

    const current  = parseFloat(valid[0].value);
    const previous = valid.length > 1 ? parseFloat(valid[1].value) : current;
    if (isNaN(current)) return { error: 'FRED VERİ GEÇERSİZ' };

    const changePct = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    return {
      value:     current.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      changeStr: (changePct >= 0 ? '▲ ' : '▼ ') + Math.abs(changePct).toFixed(2) + '%',
      up:        changePct >= 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('FRED HTTP')) return { error: msg };
    if (msg.includes('timeout') || msg.includes('abort')) return { error: 'FRED ZAMAN AŞIMI' };
    return { error: 'FRED ERİŞİM HATASI' };
  }
}

// ─── Yahoo Finance ─────────────────────────────────────────────────────────────

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

// ─── KPI builder ───────────────────────────────────────────────────────────────

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
  const avKey   = process.env.ALPHA_VANTAGE_API_KEY ?? '';
  const fredKey = process.env.FRED_API_KEY ?? '';

  let yf: unknown = null;
  try {
    const { default: YahooFinance } = await import('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yf = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
  } catch {
    // Yahoo Finance unavailable — proceed without it
  }

  const noYahoo: QuoteResult = { error: 'YAHOO MODÜL HATASI' };

  // Fetch all sources concurrently
  const [bist100Res, usdTryEvdsRes, eurTryEvdsRes, brentFredRes, brentYahooRes, faizRes] = await Promise.all([
    yf ? fetchYahooQuote(yf, '^XU100', 0) : Promise.resolve(noYahoo),
    fetchCurrencyEvds('TP.DK.USD.A.YTL', evdsKey, 4),
    fetchCurrencyEvds('TP.DK.EUR.A.YTL', evdsKey, 4),
    fetchBrentFred(fredKey),
    yf ? fetchYahooQuote(yf, 'BZ=F', 2)  : Promise.resolve(noYahoo),
    fetchFaizEvds(evdsKey),
  ]);

  // USD/TRY, EUR/TRY: EVDS → Alpha Vantage → Veri Yok (no Yahoo — unreliable for TRY pairs)
  async function withCurrencyFallbacks(
    evdsResult: QuoteResult,
    avFrom: string,
    avTo: string,
    decimals: number,
  ): Promise<{ result: QuoteResult; source: MarketKpi['dataSource'] }> {
    if (!('error' in evdsResult)) return { result: evdsResult, source: 'evds' };
    if (avKey) {
      const avResult = await fetchCurrencyAlphaVantage(avFrom, avTo, avKey, decimals);
      if (!('error' in avResult)) return { result: avResult, source: 'alpha-vantage' };
      return { result: { error: `EVDS: ${evdsResult.error} · AV: ${avResult.error}` }, source: 'none' };
    }
    return { result: { error: `EVDS: ${evdsResult.error} · AV KEY YOK` }, source: 'none' };
  }

  const [usdTry, eurTry] = await Promise.all([
    withCurrencyFallbacks(usdTryEvdsRes, 'USD', 'TRY', 4),
    withCurrencyFallbacks(eurTryEvdsRes, 'EUR', 'TRY', 4),
  ]);

  // Brent: FRED → Yahoo → Veri Yok
  const brent: { result: QuoteResult; source: MarketKpi['dataSource'] } =
    !('error' in brentFredRes)  ? { result: brentFredRes,  source: 'fred'  } :
    !('error' in brentYahooRes) ? { result: brentYahooRes, source: 'yahoo' } :
    { result: { error: `FRED: ${brentFredRes.error} · YAHOO: ${brentYahooRes.error}` }, source: 'none' };

  const kpis: MarketKpi[] = [
    makeKpi('bist100', 'BIST100',   bist100Res,    yf ? 'yahoo' : 'none'),
    makeKpi('usd_try', 'USD/TRY',   usdTry.result, usdTry.source),
    makeKpi('eur_try', 'EUR/TRY',   eurTry.result, eurTry.source),
    makeKpi('brent',   'Brent',     brent.result,  brent.source),
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
