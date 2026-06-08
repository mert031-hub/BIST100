import { NextResponse } from 'next/server';
import { MOCK_BROKERS } from '@/data/mock/brokers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Broker reports from publicly available RSS feeds
const BROKER_RSS_FEEDS = [
  { url: 'https://www.isyatirim.com.tr/analiz-ve-raporlar/rss', institution: 'İş Yatırım' },
  { url: 'https://arastirma.akyatirim.com.tr/rss', institution: 'AK Yatırım' },
];

async function fetchBrokerRss() {
  const Parser = (await import('rss-parser')).default;
  const parser = new Parser({ timeout: 5000 });

  const results = await Promise.allSettled(
    BROKER_RSS_FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items ?? []).slice(0, 5).map((item, idx) => ({
        id: `broker-live-${feed.institution}-${idx}`,
        institution: feed.institution,
        companyCode: 'BIST',
        companyName: item.creator ?? '',
        recommendation: 'TUT' as const,
        newTargetPrice: 0,
        date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        sourceUrl: item.link ?? feed.url,
        notes: item.title ?? '',
      }));
    })
  );

  const all = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

export async function GET() {
  try {
    const reports = await fetchBrokerRss();
    if (reports.length === 0) throw new Error('No reports');
    return NextResponse.json({ reports, source: 'live', lastFetch: new Date().toISOString() });
  } catch {
    return NextResponse.json({
      reports: MOCK_BROKERS,
      source: 'mock',
      lastFetch: new Date().toISOString(),
    });
  }
}
