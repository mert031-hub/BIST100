import { NextResponse } from 'next/server';
import { MOCK_KAP } from '@/data/mock/kap';
import { KapDisclosure, KapCategory } from '@/types/kap';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KAP_RSS_URL = 'https://www.kap.org.tr/tr/rss/bildirimler';

async function fetchKapRss(): Promise<KapDisclosure[]> {
  const Parser = (await import('rss-parser')).default;
  const parser = new Parser({
    customFields: { item: ['summary', 'description'] },
    timeout: 8000,
  });

  const feed = await parser.parseURL(KAP_RSS_URL);

  return (feed.items ?? []).slice(0, 20).map((item, idx) => {
    const title = item.title ?? 'Başlık yok';
    const category = classifyKap(title);
    const companyCode = extractCompanyCode(title);

    return {
      id: `kap-live-${idx}`,
      companyCode,
      companyName: item.creator ?? companyCode,
      title,
      category,
      date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      summary: item.contentSnippet ?? item.summary ?? '',
      sourceUrl: item.link ?? KAP_RSS_URL,
      importanceScore: scoreKap(title),
    };
  });
}

function classifyKap(title: string): KapCategory {
  const t = title.toLowerCase();
  if (t.includes('finansal tablo') || t.includes('bilanço') || t.includes('gelir tablosu')) return 'FINANSAL_TABLO';
  if (t.includes('temettü') || t.includes('kâr dağıtım')) return 'TEMETTU';
  if (t.includes('sermaye artırım') || t.includes('bedelli') || t.includes('bedelsiz')) return 'SERMAYE_ARTIRIMI';
  if (t.includes('geri alım') || t.includes('geri satın')) return 'GERI_ALIM';
  if (t.includes('ihale') || t.includes('sözleşme') || t.includes('iş ortaklığı')) return 'IHALE';
  if (t.includes('yönetim kurulu') || t.includes('genel kurul') || t.includes('atama')) return 'YK_KARARI';
  if (t.includes('tahvil') || t.includes('bono') || t.includes('eurobond') || t.includes('kira sertifikası')) return 'BORCLANMA';
  if (t.includes('özel durum') || t.includes('içsel bilgi')) return 'OZEL_DURUM';
  return 'DIGER';
}

function extractCompanyCode(title: string): string {
  const match = title.match(/\[([A-Z]{2,6})\]/);
  return match ? match[1] : 'BIST';
}

function scoreKap(title: string): number {
  const t = title.toLowerCase();
  if (t.includes('finansal tablo')) return 92;
  if (t.includes('sözleşme') || t.includes('ihale')) return 88;
  if (t.includes('temettü')) return 85;
  if (t.includes('sermaye artırım')) return 87;
  if (t.includes('geri alım')) return 80;
  if (t.includes('özel durum')) return 75;
  if (t.includes('yönetim kurulu')) return 55;
  return 40;
}

export async function GET() {
  try {
    const disclosures = await fetchKapRss();
    return NextResponse.json({ disclosures, source: 'live', lastFetch: new Date().toISOString() });
  } catch {
    return NextResponse.json({
      disclosures: MOCK_KAP,
      source: 'mock',
      lastFetch: new Date().toISOString(),
    });
  }
}
