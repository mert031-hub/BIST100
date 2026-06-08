/**
 * lib/kap-live.ts — KAP Canlı Veri Prototipi
 *
 * Araştırma Tarihi: Haziran 2026
 * Araştırma Kaynakları: cahitihac/kap-notifier, cemsinano/pykap,
 *                       alperaydyn/KAP_Notifications, Caglarsonmez/KAP_Scraper
 *
 * ─── Doğrulanan KAP Endpoint'leri ────────────────────────────────────────────
 *
 * 1. RSS FEED (en güvenilir)
 *    GET https://www.kap.org.tr/tr/rss/bildirimler
 *    Headers: User-Agent: kap/0.1.1 (generic UA ile blok var)
 *    Response: RSS 2.0 XML
 *    Fields: <title>, <link>, <pubDate>, <dc:creator> (şirket kodu),
 *             <description>/<content:encoded>
 *    Güncelleme: Her 3 dakikada bir
 *
 * 2. JSON API — Bildirim Listesi (kap-notifier community discovery)
 *    GET https://www.kap.org.tr/tr/api/disclosures
 *    Headers: Accept: application/json, X-Requested-With: XMLHttpRequest
 *    Response: JSON array (format aşağıda)
 *    NOT: Oturum/cookie gerektiriyor olabilir, üretimde test edilmeli
 *
 * 3. JSON API — Bildirim Konuları (pykap'tan doğrulandı)
 *    GET https://www.kap.org.tr/tr/api/disclosure/subjects/{class}/IGS
 *    class: FR (Finansal) | ODA (Özel Durum Açıklaması) | DG (Diğer)
 *    Response: [{ disclosureClass, subject, subjectOid }]
 *
 * 4. HTML Scraping — Şirket Bazlı Bildirimler
 *    GET https://www.kap.org.tr/tr/bildirim-sorgu-sonuc?member={mkkMemberOid}
 *    mkkMemberOid: hex string (örn. "4028e4a1413b7ef5014144ecbaca00a2")
 *
 * 5. PDF İndirme (sadece belirli bir bildirim için)
 *    GET https://www.kap.org.tr/en/api/BildirimPdf/{disclosureIndex}
 *
 * ─── Bilinen Kısıtlamalar ─────────────────────────────────────────────────────
 * - Cloud sandbox (network policy) tüm kap.org.tr bağlantılarını blokluyor
 * - Üretim ortamında çalışmalı
 * - KAP endpointleri önceden haber vermeden değişebilir
 * - Rate limit: koruyucu polling (≥60s arası)
 * - Bazı endpointler session cookie gerektirebilir
 *
 * ─── JSON API Beklenen Response Şeması ───────────────────────────────────────
 * (kap-notifier + kap_reader.py field isimlerinden çıkarıldı)
 *
 * [
 *   {
 *     "disclosureIndex": 1234567,        // bildirim ID
 *     "companyName": "ASELSAN EL. ...",  // şirket tam adı
 *     "memberOid": "4028e4a1...",        // üye OID
 *     "relatedStocks": ["ASELS"],        // hisse kodları
 *     "publishDate": "2024-06-08 14:30", // yayın tarihi
 *     "subject": "Finansal Tablo",       // konu başlığı
 *     "disclosureClass": "FR",           // bildirim sınıfı
 *     "summary": "..."                   // özet (opsiyonel)
 *   }
 * ]
 */

import type { KapDisclosure, KapCategory } from '@/types/kap';
import { withTimeout } from '@/lib/fetch-helpers';

const BASE_URL = 'https://www.kap.org.tr';
const TIMEOUT_MS = 8000;
const MAX_ITEMS = 20;

/** Her strateji denemesinin sonucu */
export interface StrategyResult {
  strategy: string;
  success: boolean;
  itemCount: number;
  error?: string;
  durationMs: number;
}

/** Prototip çıktısı — UI debug panel için */
export interface KapLiveResult {
  disclosures: KapDisclosure[];
  source: 'live-rss' | 'live-json' | 'empty';
  strategies: StrategyResult[];
  fetchedAt: string;
}

/* ─── Sınıflandırma (route.ts ile aynı) ─────────────────────────────────── */

const CONTENT_READY_CATS = new Set<KapCategory>([
  'FINANSAL_TABLO', 'IHALE', 'TEMETTU', 'SERMAYE_ARTIRIMI',
  'GERI_ALIM', 'YEN_IS_ILISKISI', 'OZEL_DURUM', 'BORCLANMA',
]);

function classifyKap(title: string): KapCategory {
  const t = title.toLowerCase();
  if (t.includes('finansal tablo') || t.includes('bilanço') || t.includes('gelir tablosu')) return 'FINANSAL_TABLO';
  if (t.includes('temettü') || t.includes('kâr dağıtım') || t.includes('kar dagitim')) return 'TEMETTU';
  if (t.includes('sermaye artırım') || t.includes('bedelli') || t.includes('bedelsiz')) return 'SERMAYE_ARTIRIMI';
  if (t.includes('geri alım') || t.includes('geri satin')) return 'GERI_ALIM';
  if (t.includes('iş birliği') || t.includes('ortaklık') || t.includes('anlaşma') || t.includes('protokol')) return 'YEN_IS_ILISKISI';
  if (t.includes('ihale') || t.includes('sözleşme') || t.includes('tedarik')) return 'IHALE';
  if (t.includes('yönetim kurulu') || t.includes('genel kurul') || t.includes('atama') || t.includes('görevden')) return 'YK_KARARI';
  if (t.includes('tahvil') || t.includes('bono') || t.includes('eurobond') || t.includes('kira sertifikası')) return 'BORCLANMA';
  if (t.includes('özel durum') || t.includes('içsel bilgi') || t.includes('ozel durum')) return 'OZEL_DURUM';
  return 'DIGER';
}

function scoreKap(title: string, category: KapCategory): number {
  const base: Record<KapCategory, number> = {
    FINANSAL_TABLO: 92, IHALE: 88, TEMETTU: 85, SERMAYE_ARTIRIMI: 87,
    YEN_IS_ILISKISI: 82, OZEL_DURUM: 78, GERI_ALIM: 80, BORCLANMA: 75,
    YK_KARARI: 45, DIGER: 35,
  };
  let s = base[category] ?? 40;
  const t = title.toLowerCase();
  if (t.includes('milyar') || t.includes('milyon')) s = Math.min(100, s + 5);
  if (t.includes('iptal') || t.includes('erteleme'))  s = Math.max(20, s - 10);
  return s;
}

function extractCode(title: string, creator?: string): string {
  const bracketMatch = title.match(/\[([A-Z]{2,6})\]/);
  if (bracketMatch) return bracketMatch[1];
  const dashMatch = title.match(/^([A-Z]{2,6})\s*[-–]/);
  if (dashMatch) return dashMatch[1];
  if (creator) {
    const m = creator.match(/^([A-Z]{2,6})$/);
    if (m) return m[1];
  }
  return 'BIST';
}

/* ─── Strateji 1: RSS Feed ───────────────────────────────────────────────── */

async function tryRssFeed(): Promise<{ items: KapDisclosure[]; result: StrategyResult }> {
  const t0 = Date.now();
  const strategy = 'RSS /tr/rss/bildirimler';

  try {
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser({
      timeout: TIMEOUT_MS,
      headers: {
        // 'kap/0.1.1' is the User-Agent known to work with KAP's RSS feed
        // (generic User-Agent strings are blocked; source: kap_reader.py)
        'User-Agent': 'kap/0.1.1',
        Accept: 'application/rss+xml, application/xml, text/xml',
        Referer: `${BASE_URL}/`,
      },
      customFields: { item: ['summary', 'description', 'dc:creator'] },
    });

    const feed = await withTimeout(
      parser.parseURL(`${BASE_URL}/tr/rss/bildirimler`),
      TIMEOUT_MS
    );

    const items: KapDisclosure[] = (feed.items ?? [])
      .slice(0, MAX_ITEMS)
      .map((item, idx): KapDisclosure => {
        const title = item.title?.trim() ?? 'Başlık yok';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const creator = (item as any)['dc:creator'] ?? item.creator;
        const category = classifyKap(title);
        const companyCode = extractCode(title, creator);
        const score = scoreKap(title, category);

        return {
          id: `kap-rss-${idx}-${Date.now()}`,
          companyCode,
          companyName: creator ?? companyCode,
          title,
          summary: item.contentSnippet ?? item.summary ?? '',
          category,
          date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          sourceUrl: item.link ?? `${BASE_URL}/tr/bildirim-sorgu`,
          importanceScore: score,
          contentReady: score >= 55 && CONTENT_READY_CATS.has(category),
        };
      })
      .filter((d) => d.title.length > 5);

    if (items.length === 0) throw new Error('RSS feed returned 0 items');

    return {
      items,
      result: { strategy, success: true, itemCount: items.length, durationMs: Date.now() - t0 },
    };
  } catch (err) {
    return {
      items: [],
      result: {
        strategy, success: false, itemCount: 0,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - t0,
      },
    };
  }
}

/* ─── Strateji 2: JSON API (/tr/api/disclosures) ─────────────────────────── */
// Kaynak: cahitihac/kap-notifier (3 saniyede bir polling yapan proje)
// Endpoint doğrulanmamış; session cookie gerektirebilir.
// Beklenen response şeması kap_reader.py + kap-notifier'dan çıkarılmıştır.

interface RawJsonDisclosure {
  disclosureIndex?: number;
  companyName?: string;
  memberOid?: string;
  relatedStocks?: string[];
  publishDate?: string;
  subject?: string;
  disclosureClass?: string;
  summary?: string;
  // Alternative field names (older API versions)
  notification_id?: number;
  company?: string;
  code?: string;
  publish_date?: string;
  title?: string;
}

function mapJsonItem(raw: RawJsonDisclosure, idx: number): KapDisclosure {
  const title = raw.subject ?? raw.title ?? 'Başlık yok';
  const companyCode = (raw.relatedStocks?.[0]) ?? raw.code ?? extractCode(title);
  const companyName = raw.companyName ?? raw.company ?? companyCode;
  const category = classifyKap(title);
  const score = scoreKap(title, category);

  const rawDate = raw.publishDate ?? raw.publish_date;
  let date: string;
  try {
    date = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();
  } catch {
    date = new Date().toISOString();
  }

  const disclosureId = raw.disclosureIndex ?? raw.notification_id ?? idx;

  return {
    id: `kap-json-${disclosureId}`,
    companyCode,
    companyName,
    title,
    summary: raw.summary ?? '',
    category,
    date,
    sourceUrl: `${BASE_URL}/tr/Bildirim/${disclosureId}`,
    importanceScore: score,
    contentReady: score >= 55 && CONTENT_READY_CATS.has(category),
  };
}

async function tryJsonApi(): Promise<{ items: KapDisclosure[]; result: StrategyResult }> {
  const t0 = Date.now();
  const strategy = 'JSON GET /tr/api/disclosures';

  try {
    const res = await withTimeout(
      fetch(`${BASE_URL}/tr/api/disclosures`, {
        method: 'GET',
        headers: {
          'User-Agent': 'kap/0.1.1',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `${BASE_URL}/`,
        },
        // Node 18+ AbortSignal for hard timeout
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
      TIMEOUT_MS + 1000
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Unexpected content-type: ${contentType}`);
    }

    const raw = await res.json() as unknown;

    // Response may be an array directly or wrapped in an object
    const arr: RawJsonDisclosure[] = Array.isArray(raw)
      ? raw
      : (raw as Record<string, unknown>)?.['data']
        ? ((raw as Record<string, unknown>)['data'] as RawJsonDisclosure[])
        : [];

    if (arr.length === 0) throw new Error('JSON API returned empty array');

    const items = arr.slice(0, MAX_ITEMS).map(mapJsonItem);

    return {
      items,
      result: { strategy, success: true, itemCount: items.length, durationMs: Date.now() - t0 },
    };
  } catch (err) {
    return {
      items: [],
      result: {
        strategy, success: false, itemCount: 0,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - t0,
      },
    };
  }
}

/* ─── Ana fonksiyon ──────────────────────────────────────────────────────── */

/**
 * Son 20 KAP bildirimini çeker.
 * Önce RSS feed dener, başarısız olursa JSON API'yi dener.
 * Her iki strateji de başarısız olursa boş array + detaylı hata raporu döner.
 *
 * Mock fallback bu fonksiyonun dışında API route'da sağlanır —
 * bu fonksiyon sadece [] döner, asla exception fırlatmaz.
 */
export async function fetchKapLive(): Promise<KapLiveResult> {
  const strategies: StrategyResult[] = [];

  // Strategy 1: RSS (most reliable, already proven in production)
  const rssResult = await tryRssFeed();
  strategies.push(rssResult.result);

  if (rssResult.items.length > 0) {
    return {
      disclosures: rssResult.items,
      source: 'live-rss',
      strategies,
      fetchedAt: new Date().toISOString(),
    };
  }

  // Strategy 2: JSON API (prototype — may require session in production)
  const jsonResult = await tryJsonApi();
  strategies.push(jsonResult.result);

  if (jsonResult.items.length > 0) {
    return {
      disclosures: jsonResult.items,
      source: 'live-json',
      strategies,
      fetchedAt: new Date().toISOString(),
    };
  }

  // Both failed
  return {
    disclosures: [],
    source: 'empty',
    strategies,
    fetchedAt: new Date().toISOString(),
  };
}
