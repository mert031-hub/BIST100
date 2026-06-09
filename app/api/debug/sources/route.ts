import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface SourceStatus {
  key: string;
  label: string;
  hasApiKey: boolean;
  testStatus: 'ok' | 'error' | 'no-key' | 'pending';
  sampleData: unknown;
  errorMessage: string | null;
  responseMs: number | null;
}

async function checkEvds(apiKey: string): Promise<SourceStatus> {
  const base: Omit<SourceStatus, 'testStatus' | 'sampleData' | 'errorMessage' | 'responseMs'> = {
    key: 'evds', label: 'EVDS (TCMB)', hasApiKey: !!apiKey,
  };
  if (!apiKey) {
    return { ...base, testStatus: 'no-key', sampleData: null, errorMessage: 'EVDS_API_KEY ortam değişkeni tanımlı değil', responseMs: null };
  }
  const t0 = Date.now();
  try {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 7);
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    const url =
      `https://evds2.tcmb.gov.tr/service/evds/series=TP.DK.USD.A.YTL&type=json` +
      `&startDate=${fmt(start)}&endDate=${fmt(today)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { key: apiKey },
    });
    const responseMs = Date.now() - t0;
    if (!res.ok) {
      return { ...base, testStatus: 'error', sampleData: null, errorMessage: `HTTP ${res.status}`, responseMs };
    }
    const data = await res.json();
    const items: Record<string, string>[] = data?.items ?? [];
    const lastItem = items[items.length - 1] ?? null;
    return {
      ...base,
      testStatus: items.length > 0 ? 'ok' : 'error',
      sampleData: lastItem ? { tarih: lastItem.Tarih, usdTry: lastItem['TP.DK.USD.A.YTL'] } : null,
      errorMessage: items.length === 0 ? 'Veri döndürülmedi' : null,
      responseMs,
    };
  } catch (e) {
    return {
      ...base, testStatus: 'error',
      sampleData: null,
      errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata',
      responseMs: Date.now() - t0,
    };
  }
}

async function checkAlphaVantage(apiKey: string): Promise<SourceStatus> {
  const base: Omit<SourceStatus, 'testStatus' | 'sampleData' | 'errorMessage' | 'responseMs'> = {
    key: 'alpha_vantage', label: 'Alpha Vantage', hasApiKey: !!apiKey,
  };
  if (!apiKey) {
    return { ...base, testStatus: 'no-key', sampleData: null, errorMessage: 'ALPHA_VANTAGE_API_KEY ortam değişkeni tanımlı değil', responseMs: null };
  }
  const t0 = Date.now();
  try {
    const url =
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE` +
      `&from_currency=USD&to_currency=TRY&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const responseMs = Date.now() - t0;
    if (!res.ok) {
      return { ...base, testStatus: 'error', sampleData: null, errorMessage: `HTTP ${res.status}`, responseMs };
    }
    const data = await res.json();
    if (data?.Note)        return { ...base, testStatus: 'error', sampleData: null, errorMessage: 'API limiti aşıldı (5 istek/dk)', responseMs };
    if (data?.Information) return { ...base, testStatus: 'error', sampleData: null, errorMessage: 'API key geçersiz veya premium gerekli', responseMs };
    const rate = data?.['Realtime Currency Exchange Rate'];
    if (!rate) {
      return { ...base, testStatus: 'error', sampleData: data, errorMessage: 'Beklenen alan bulunamadı', responseMs };
    }
    return {
      ...base, testStatus: 'ok',
      sampleData: {
        fromCurrency: rate['1. From_Currency Code'],
        toCurrency:   rate['3. To_Currency Code'],
        rate:         rate['5. Exchange Rate'],
        lastRefreshed: rate['6. Last Refreshed'],
      },
      errorMessage: null,
      responseMs,
    };
  } catch (e) {
    return {
      ...base, testStatus: 'error',
      sampleData: null,
      errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata',
      responseMs: Date.now() - t0,
    };
  }
}

async function checkYahooFinance(): Promise<SourceStatus> {
  const base: Omit<SourceStatus, 'testStatus' | 'sampleData' | 'errorMessage' | 'responseMs'> = {
    key: 'yahoo_finance', label: 'Yahoo Finance', hasApiKey: false,
  };
  const t0 = Date.now();
  try {
    const { default: YahooFinance } = await import('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = await yf.quote('^XU100') as Record<string, any>;
    const responseMs = Date.now() - t0;
    if (!q || typeof q['regularMarketPrice'] !== 'number') {
      return { ...base, testStatus: 'error', sampleData: null, errorMessage: 'Veri alınamadı', responseMs };
    }
    return {
      ...base, testStatus: 'ok',
      sampleData: {
        symbol: q.symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChangePercent?.toFixed(2) + '%',
        market: q.marketState,
      },
      errorMessage: null,
      responseMs,
    };
  } catch (e) {
    return {
      ...base, testStatus: 'error',
      sampleData: null,
      errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata',
      responseMs: Date.now() - t0,
    };
  }
}

async function checkFred(apiKey: string): Promise<SourceStatus> {
  const base: Omit<SourceStatus, 'testStatus' | 'sampleData' | 'errorMessage' | 'responseMs'> = {
    key: 'fred', label: 'FRED (St. Louis Fed)', hasApiKey: !!apiKey,
  };
  if (!apiKey) {
    return { ...base, testStatus: 'no-key', sampleData: null, errorMessage: 'FRED_API_KEY ortam değişkeni tanımlı değil', responseMs: null };
  }
  const t0 = Date.now();
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=DFF&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const responseMs = Date.now() - t0;
    if (!res.ok) {
      return { ...base, testStatus: 'error', sampleData: null, errorMessage: `HTTP ${res.status}`, responseMs };
    }
    const data = await res.json();
    if (data?.error_message) {
      return { ...base, testStatus: 'error', sampleData: null, errorMessage: data.error_message, responseMs };
    }
    const obs = data?.observations?.[0] ?? null;
    return {
      ...base, testStatus: obs ? 'ok' : 'error',
      sampleData: obs ? { seriesId: 'DFF', label: 'Federal Funds Rate', date: obs.date, value: obs.value + '%' } : null,
      errorMessage: obs ? null : 'Gözlem verisi bulunamadı',
      responseMs,
    };
  } catch (e) {
    return {
      ...base, testStatus: 'error',
      sampleData: null,
      errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata',
      responseMs: Date.now() - t0,
    };
  }
}

export async function GET() {
  const evdsKey = process.env.EVDS_API_KEY ?? '';
  const avKey   = process.env.ALPHA_VANTAGE_API_KEY ?? '';
  const fredKey = process.env.FRED_API_KEY ?? '';

  const [evds, alphaVantage, yahooFinance, fred] = await Promise.all([
    checkEvds(evdsKey),
    checkAlphaVantage(avKey),
    checkYahooFinance(),
    checkFred(fredKey),
  ]);

  return NextResponse.json({
    sources: [evds, alphaVantage, yahooFinance, fred],
    checkedAt: new Date().toISOString(),
  });
}
