import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyStatus {
  name: string;
  exists: boolean;
  length: number | null;
}

export interface EvdsSeriesResult {
  seriesCode: string;
  label: string;
  success: boolean;
  lastValue: string | null;
  lastDate: string | null;
  errorMessage: string | null;
}

export interface SourceStatus {
  key: string;
  label: string;
  hasApiKey: boolean;
  testStatus: 'ok' | 'error' | 'no-key';
  sampleData: Record<string, unknown> | null;
  errorMessage: string | null;
  responseMs: number | null;
}

export interface DebugSourcesResponse {
  keyStatuses: KeyStatus[];
  evdsSeries: EvdsSeriesResult[];
  sources: SourceStatus[];
  checkedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EVDS_BASE = 'https://evds2.tcmb.gov.tr/service/evds';

function evdsFmt(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

// EVDS series to validate — must match tcmb/route.ts and market/route.ts
const EVDS_SERIES: Array<{ code: string; label: string; divisor?: number }> = [
  { code: 'TP.DK.USD.A.YTL', label: 'USD/TRY'         },
  { code: 'TP.DK.EUR.A.YTL', label: 'EUR/TRY'         },
  { code: 'TP.TG2.Y09',      label: 'Politika Faizi'  },
  { code: 'TP.FG.J0',        label: 'TÜFE (Yıllık)'   },
  { code: 'TP.FE.OKTG01',    label: 'ÜFE (Yıllık)'    },
  { code: 'TP.AB.B01',       label: 'Brüt Rezervler', divisor: 1000 },
];

async function checkEvdsSeriesAll(apiKey: string): Promise<EvdsSeriesResult[]> {
  if (!apiKey) {
    return EVDS_SERIES.map((s) => ({
      seriesCode: s.code,
      label: s.label,
      success: false,
      lastValue: null,
      lastDate: null,
      errorMessage: 'EVDS_API_KEY tanımlı değil',
    }));
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 90); // 90 gün — aylık veriyi yakalar

  const allCodes = EVDS_SERIES.map((s) => s.code).join(',');
  const url =
    `${EVDS_BASE}/series=${allCodes}&type=json` +
    `&startDate=${evdsFmt(start)}&endDate=${evdsFmt(today)}`;

  let items: Record<string, string>[] = [];
  let fetchError: string | null = null;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { key: apiKey },
    });
    if (!res.ok) {
      fetchError = `HTTP ${res.status}`;
    } else {
      const data = await res.json();
      items = data?.items ?? [];
      if (items.length === 0) fetchError = 'Veri döndürülmedi';
    }
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Bilinmeyen hata';
  }

  if (fetchError) {
    return EVDS_SERIES.map((s) => ({
      seriesCode: s.code,
      label: s.label,
      success: false,
      lastValue: null,
      lastDate: null,
      errorMessage: fetchError,
    }));
  }

  return EVDS_SERIES.map((s) => {
    // Find last non-null value scanning from the end
    for (let i = items.length - 1; i >= 0; i--) {
      const raw = items[i][s.code];
      if (raw && raw !== '' && raw !== 'ND') {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          const val = s.divisor ? +(parsed / s.divisor).toFixed(2) : parsed;
          return {
            seriesCode: s.code,
            label: s.label,
            success: true,
            lastValue: String(val),
            lastDate: items[i]['Tarih'] ?? null,
            errorMessage: null,
          };
        }
      }
    }
    return {
      seriesCode: s.code,
      label: s.label,
      success: false,
      lastValue: null,
      lastDate: null,
      errorMessage: 'Seriden değer alınamadı (ND veya boş)',
    };
  });
}

// ─── Source checks ────────────────────────────────────────────────────────────

async function checkEvds(apiKey: string): Promise<SourceStatus> {
  const base = { key: 'evds', label: 'EVDS (TCMB)', hasApiKey: !!apiKey } as const;
  if (!apiKey) {
    return { ...base, testStatus: 'no-key', sampleData: null, errorMessage: 'EVDS_API_KEY tanımlı değil', responseMs: null };
  }
  const t0 = Date.now();
  try {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 7);
    const url =
      `${EVDS_BASE}/series=TP.DK.USD.A.YTL&type=json` +
      `&startDate=${evdsFmt(start)}&endDate=${evdsFmt(today)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { key: apiKey } });
    const responseMs = Date.now() - t0;
    if (!res.ok) return { ...base, testStatus: 'error', sampleData: null, errorMessage: `HTTP ${res.status}`, responseMs };
    const data = await res.json();
    const items: Record<string, string>[] = data?.items ?? [];
    const last = items[items.length - 1] ?? null;
    return {
      ...base,
      testStatus: items.length > 0 ? 'ok' : 'error',
      sampleData: last ? { tarih: last.Tarih, usdTry: last['TP.DK.USD.A.YTL'] } : null,
      errorMessage: items.length === 0 ? 'Veri döndürülmedi' : null,
      responseMs,
    };
  } catch (e) {
    return { ...base, testStatus: 'error', sampleData: null, errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata', responseMs: Date.now() - t0 };
  }
}

async function checkAlphaVantage(apiKey: string): Promise<SourceStatus> {
  const base = { key: 'alpha_vantage', label: 'Alpha Vantage', hasApiKey: !!apiKey } as const;
  if (!apiKey) {
    return { ...base, testStatus: 'no-key', sampleData: null, errorMessage: 'ALPHA_VANTAGE_API_KEY tanımlı değil', responseMs: null };
  }
  const t0 = Date.now();
  try {
    const url =
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE` +
      `&from_currency=USD&to_currency=TRY&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const responseMs = Date.now() - t0;
    if (!res.ok) return { ...base, testStatus: 'error', sampleData: null, errorMessage: `HTTP ${res.status}`, responseMs };
    const data = await res.json();
    if (data?.Note)        return { ...base, testStatus: 'error', sampleData: null, errorMessage: 'Rate limit aşıldı (5 istek/dk)', responseMs };
    if (data?.Information) return { ...base, testStatus: 'error', sampleData: null, errorMessage: 'API key geçersiz veya premium gerekli', responseMs };
    const rate = data?.['Realtime Currency Exchange Rate'];
    if (!rate) return { ...base, testStatus: 'error', sampleData: data as Record<string, unknown>, errorMessage: 'Beklenen alan yok', responseMs };
    return {
      ...base, testStatus: 'ok',
      sampleData: {
        fromCurrency:  rate['1. From_Currency Code'],
        toCurrency:    rate['3. To_Currency Code'],
        rate:          rate['5. Exchange Rate'],
        lastRefreshed: rate['6. Last Refreshed'],
      },
      errorMessage: null,
      responseMs,
    };
  } catch (e) {
    return { ...base, testStatus: 'error', sampleData: null, errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata', responseMs: Date.now() - t0 };
  }
}

async function checkYahooFinance(): Promise<SourceStatus> {
  const base = { key: 'yahoo_finance', label: 'Yahoo Finance', hasApiKey: false } as const;
  const t0 = Date.now();
  try {
    const { default: YahooFinance } = await import('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = await yf.quote('^XU100') as Record<string, any>;
    const responseMs = Date.now() - t0;
    if (!q || typeof q['regularMarketPrice'] !== 'number') {
      return { ...base, testStatus: 'error', sampleData: null, errorMessage: 'regularMarketPrice alanı yok', responseMs };
    }
    return {
      ...base, testStatus: 'ok',
      sampleData: { symbol: q.symbol, price: q.regularMarketPrice, changePct: q.regularMarketChangePercent?.toFixed(2) + '%', market: q.marketState },
      errorMessage: null,
      responseMs,
    };
  } catch (e) {
    return { ...base, testStatus: 'error', sampleData: null, errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata', responseMs: Date.now() - t0 };
  }
}

async function checkFred(apiKey: string): Promise<SourceStatus> {
  const base = { key: 'fred', label: 'FRED (St. Louis Fed)', hasApiKey: !!apiKey } as const;
  if (!apiKey) {
    return { ...base, testStatus: 'no-key', sampleData: null, errorMessage: 'FRED_API_KEY tanımlı değil', responseMs: null };
  }
  const t0 = Date.now();
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=DFF&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const responseMs = Date.now() - t0;
    if (!res.ok) return { ...base, testStatus: 'error', sampleData: null, errorMessage: `HTTP ${res.status}`, responseMs };
    const data = await res.json();
    if (data?.error_message) return { ...base, testStatus: 'error', sampleData: null, errorMessage: data.error_message as string, responseMs };
    const obs = data?.observations?.[0] ?? null;
    return {
      ...base,
      testStatus: obs ? 'ok' : 'error',
      sampleData: obs ? { seriesId: 'DFF', label: 'Federal Funds Rate', date: obs.date, value: obs.value + '%' } : null,
      errorMessage: obs ? null : 'Gözlem verisi bulunamadı',
      responseMs,
    };
  } catch (e) {
    return { ...base, testStatus: 'error', sampleData: null, errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata', responseMs: Date.now() - t0 };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const evdsKey = process.env.EVDS_API_KEY ?? '';
  const avKey   = process.env.ALPHA_VANTAGE_API_KEY ?? '';
  const fredKey = process.env.FRED_API_KEY ?? '';

  // Key status — existence and length only, never the value
  const keyStatuses: KeyStatus[] = [
    { name: 'EVDS_API_KEY',          exists: !!evdsKey, length: evdsKey  ? evdsKey.length  : null },
    { name: 'ALPHA_VANTAGE_API_KEY', exists: !!avKey,   length: avKey    ? avKey.length    : null },
    { name: 'FRED_API_KEY',          exists: !!fredKey, length: fredKey  ? fredKey.length  : null },
  ];

  const [evdsSeries, evds, alphaVantage, yahooFinance, fred] = await Promise.all([
    checkEvdsSeriesAll(evdsKey),
    checkEvds(evdsKey),
    checkAlphaVantage(avKey),
    checkYahooFinance(),
    checkFred(fredKey),
  ]);

  const response: DebugSourcesResponse = {
    keyStatuses,
    evdsSeries,
    sources: [evds, alphaVantage, yahooFinance, fred],
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
