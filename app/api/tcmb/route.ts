import { NextResponse } from 'next/server';
import { MOCK_TCMB } from '@/data/mock/tcmb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// TCMB EVDS API - requires key for full data, using exchange rate endpoint as fallback
const EVDS_EXCHANGE_URL = 'https://evds2.tcmb.gov.tr/service/evds/series=TP.DK.USD.A.YTL,TP.DK.EUR.A.YTL&type=json&startDate=01-01-2024&endDate=31-12-2024';

export async function GET() {
  try {
    // Try to get exchange rate data
    const res = await fetch(EVDS_EXCHANGE_URL, {
      headers: { 'key': process.env.EVDS_API_KEY ?? '' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error('EVDS unavailable');

    const data = await res.json();
    const items = data?.items ?? [];
    const latest = items[items.length - 1];

    if (!latest) throw new Error('No data');

    const indicators = MOCK_TCMB.map((ind) => {
      if (ind.key === 'usd_try' && latest['TP.DK.USD.A.YTL']) {
        return { ...ind, value: parseFloat(latest['TP.DK.USD.A.YTL']), date: latest.Tarih };
      }
      if (ind.key === 'eur_try' && latest['TP.DK.EUR.A.YTL']) {
        return { ...ind, value: parseFloat(latest['TP.DK.EUR.A.YTL']), date: latest.Tarih };
      }
      return ind;
    });

    return NextResponse.json({ indicators, source: 'live', lastFetch: new Date().toISOString() });
  } catch {
    return NextResponse.json({
      indicators: MOCK_TCMB,
      source: 'mock',
      lastFetch: new Date().toISOString(),
    });
  }
}
