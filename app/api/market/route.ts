import { NextResponse } from 'next/server';
import { withTimeout } from '@/lib/fetch-helpers';
import { makeRouteCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** TopBar KPI data — fetched every 60s client-side, cached 60s server-side */
const CACHE_TTL = 60_000;

export interface MarketKpi {
  key: string;
  label: string;
  value: string;
  changeStr: string;
  up: boolean;
  isLive: boolean;
  /** Set when isLive=false — shown inline in TopBar */
  errorReason?: string;
}

interface MarketResponse {
  kpis: MarketKpi[];
  source: 'live' | 'partial' | 'mock';
  liveCount: number;
  total: number;
  lastFetch: string;
}

const cache = makeRouteCache<MarketResponse>(CACHE_TTL);

const MARKET_SYMBOLS = [
  { symbol: '^XU100',   key: 'bist100', label: 'BIST100',   decimals: 0 },
  { symbol: 'USDTRY=X', key: 'usd_try', label: 'USD/TRY',  decimals: 2 },
  { symbol: 'EURTRY=X', key: 'eur_try', label: 'EUR/TRY',  decimals: 2 },
  { symbol: 'BZ=F',     key: 'brent',   label: 'Brent',    decimals: 2 },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchQuote(yf: any, symbol: string, decimals: number): Promise<
  | { value: string; changeStr: string; up: boolean; error?: undefined }
  | { value?: undefined; error: string }
> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (await withTimeout(yf.quote(symbol), 6000)) as Record<string, any>;
    if (!q || typeof q['regularMarketPrice'] !== 'number') {
      return { error: 'VERİ BOŞ' };
    }
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
    if (msg.includes('timeout') || msg.includes('abort')) return { error: 'ZAMAN AŞIMI' };
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) return { error: 'BAĞLANTI HATASI' };
    return { error: 'YAHOO ERİŞİM HATASI' };
  }
}

async function fetchFaizEvds(): Promise<number | null> {
  const apiKey = process.env.EVDS_API_KEY ?? '';
  if (!apiKey) return null;

  try {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

    const url = `https://evds2.tcmb.gov.tr/service/evds/series=TP.TG2.Y09&type=json&startDate=${fmt(start)}&endDate=${fmt(today)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { key: apiKey },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const items: Record<string, string>[] = data?.items ?? [];
    for (let i = items.length - 1; i >= 0; i--) {
      const v = items[i]['TP.TG2.Y09'];
      if (v && v !== '') return parseFloat(v);
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const cached = cache.get();
  if (cached) return NextResponse.json(cached);

  try {
    const { default: YahooFinance } = await import('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

    const [quoteResults, faizVal] = await Promise.all([
      Promise.all(MARKET_SYMBOLS.map((s) => fetchQuote(yf, s.symbol, s.decimals))),
      fetchFaizEvds(),
    ]);

    let liveCount = 0;
    const kpis: MarketKpi[] = MARKET_SYMBOLS.map((s, i) => {
      const q = quoteResults[i];
      const live = q !== null && q !== undefined && !('error' in q && q.error);
      if (live) liveCount++;
      const kpi: MarketKpi = {
        key:       s.key,
        label:     s.label,
        value:     live && q && 'value' in q ? q.value! : '—',
        changeStr: live && q && 'changeStr' in q ? (q.changeStr as string) : '',
        up:        live && q && 'up' in q ? (q.up as boolean) : true,
        isLive:    live,
      };
      if (!live && q && 'error' in q) kpi.errorReason = q.error as string;
      return kpi;
    });

    // Politika Faizi (TCMB EVDS or mock fallback)
    const faizLive = faizVal !== null;
    if (faizLive) liveCount++;
    kpis.push({
      key:         'faiz',
      label:       'TCMB Faiz',
      value:       faizLive
        ? '%' + faizVal!.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '%50,00',
      changeStr:   '',
      up:          false,
      isLive:      faizLive,
      errorReason: faizLive ? undefined : (process.env.EVDS_API_KEY ? 'EVDS ERİŞİM HATASI' : 'API KEY YOK'),
    });

    const total  = MARKET_SYMBOLS.length + 1;
    const source: MarketResponse['source'] =
      liveCount === total ? 'live' : liveCount > 0 ? 'partial' : 'mock';

    const response: MarketResponse = {
      kpis, source, liveCount, total,
      lastFetch: new Date().toISOString(),
    };
    cache.set(response);
    return NextResponse.json(response);

  } catch (e) {
    const reason = e instanceof Error ? e.message.slice(0, 40) : 'YF MODÜL HATASI';
    const fallback: MarketResponse = {
      kpis: [
        { key: 'bist100', label: 'BIST100',   value: '—',      changeStr: '', up: true,  isLive: false, errorReason: reason },
        { key: 'usd_try', label: 'USD/TRY',   value: '—',      changeStr: '', up: true,  isLive: false, errorReason: reason },
        { key: 'eur_try', label: 'EUR/TRY',   value: '—',      changeStr: '', up: true,  isLive: false, errorReason: reason },
        { key: 'brent',   label: 'Brent',     value: '—',      changeStr: '', up: true,  isLive: false, errorReason: reason },
        { key: 'faiz',    label: 'TCMB Faiz', value: '%50,00', changeStr: '', up: false, isLive: false, errorReason: process.env.EVDS_API_KEY ? 'EVDS ERİŞİM HATASI' : 'API KEY YOK' },
      ],
      source:    'mock',
      liveCount: 0,
      total:     5,
      lastFetch: new Date().toISOString(),
    };
    cache.set(fallback);
    return NextResponse.json(fallback);
  }
}
