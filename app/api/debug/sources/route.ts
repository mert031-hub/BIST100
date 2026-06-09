import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── In-memory tracker (resets on server restart) ────────────────────────────
// Tracks last success / error time per source across requests
const tracker: Record<string, { lastSuccessAt: string | null; lastErrorAt: string | null }> = {};
function getTracker(key: string) {
  if (!tracker[key]) tracker[key] = { lastSuccessAt: null, lastErrorAt: null };
  return tracker[key];
}
function markSuccess(key: string) { getTracker(key).lastSuccessAt = new Date().toISOString(); }
function markError(key: string)   { getTracker(key).lastErrorAt   = new Date().toISOString(); }

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
  requestUrl: string | null;
  httpStatus: number | null;
  responsePreview: string | null;
  sampleData: Record<string, unknown> | null;
  errorMessage: string | null;
  responseMs: number | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
}

export interface DebugSourcesResponse {
  keyStatuses: KeyStatus[];
  evdsSeries: EvdsSeriesResult[];
  sources: SourceStatus[];
  checkedAt: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const EVDS_BASE = 'https://evds2.tcmb.gov.tr/service/evds';

function evdsFmt(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function maskKey(url: string, key: string): string {
  if (!key) return url;
  return url.replace(key.trim(), '***');
}

async function safeText(res: Response, limit = 300): Promise<string> {
  try {
    const text = await res.clone().text();
    return text.slice(0, limit).replace(/\s+/g, ' ').trim();
  } catch {
    return '[body okunamadı]';
  }
}

// ─── EVDS series batch test ───────────────────────────────────────────────────

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
      seriesCode: s.code, label: s.label,
      success: false, lastValue: null, lastDate: null,
      errorMessage: 'EVDS_API_KEY tanımlı değil',
    }));
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 90);

  const allCodes = EVDS_SERIES.map((s) => s.code).join(',');
  const url = `${EVDS_BASE}/series=${allCodes}&type=json&startDate=${evdsFmt(start)}&endDate=${evdsFmt(today)}`;

  let items: Record<string, string>[] = [];
  let fetchError: string | null = null;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { key: apiKey.trim() },
    });

    if (!res.ok) {
      fetchError = `HTTP ${res.status}`;
    } else {
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('text/html')) {
        const preview = await safeText(res, 150);
        fetchError = `HTML yanıtı (key geçersiz/redirect): ${preview}`;
      } else {
        const data = await res.json();
        items = data?.items ?? [];
        if (items.length === 0) fetchError = 'items dizisi boş';
      }
    }
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Bilinmeyen hata';
  }

  if (fetchError) {
    return EVDS_SERIES.map((s) => ({
      seriesCode: s.code, label: s.label,
      success: false, lastValue: null, lastDate: null,
      errorMessage: fetchError,
    }));
  }

  return EVDS_SERIES.map((s) => {
    for (let i = items.length - 1; i >= 0; i--) {
      const raw = items[i][s.code];
      if (raw && raw !== '' && raw !== 'ND') {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          const val = s.divisor ? +(parsed / s.divisor).toFixed(2) : parsed;
          return { seriesCode: s.code, label: s.label, success: true, lastValue: String(val), lastDate: items[i]['Tarih'] ?? null, errorMessage: null };
        }
      }
    }
    return { seriesCode: s.code, label: s.label, success: false, lastValue: null, lastDate: null, errorMessage: 'Seriden değer alınamadı (ND/boş)' };
  });
}

// ─── Source checks ────────────────────────────────────────────────────────────

async function checkEvds(apiKey: string): Promise<SourceStatus> {
  const tKey = 'evds';
  const base = { key: tKey, label: 'EVDS (TCMB)', hasApiKey: !!apiKey };

  if (!apiKey) {
    return {
      ...base, testStatus: 'no-key', requestUrl: null, httpStatus: null,
      responsePreview: null, sampleData: null,
      errorMessage: 'EVDS_API_KEY tanımlı değil', responseMs: null,
      ...getTracker(tKey),
    };
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 7);
  const url = `${EVDS_BASE}/series=TP.DK.USD.A.YTL&type=json&startDate=${evdsFmt(start)}&endDate=${evdsFmt(today)}`;
  const displayUrl = url; // EVDS key is in header, not URL

  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { key: apiKey.trim() } });
    const responseMs = Date.now() - t0;
    const httpStatus = res.status;
    const preview = await safeText(res);

    if (!res.ok) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: `HTTP ${httpStatus}`, responseMs, ...getTracker(tKey) };
    }

    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('text/html')) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: `HTML yanıtı — key geçersiz veya süresi dolmuş: ${preview.slice(0, 80)}`, responseMs, ...getTracker(tKey) };
    }

    let items: Record<string, string>[] = [];
    try {
      const data = JSON.parse(preview + (preview.length < 300 ? '' : ''));
      // preview might be truncated — re-parse from clone
      const full = await (await fetch(url, { signal: AbortSignal.timeout(8000), headers: { key: apiKey.trim() } })).json();
      items = full?.items ?? [];
    } catch { items = []; }

    const last = items[items.length - 1] ?? null;
    if (items.length === 0) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: 'items dizisi boş', responseMs, ...getTracker(tKey) };
    }

    markSuccess(tKey);
    return {
      ...base, testStatus: 'ok', requestUrl: displayUrl, httpStatus, responsePreview: preview,
      sampleData: last ? { tarih: last.Tarih, usdTry: last['TP.DK.USD.A.YTL'] } : null,
      errorMessage: null, responseMs, ...getTracker(tKey),
    };
  } catch (e) {
    markError(tKey);
    return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus: null, responsePreview: null, sampleData: null, errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata', responseMs: Date.now() - t0, ...getTracker(tKey) };
  }
}

async function checkAlphaVantage(apiKey: string): Promise<SourceStatus> {
  const tKey = 'alpha_vantage';
  const base = { key: tKey, label: 'Alpha Vantage', hasApiKey: !!apiKey };

  if (!apiKey) {
    return {
      ...base, testStatus: 'no-key', requestUrl: null, httpStatus: null,
      responsePreview: null, sampleData: null,
      errorMessage: 'ALPHA_VANTAGE_API_KEY tanımlı değil', responseMs: null,
      ...getTracker(tKey),
    };
  }

  const trimmedKey = apiKey.trim();
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=TRY&apikey=${trimmedKey}`;
  const displayUrl = maskKey(url, trimmedKey);
  const t0 = Date.now();

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const responseMs = Date.now() - t0;
    const httpStatus = res.status;

    if (!res.ok) {
      markError(tKey);
      const preview = await safeText(res);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: `HTTP ${httpStatus}`, responseMs, ...getTracker(tKey) };
    }

    const text = await res.text();
    const preview = text.slice(0, 300).replace(/\s+/g, ' ').trim();

    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: 'JSON parse hatası', responseMs, ...getTracker(tKey) };
    }

    // Alpha Vantage specific error fields
    if (data?.Note) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: 'Dakika limiti aşıldı (5 req/dk): ' + String(data.Note).slice(0, 80), responseMs, ...getTracker(tKey) };
    }
    if (data?.Information) {
      markError(tKey);
      const info = String(data.Information);
      // Distinguish rate limit vs invalid key from message content
      const isInvalid = info.toLowerCase().includes('invalid') || info.toLowerCase().includes('demo');
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: (isInvalid ? 'Key geçersiz — ' : 'Kota/limit — ') + info.slice(0, 120), responseMs, ...getTracker(tKey) };
    }
    if (data?.['Error Message']) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: String(data['Error Message']).slice(0, 120), responseMs, ...getTracker(tKey) };
    }

    const rate = data?.['Realtime Currency Exchange Rate'] as Record<string, string> | undefined;
    if (!rate) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: 'Realtime Currency Exchange Rate alanı yok', responseMs, ...getTracker(tKey) };
    }

    markSuccess(tKey);
    return {
      ...base, testStatus: 'ok', requestUrl: displayUrl, httpStatus, responsePreview: preview,
      sampleData: { from: rate['1. From_Currency Code'], to: rate['3. To_Currency Code'], rate: rate['5. Exchange Rate'], refreshed: rate['6. Last Refreshed'] },
      errorMessage: null, responseMs, ...getTracker(tKey),
    };
  } catch (e) {
    markError(tKey);
    return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus: null, responsePreview: null, sampleData: null, errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata', responseMs: Date.now() - t0, ...getTracker(tKey) };
  }
}

async function checkYahooFinance(): Promise<SourceStatus> {
  const tKey = 'yahoo_finance';
  const base = { key: tKey, label: 'Yahoo Finance', hasApiKey: false };
  const displayUrl = 'yahoo-finance2 lib → ^XU100';
  const t0 = Date.now();

  try {
    const { default: YahooFinance } = await import('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = await yf.quote('^XU100') as Record<string, any>;
    const responseMs = Date.now() - t0;

    if (!q || typeof q['regularMarketPrice'] !== 'number') {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus: null, responsePreview: JSON.stringify(q).slice(0, 300), sampleData: null, errorMessage: 'regularMarketPrice alanı yok veya number değil', responseMs, ...getTracker(tKey) };
    }

    markSuccess(tKey);
    return {
      ...base, testStatus: 'ok', requestUrl: displayUrl, httpStatus: 200,
      responsePreview: null,
      sampleData: { symbol: q.symbol, price: q.regularMarketPrice, changePct: q.regularMarketChangePercent?.toFixed(2) + '%', market: q.marketState },
      errorMessage: null, responseMs, ...getTracker(tKey),
    };
  } catch (e) {
    markError(tKey);
    return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus: null, responsePreview: null, sampleData: null, errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata', responseMs: Date.now() - t0, ...getTracker(tKey) };
  }
}

async function checkFred(apiKey: string): Promise<SourceStatus> {
  const tKey = 'fred';
  const base = { key: tKey, label: 'FRED (St. Louis Fed)', hasApiKey: !!apiKey };

  if (!apiKey) {
    return {
      ...base, testStatus: 'no-key', requestUrl: null, httpStatus: null,
      responsePreview: null, sampleData: null,
      errorMessage: 'FRED_API_KEY tanımlı değil', responseMs: null,
      ...getTracker(tKey),
    };
  }

  const trimmedKey = apiKey.trim();
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DFF&api_key=${trimmedKey}&file_type=json&limit=1&sort_order=desc`;
  const displayUrl = maskKey(url, trimmedKey);
  const t0 = Date.now();

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const responseMs = Date.now() - t0;
    const httpStatus = res.status;
    const preview = await safeText(res);

    if (!res.ok) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: `HTTP ${httpStatus}`, responseMs, ...getTracker(tKey) };
    }

    let data: Record<string, unknown>;
    try { data = JSON.parse(preview.length < 300 ? preview : (await res.text())); } catch {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: 'JSON parse hatası', responseMs, ...getTracker(tKey) };
    }

    if (data?.error_message) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: String(data.error_message), responseMs, ...getTracker(tKey) };
    }

    const obs = (data?.observations as Array<Record<string, string>>)?.[0] ?? null;
    if (!obs) {
      markError(tKey);
      return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus, responsePreview: preview, sampleData: null, errorMessage: 'Gözlem verisi bulunamadı', responseMs, ...getTracker(tKey) };
    }

    markSuccess(tKey);
    return {
      ...base, testStatus: 'ok', requestUrl: displayUrl, httpStatus, responsePreview: preview,
      sampleData: { seriesId: 'DFF', label: 'Federal Funds Rate', date: obs.date, value: obs.value + '%' },
      errorMessage: null, responseMs, ...getTracker(tKey),
    };
  } catch (e) {
    markError(tKey);
    return { ...base, testStatus: 'error', requestUrl: displayUrl, httpStatus: null, responsePreview: null, sampleData: null, errorMessage: e instanceof Error ? e.message : 'Bilinmeyen hata', responseMs: Date.now() - t0, ...getTracker(tKey) };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const evdsKey = process.env.EVDS_API_KEY ?? '';
  const avKey   = process.env.ALPHA_VANTAGE_API_KEY ?? '';
  const fredKey = process.env.FRED_API_KEY ?? '';

  const keyStatuses: KeyStatus[] = [
    { name: 'EVDS_API_KEY',          exists: !!evdsKey, length: evdsKey  ? evdsKey.trim().length  : null },
    { name: 'ALPHA_VANTAGE_API_KEY', exists: !!avKey,   length: avKey    ? avKey.trim().length    : null },
    { name: 'FRED_API_KEY',          exists: !!fredKey, length: fredKey  ? fredKey.trim().length  : null },
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
