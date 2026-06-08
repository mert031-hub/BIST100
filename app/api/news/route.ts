import { NextResponse } from 'next/server';
import { MOCK_NEWS } from '@/data/mock/news';
import { NewsItem } from '@/types/news';
import { categorizeNews, scoreNews } from '@/lib/news-scorer';
import { matchCompanies } from '@/lib/company-matcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RSS_FEEDS = [
  { url: 'https://www.bloomberght.com/rss', source: 'BloombergHT' },
  { url: 'https://www.dunya.com/rss/economy.xml', source: 'Dünya' },
  { url: 'https://feeds.bbci.co.uk/turkish/rss.xml', source: 'BBC Türkçe' },
  { url: 'https://www.haberturk.com/rss/ekonomi.xml', source: 'Haberturk' },
];

async function fetchRssFeeds(): Promise<NewsItem[]> {
  const Parser = (await import('rss-parser')).default;
  const parser = new Parser({ timeout: 6000 });

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items ?? []).slice(0, 8).map((item, idx) => {
        const title = item.title ?? '';
        const description = item.contentSnippet ?? item.summary ?? '';
        const category = categorizeNews(title, description);
        const companies = matchCompanies(title + ' ' + description);

        return {
          id: `rss-${feed.source}-${idx}`,
          title,
          description,
          date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          source: feed.source,
          sourceUrl: item.link ?? feed.url,
          category,
          relatedCompanies: companies,
          importanceScore: scoreNews(title, description, category),
        } as NewsItem;
      });
    })
  );

  const allItems: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  return allItems.sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 30);
}

export async function GET() {
  try {
    const items = await fetchRssFeeds();
    if (items.length === 0) throw new Error('No items');
    return NextResponse.json({ items, source: 'live', lastFetch: new Date().toISOString() });
  } catch {
    return NextResponse.json({
      items: MOCK_NEWS,
      source: 'mock',
      lastFetch: new Date().toISOString(),
    });
  }
}
