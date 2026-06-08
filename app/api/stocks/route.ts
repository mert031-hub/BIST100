import { NextResponse } from 'next/server';
import { MOCK_STOCKS } from '@/data/mock/stocks';
import type { Stock } from '@/types/stock';
import { withTimeout } from '@/lib/fetch-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Per-symbol quota timeout (ms). Short so blocked envs fail fast. */
const QUOTE_TIMEOUT = 5000;

function cleanShortName(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  return raw
    .replace(/\s+A\.?[ŞS]\.?$/i, '')
    .replace(/\s+ANONIM.?SIRKETI$/i, '')
    .replace(/ SA$/i, '')
    .trim() || fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuote = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchQuote(yf: any, mock: Stock): Promise<{ stock: Stock; live: boolean }> {
  try {
    const q = (await withTimeout(yf.quote(mock.symbol), QUOTE_TIMEOUT)) as AnyQuote;

    if (!q || typeof q['regularMarketPrice'] !== 'number') {
      return { stock: { ...mock, lastUpdated: new Date().toISOString() }, live: false };
    }

    return {
      live: true,
      stock: {
        ...mock,
        shortName: cleanShortName(q['shortName'] as string | undefined, mock.shortName),
        price:         q['regularMarketPrice']         as number,
        change:        (q['regularMarketChange']        as number | undefined) ?? mock.change,
        changePercent: (q['regularMarketChangePercent'] as number | undefined) ?? mock.changePercent,
        volume:        (q['regularMarketVolume']        as number | undefined) ?? mock.volume,
        high:          (q['regularMarketDayHigh']       as number | undefined) ?? mock.high,
        low:           (q['regularMarketDayLow']        as number | undefined) ?? mock.low,
        marketCap:     (q['marketCap']                  as number | undefined) ?? mock.marketCap,
        lastUpdated: new Date().toISOString(),
      },
    };
  } catch {
    return { stock: { ...mock, lastUpdated: new Date().toISOString() }, live: false };
  }
}

export async function GET() {
  try {
    // yahoo-finance2 v3 requires explicit instantiation
    const { default: YahooFinance } = await import('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

    const results = await Promise.all(MOCK_STOCKS.map((mock) => fetchQuote(yf, mock)));

    const stocks = results.map((r) => r.stock);
    const liveCount = results.filter((r) => r.live).length;
    const source =
      liveCount === MOCK_STOCKS.length ? 'live' :
      liveCount > 0 ? 'partial' : 'mock';

    return NextResponse.json({
      stocks,
      source,
      liveCount,
      totalCount: MOCK_STOCKS.length,
      lastFetch: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      stocks: MOCK_STOCKS.map((s) => ({ ...s, lastUpdated: new Date().toISOString() })),
      source: 'mock',
      liveCount: 0,
      totalCount: MOCK_STOCKS.length,
      lastFetch: new Date().toISOString(),
    });
  }
}
