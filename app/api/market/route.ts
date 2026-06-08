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
async function fetchQuote(yf: any, symbol: string, decimals: number) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (await withTimeout(yf.quote(symbol), 6000)) as Record<string, any>;
    if (!q || typeof q['regularMarketPrice'] !== 'number') return null;

    const price    = q['regularMarketPrice']    as number;
    const changePct = (q['regularMarketChangePercent'] as number | undefined) ?? 0;

    return {
      value:     decimals === 0
        ? price.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      changeStr: (changePct >= 0 ? '▲ ' : '▼ ') + Math.abs(changePct).toFixed(2) + '%',
      up:        changePct >= 0,
    };
  } catch {
    return null;
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
      if (q) liveCount++;
      return {
        key:       s.key,
        label:     s.label,
        value:     q?.value     ?? '—',
        changeStr: q?.changeStr ?? '',
        up:        q?.up        ?? true,
        isLive:    q !== null,
      };
    });

    // Politika Faizi (TCMB EVDS or mock fallback)
    const faizLive = faizVal !== null;
    if (faizLive) liveCount++;
    kpis.push({
      key:       'faiz',
      label:     'TCMB Faiz',
      value:     faizLive
        ? '%' + faizVal!.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '%50,00',
      changeStr: '',
      up:        false,
      isLive:    faizLive,
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

  } catch {
    const fallback: MarketResponse = {
      kpis: [
        { key: 'bist100', label: 'BIST100',   value: '—',      changeStr: '', up: true,  isLive: false },
        { key: 'usd_try', label: 'USD/TRY',   value: '—',      changeStr: '', up: true,  isLive: false },
        { key: 'eur_try', label: 'EUR/TRY',   value: '—',      changeStr: '', up: true,  isLive: false },
        { key: 'brent',   label: 'Brent',     value: '—',      changeStr: '', up: true,  isLive: false },
        { key: 'faiz',    label: 'TCMB Faiz', value: '%50,00', changeStr: '', up: false, isLive: false },
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
