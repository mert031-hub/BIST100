import { NextResponse } from 'next/server';
import { MOCK_TCMB } from '@/data/mock/tcmb';
import type { TcmbIndicator } from '@/types/tcmb';
import { makeRouteCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TCMB_CACHE_TTL = 3_600_000; // 1 hour — TCMB data is monthly/infrequent

interface TcmbResponse {
  indicators: TcmbIndicator[];
  source: 'live' | 'partial' | 'mock';
  liveCount: number;
  lastFetch: string;
}
const cache = makeRouteCache<TcmbResponse>(TCMB_CACHE_TTL);

/**
 * TCMB EVDS (Electronic Data Delivery System) API.
 * Requires an API key from https://evds2.tcmb.gov.tr
 * Set EVDS_API_KEY in your environment to enable live data.
 *
 * Series used (verify codes at evds2.tcmb.gov.tr/home.do):
 *   TP.DK.USD.A.YTL  → USD/TRY daily
 *   TP.DK.EUR.A.YTL  → EUR/TRY daily
 *   TP.TG2.Y09       → Politika Faizi — 1 Haftalık Repo Faizi (%)
 *   TP.FG.J0         → TÜFE Yıllık Değişim (%)
 *   TP.FE.OKTG01     → ÜFE Yıllık Değişim (%)
 *   TP.AB.B01        → Brüt Rezervler (milyon USD — divided by 1000 → Milyar $)
 */
const EVDS_BASE = 'https://evds2.tcmb.gov.tr/service/evds';
const EVDS_KEY  = process.env.EVDS_API_KEY ?? '';

// EVDS field → mock indicator key mapping
const SERIES_MAP: Array<{ field: string; key: string; divisor?: number }> = [
  { field: 'TP.DK.USD.A.YTL', key: 'usd_try'     },
  { field: 'TP.DK.EUR.A.YTL', key: 'eur_try'      },
  { field: 'TP.TG2.Y09',      key: 'policy_rate'  },
  { field: 'TP.FG.J0',        key: 'tufe'         },
  { field: 'TP.FE.OKTG01',    key: 'ufe'          },
  { field: 'TP.AB.B01',       key: 'reserves', divisor: 1000 }, // mln → bln
];

async function fetchEvdsAll(): Promise<Partial<Record<string, number>>> {
  if (!EVDS_KEY) throw new Error('EVDS_API_KEY not set');

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 90); // 90 days — catches monthly data

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

  const allSeries = SERIES_MAP.map((s) => s.field).join(',');
  const url =
    `${EVDS_BASE}/series=${allSeries}` +
    `&type=json&startDate=${fmt(start)}&endDate=${fmt(today)}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { key: EVDS_KEY },
  });

  if (!res.ok) throw new Error(`EVDS HTTP ${res.status}`);

  const data = await res.json();
  const items: Record<string, string>[] = data?.items ?? [];
  if (items.length === 0) throw new Error('EVDS: no data items');

  // For each series, find the most recent non-null value
  const result: Record<string, number> = {};

  for (const { field, key, divisor } of SERIES_MAP) {
    for (let i = items.length - 1; i >= 0; i--) {
      const raw = items[i][field];
      if (raw && raw !== '' && raw !== 'ND') {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          result[key] = divisor ? +(parsed / divisor).toFixed(2) : parsed;
          break;
        }
      }
    }
  }

  return result;
}

export async function GET() {
  const cached = cache.get();
  if (cached) return NextResponse.json(cached);

  let indicators: TcmbIndicator[] = MOCK_TCMB.map((i) => ({ ...i }));
  let source: TcmbResponse['source'] = 'mock';
  let liveCount = 0;

  try {
    const rates = await fetchEvdsAll();

    indicators = indicators.map((ind) => {
      const val = rates[ind.key];
      if (val !== undefined) {
        const oldVal = typeof ind.value === 'number' ? ind.value : parseFloat(String(ind.value));
        liveCount++;
        return {
          ...ind,
          value: val,
          change: +(val - oldVal).toFixed(4),
          date: new Date().toISOString().slice(0, 10),
        };
      }
      return ind;
    });

    source = liveCount === indicators.length
      ? 'live'
      : liveCount > 0 ? 'partial' : 'mock';

  } catch {
    // EVDS key missing or request failed — use full mock
  }

  const response: TcmbResponse = {
    indicators, source, liveCount,
    lastFetch: new Date().toISOString(),
  };
  cache.set(response);
  return NextResponse.json(response);
}
