import { NextResponse } from 'next/server';
import { MOCK_TCMB } from '@/data/mock/tcmb';
import type { TcmbIndicator } from '@/types/tcmb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * TCMB EVDS (Electronic Data Delivery System) API.
 * Requires an API key from https://evds2.tcmb.gov.tr
 * Set EVDS_API_KEY in your environment to enable live data.
 *
 * Series used:
 *   TP.DK.USD.A.YTL  → USD/TRY (daily)
 *   TP.DK.EUR.A.YTL  → EUR/TRY (daily)
 */
const EVDS_BASE = 'https://evds2.tcmb.gov.tr/service/evds';
const EVDS_KEY = process.env.EVDS_API_KEY ?? '';

async function fetchEvdsExchangeRates(): Promise<Partial<Record<string, number>>> {
  if (!EVDS_KEY) throw new Error('EVDS_API_KEY not set');

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 7); // last 7 days in case of weekends/holidays

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

  const url =
    `${EVDS_BASE}/series=TP.DK.USD.A.YTL,TP.DK.EUR.A.YTL` +
    `&type=json&startDate=${fmt(start)}&endDate=${fmt(today)}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { key: EVDS_KEY },
  });

  if (!res.ok) throw new Error(`EVDS HTTP ${res.status}`);

  const data = await res.json();
  const items: Record<string, string>[] = data?.items ?? [];
  if (items.length === 0) throw new Error('EVDS: no data items');

  // Take the most recent non-null entry for each series
  const rates: Record<string, number> = {};
  for (let i = items.length - 1; i >= 0; i--) {
    const row = items[i];
    if (!rates['usd'] && row['TP.DK.USD.A.YTL'] && row['TP.DK.USD.A.YTL'] !== '') {
      rates['usd'] = parseFloat(row['TP.DK.USD.A.YTL']);
    }
    if (!rates['eur'] && row['TP.DK.EUR.A.YTL'] && row['TP.DK.EUR.A.YTL'] !== '') {
      rates['eur'] = parseFloat(row['TP.DK.EUR.A.YTL']);
    }
    if (rates['usd'] && rates['eur']) break;
  }

  return rates;
}

export async function GET() {
  let indicators: TcmbIndicator[] = MOCK_TCMB.map((i) => ({ ...i }));
  let source: 'live' | 'partial' | 'mock' = 'mock';

  try {
    const rates = await fetchEvdsExchangeRates();
    let updated = 0;

    indicators = indicators.map((ind) => {
      if (ind.key === 'usd_try' && rates['usd']) {
        const old = ind.value as number;
        updated++;
        return { ...ind, value: rates['usd'], change: +(rates['usd'] - old).toFixed(4) };
      }
      if (ind.key === 'eur_try' && rates['eur']) {
        const old = ind.value as number;
        updated++;
        return { ...ind, value: rates['eur'], change: +(rates['eur'] - old).toFixed(4) };
      }
      return ind;
    });

    source = updated > 0 ? 'partial' : 'mock';
  } catch {
    // EVDS key missing or request failed — use full mock
  }

  return NextResponse.json({ indicators, source, lastFetch: new Date().toISOString() });
}
