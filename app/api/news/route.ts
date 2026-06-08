import { NextResponse } from 'next/server';
import { MOCK_NEWS } from '@/data/mock/news';
import type { NewsItem } from '@/types/news';
import { categorizeNews, scoreNews } from '@/lib/news-scorer';
import { matchCompanies } from '@/lib/company-matcher';
import { withTimeout } from '@/lib/fetch-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FEED_TIMEOUT = 6000;
const MAX_ITEMS_PER_FEED = 10;

/**
 * Turkish financial / economic RSS feeds — ordered by reliability.
 * Each feed is tried independently; failures are isolated.
 */
const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/turkish/rss.xml',             source: 'BBC Türkçe'  },
  { url: 'https://www.ntv.com.tr/ekonomi.rss',                   source: 'NTV Ekonomi'  },
  { url: 'https://www.sabah.com.tr/rss/ekonomi.xml',             source: 'Sabah'        },
  { url: 'https://www.hurriyet.com.tr/rss/ekonomi',              source: 'Hürriyet'     },
  { url: 'https://www.milliyet.com.tr/rss/rssnew/ekonomirss.xml',source: 'Milliyet'     },
  { url: 'https://www.bloomberght.com/rss',                      source: 'BloombergHT'  },
  { url: 'https://www.dunya.com/rss/ekonomi.xml',                source: 'Dünya'        },
  { url: 'https://ekonomi.haber7.com/rss.php',                   source: 'Haber7'       },
] as const;

interface FeedResult {
  source: string;
  status: 'ok' | 'error';
  count: number;
  error?: string;
}

async function parseFeed(
  feed: { url: string; source: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parser: any
): Promise<{ items: NewsItem[]; result: FeedResult }> {
  try {
    const parsed = await withTimeout(
      parser.parseURL(feed.url),
      FEED_TIMEOUT
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: NewsItem[] = ((parsed as any).items ?? [])
      .slice(0, MAX_ITEMS_PER_FEED)
      .map((item: { title?: string; contentSnippet?: string; summary?: string; pubDate?: string; link?: string }, idx: number): NewsItem => {
        const title = item.title?.trim() ?? '';
        const description = (item.contentSnippet ?? item.summary ?? '').trim();
        const category = categorizeNews(title, description);
        const companies = matchCompanies(title + ' ' + description);

        return {
          id: `rss-${feed.source.replace(/\s/g, '')}-${idx}`,
          title,
          description,
          date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          source: feed.source,
          sourceUrl: item.link ?? feed.url,
          category,
          relatedCompanies: companies,
          importanceScore: scoreNews(title, description, category),
        };
      })
      .filter((i: NewsItem) => i.title.length > 5); // discard stub items

    return {
      items,
      result: { source: feed.source, status: 'ok', count: items.length },
    };
  } catch (err) {
    return {
      items: [],
      result: {
        source: feed.source,
        status: 'error',
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function deduplicateByTitle(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    // normalise title for comparison
    const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  try {
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser({
      timeout: FEED_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BistRadar/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    const feedResults = await Promise.all(
      RSS_FEEDS.map((feed) => parseFeed(feed, parser))
    );

    const allItems = feedResults.flatMap((r) => r.items);
    const feedStatus = feedResults.map((r) => r.result);
    const okCount = feedStatus.filter((s) => s.status === 'ok' && s.count > 0).length;

    if (allItems.length === 0) {
      return NextResponse.json({
        items: MOCK_NEWS,
        source: 'mock',
        feedStatus,
        lastFetch: new Date().toISOString(),
      });
    }

    const sorted = deduplicateByTitle(allItems)
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 40);

    const source = okCount === RSS_FEEDS.length ? 'live' : okCount > 0 ? 'partial' : 'mock';

    return NextResponse.json({
      items: sorted,
      source,
      feedStatus,
      okCount,
      lastFetch: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      items: MOCK_NEWS,
      source: 'mock',
      feedStatus: [],
      error: err instanceof Error ? err.message : String(err),
      lastFetch: new Date().toISOString(),
    });
  }
}
