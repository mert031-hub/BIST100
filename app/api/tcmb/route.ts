import { NextResponse } from 'next/server';
import type { TcmbIndicator } from '@/types/tcmb';
import { makeRouteCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TCMB_CACHE_TTL = 3_600_000;

interface TcmbResponse {
  indicators: TcmbIndicator[];
  source: 'live' | 'partial' | 'none';
  liveCount: number;
  errorReason?: string;
  lastFetch: string;
}
const cache = makeRouteCache<TcmbResponse>(TCMB_CACHE_TTL);

const EVDS_BASE = 'https://evds2.tcmb.gov.tr/service/evds';

// Only indicators that have a real EVDS series — no mock-only fields
const INDICATOR_DEFS: Array<{
  key: string;
  label: string;
  unit: string;
  category: TcmbIndicator['category'];
  evdsField: string;
  divisor?: number;
}> = [
  { key: 'policy_rate', label: 'Politika Faizi',  unit: '%',        category: 'FAIZ',      evdsField: 'TP.TG2.Y09'     },
  { key: 'tufe',        label: 'TÜFE (Yıllık)',   unit: '%',        category: 'ENFLASYON', evdsField: 'TP.FG.J0'       },
  { key: 'ufe',         label: 'ÜFE (Yıllık)',    unit: '%',        category: 'ENFLASYON', evdsField: 'TP.FE.OKTG01'   },
  { key: 'usd_try',     label: 'USD/TRY',          unit: 'TL',       category: 'KUR',       evdsField: 'TP.DK.USD.A.YTL'},
  { key: 'eur_try',     label: 'EUR/TRY',          unit: 'TL',       category: 'KUR',       evdsField: 'TP.DK.EUR.A.YTL'},
  { key: 'reserves',    label: 'Brüt Rezervler',   unit: 'Milyar $', category: 'REZERV',    evdsField: 'TP.AB.B01', divisor: 1000 },
];

async function fetchEvdsAll(evdsKey: string): Promise<Partial<Record<string, number>>> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 90);

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

  const allSeries = INDICATOR_DEFS.map((s) => s.evdsField).join(',');
  const url =
    `${EVDS_BASE}/series=${allSeries}` +
    `&type=json&startDate=${fmt(start)}&endDate=${fmt(today)}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { key: evdsKey.trim() },
  });

  if (!res.ok) throw new Error(`EVDS HTTP ${res.status}`);

  // EVDS returns HTML when key is invalid/expired (redirects to login)
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('text/html')) {
    const preview = (await res.text()).slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(`EVDS HTML yanıtı (key geçersiz/süresi dolmuş?): ${preview}`);
  }

  const data = await res.json();
  const items: Record<string, string>[] = data?.items ?? [];
  if (items.length === 0) throw new Error('EVDS: veri bulunamadı');

  const result: Record<string, number> = {};
  for (const { evdsField, key, divisor } of INDICATOR_DEFS) {
    for (let i = items.length - 1; i >= 0; i--) {
      const raw = items[i][evdsField];
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

  const evdsKey = process.env.EVDS_API_KEY ?? '';

  if (!evdsKey) {
    const indicators: TcmbIndicator[] = INDICATOR_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      unit: def.unit,
      category: def.category,
      value: '—',
      date: '—',
      isLive: false,
      errorReason: 'EVDS_API_KEY YOK',
    }));
    const response: TcmbResponse = {
      indicators,
      source: 'none',
      liveCount: 0,
      errorReason: 'EVDS_API_KEY YOK',
      lastFetch: new Date().toISOString(),
    };
    cache.set(response);
    return NextResponse.json(response);
  }

  let indicators: TcmbIndicator[];
  let liveCount = 0;
  let source: TcmbResponse['source'] = 'none';
  let errorReason: string | undefined;

  try {
    const rates = await fetchEvdsAll(evdsKey);

    indicators = INDICATOR_DEFS.map((def) => {
      const val = rates[def.key];
      if (val !== undefined) {
        liveCount++;
        return {
          key:      def.key,
          label:    def.label,
          unit:     def.unit,
          category: def.category,
          value:    val,
          change:   0,
          date:     new Date().toISOString().slice(0, 10),
          isLive:   true,
        };
      }
      return {
        key:         def.key,
        label:       def.label,
        unit:        def.unit,
        category:    def.category,
        value:       '—',
        date:        '—',
        isLive:      false,
        errorReason: 'VERİ BULUNAMADI',
      };
    });

    source = liveCount === indicators.length ? 'live'
           : liveCount > 0                  ? 'partial'
           :                                  'none';
  } catch (e) {
    errorReason = e instanceof Error ? e.message : 'EVDS ERİŞİM HATASI';
    indicators = INDICATOR_DEFS.map((def) => ({
      key:         def.key,
      label:       def.label,
      unit:        def.unit,
      category:    def.category,
      value:       '—',
      date:        '—',
      isLive:      false,
      errorReason,
    }));
    source = 'none';
  }

  const response: TcmbResponse = {
    indicators, source, liveCount, errorReason,
    lastFetch: new Date().toISOString(),
  };
  cache.set(response);
  return NextResponse.json(response);
}
