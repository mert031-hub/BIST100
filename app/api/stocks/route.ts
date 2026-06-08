import { NextResponse } from 'next/server';
import { MOCK_STOCKS } from '@/data/mock/stocks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const yahooFinance = (await import('yahoo-finance2')).default;
    const symbols = MOCK_STOCKS.map((s) => s.symbol);

    const quotes = await Promise.allSettled(
      symbols.map((symbol) => yahooFinance.quote(symbol))
    );

    const stocks = quotes.map((result, idx) => {
      const mock = MOCK_STOCKS[idx];
      if (result.status === 'fulfilled' && result.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = result.value as any;
        return {
          symbol: q.symbol ?? mock.symbol,
          shortName: (q.shortName ?? mock.shortName).replace('.IS', '').replace(' SA', ''),
          price: q.regularMarketPrice ?? mock.price,
          change: q.regularMarketChange ?? mock.change,
          changePercent: q.regularMarketChangePercent ?? mock.changePercent,
          volume: q.regularMarketVolume ?? mock.volume,
          sparkline: mock.sparkline,
          lastUpdated: new Date().toISOString(),
          high: q.regularMarketDayHigh ?? mock.high,
          low: q.regularMarketDayLow ?? mock.low,
          marketCap: q.marketCap ?? mock.marketCap,
        };
      }
      return { ...mock, lastUpdated: new Date().toISOString() };
    });

    return NextResponse.json({ stocks, source: 'live', lastFetch: new Date().toISOString() });
  } catch {
    return NextResponse.json({
      stocks: MOCK_STOCKS.map((s) => ({ ...s, lastUpdated: new Date().toISOString() })),
      source: 'mock',
      lastFetch: new Date().toISOString(),
    });
  }
}
