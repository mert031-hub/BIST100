import { NextResponse } from 'next/server';
import { MOCK_KAP } from '@/data/mock/kap';
import type { KapDisclosure, KapCategory } from '@/types/kap';
import { withTimeout } from '@/lib/fetch-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * KAP public RSS feed.
 * URL may change; check https://www.kap.org.tr/tr/rss if it fails.
 */
const KAP_RSS_URL = 'https://www.kap.org.tr/tr/rss/bildirimler';
const FEED_TIMEOUT = 8000;
const MAX_ITEMS = 25;

const CONTENT_READY_CATEGORIES = new Set<KapCategory>([
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

function extractCompanyCode(title: string, creator?: string): string {
  // KAP titles often contain company code in brackets: [ASELS]
  const bracketMatch = title.match(/\[([A-Z]{2,6})\]/);
  if (bracketMatch) return bracketMatch[1];

  // Or "ASELS - Aselsan..." format
  const dashMatch = title.match(/^([A-Z]{2,6})\s*[-–]/);
  if (dashMatch) return dashMatch[1];

  // Creator field often has the BIST code
  if (creator) {
    const creatorMatch = creator.match(/^([A-Z]{2,6})$/);
    if (creatorMatch) return creatorMatch[1];
  }

  return 'BIST';
}

function scoreKap(title: string, category: KapCategory): number {
  const scores: Record<KapCategory, number> = {
    FINANSAL_TABLO:   92,
    IHALE:            88,
    TEMETTU:          85,
    SERMAYE_ARTIRIMI: 87,
    YEN_IS_ILISKISI:  82,
    OZEL_DURUM:       78,
    GERI_ALIM:        80,
    BORCLANMA:        75,
    YK_KARARI:        45,
    DIGER:            35,
  };
  let base = scores[category] ?? 40;

  const t = title.toLowerCase();
  if (t.includes('milyar') || t.includes('milyon')) base = Math.min(100, base + 5);
  if (t.includes('iptal') || t.includes('erteleme')) base = Math.max(20, base - 10);

  return base;
}

async function fetchKapRss(): Promise<KapDisclosure[]> {
  const Parser = (await import('rss-parser')).default;
  const parser = new Parser({
    timeout: FEED_TIMEOUT,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BistRadar/1.0)',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    customFields: { item: ['summary', 'description', 'dc:creator'] },
  });

  const feed = await withTimeout(parser.parseURL(KAP_RSS_URL), FEED_TIMEOUT + 1000);

  return (feed.items ?? []).slice(0, MAX_ITEMS).map((item, idx): KapDisclosure => {
    const title = item.title?.trim() ?? 'Başlık yok';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creator = (item as any)['dc:creator'] ?? item.creator;
    const category = classifyKap(title);
    const companyCode = extractCompanyCode(title, creator);

    const score = scoreKap(title, category);
    return {
      id: `kap-live-${idx}`,
      companyCode,
      companyName: creator ?? companyCode,
      title,
      summary: item.contentSnippet ?? '',
      category,
      date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      sourceUrl: item.link ?? KAP_RSS_URL,
      importanceScore: score,
      contentReady: score >= 55 && CONTENT_READY_CATEGORIES.has(category),
    };
  });
}

export async function GET() {
  try {
    const disclosures = await fetchKapRss();
    if (disclosures.length === 0) throw new Error('Empty feed');
    return NextResponse.json({ disclosures, source: 'live', lastFetch: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({
      disclosures: MOCK_KAP,
      source: 'mock',
      error: err instanceof Error ? err.message : String(err),
      lastFetch: new Date().toISOString(),
    });
  }
}
