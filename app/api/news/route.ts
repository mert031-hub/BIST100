import { NextResponse } from 'next/server';
import { MOCK_NEWS } from '@/data/mock/news';
import type { NewsItem } from '@/types/news';
import { categorizeNews, scoreNews, isFinanceRelevant, isWithinMaxAge } from '@/lib/news-scorer';
import { matchCompanies } from '@/lib/company-matcher';
import { withTimeout } from '@/lib/fetch-helpers';
import { makeRouteCache } from '@/lib/route-cache';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NEWS_CACHE_TTL = 300_000; // 5 minutes

interface NewsResponse {
  items: NewsItem[];
  source: 'live' | 'partial' | 'mock';
  feedStatus: { source: string; status: 'ok' | 'error'; count: number }[];
  okCount: number;
  companyCounts: Record<string, number>;
  lastFetch: string;
  error?: string;
}
const cache = makeRouteCache<NewsResponse>(NEWS_CACHE_TTL);

const FEED_TIMEOUT = 6000;
const MAX_ITEMS_PER_FEED = 15;

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/turkish/rss.xml',              source: 'BBC Türkçe'  },
  { url: 'https://www.ntv.com.tr/ekonomi.rss',                    source: 'NTV Ekonomi'  },
  { url: 'https://www.sabah.com.tr/rss/ekonomi.xml',              source: 'Sabah'        },
  { url: 'https://www.hurriyet.com.tr/rss/ekonomi',               source: 'Hürriyet'     },
  { url: 'https://www.milliyet.com.tr/rss/rssnew/ekonomirss.xml', source: 'Milliyet'     },
  { url: 'https://www.bloomberght.com/rss',                       source: 'BloombergHT'  },
  { url: 'https://www.dunya.com/rss/ekonomi.xml',                 source: 'Dünya'        },
  { url: 'https://ekonomi.haber7.com/rss.php',                    source: 'Haber7'       },
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
  parser: any,
): Promise<{ items: NewsItem[]; result: FeedResult }> {
  try {
    const parsed = await withTimeout(parser.parseURL(feed.url), FEED_TIMEOUT);

    const items: NewsItem[] = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((parsed as any).items ?? []) as Array<{
        title?: string; contentSnippet?: string; summary?: string;
        pubDate?: string; link?: string;
      }>
    )
      .slice(0, MAX_ITEMS_PER_FEED)
      .map((item): NewsItem | null => {
        const title       = item.title?.trim() ?? '';
        const description = (item.contentSnippet ?? item.summary ?? '').trim();

        if (title.length < 10) return null;
        if (!isFinanceRelevant(title, description)) return null;

        const dateIso = item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString();

        if (!isWithinMaxAge(dateIso)) return null;

        const category  = categorizeNews(title, description);
        const companies = matchCompanies(title + ' ' + description);

        // Stable ID: URL+date hash — survives page refreshes, prevents duplicate ContentStudio selections
        const rawId = (item.link ?? title.slice(0, 80)) + '|' + (item.pubDate ?? dateIso.slice(0, 10));
        const stableId = 'n-' + createHash('md5').update(rawId).digest('hex').slice(0, 12);

        return {
          id: stableId,
          title,
          description,
          date: dateIso,
          source: feed.source,
          sourceUrl: item.link ?? feed.url,
          category,
          relatedCompanies: companies,
          importanceScore: scoreNews(title, description, category, dateIso),
        };
      })
      .filter((i): i is NewsItem => i !== null);

    return { items, result: { source: feed.source, status: 'ok', count: items.length } };
  } catch (err) {
    return {
      items: [],
      result: {
        source: feed.source, status: 'error', count: 0,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function deduplicate(items: NewsItem[]): NewsItem[] {
  const seenTitles = new Set<string>();
  const seenUrls   = new Set<string>();
  return items.filter((item) => {
    const titleKey = item.title.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
    const urlKey   = item.sourceUrl.trim();
    if (seenTitles.has(titleKey)) return false;
    if (urlKey && seenUrls.has(urlKey)) return false;
    seenTitles.add(titleKey);
    if (urlKey) seenUrls.add(urlKey);
    return true;
  });
}

function buildCompanyCounts(items: NewsItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const code of item.relatedCompanies) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

export async function GET() {
  const cached = cache.get();
  if (cached) return NextResponse.json(cached);

  try {
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser({
      timeout: FEED_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BistRadar/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    const feedResults = await Promise.all(RSS_FEEDS.map((f) => parseFeed(f, parser)));

    const allItems   = feedResults.flatMap((r) => r.items);
    const feedStatus = feedResults.map((r) => r.result);
    const okCount    = feedStatus.filter((s) => s.status === 'ok' && s.count > 0).length;

    if (allItems.length === 0) {
      const response: NewsResponse = {
        items: MOCK_NEWS,
        source: 'mock',
        feedStatus,
        okCount: 0,
        companyCounts: buildCompanyCounts(MOCK_NEWS),
        lastFetch: new Date().toISOString(),
      };
      cache.set(response);
      return NextResponse.json(response);
    }

    const sorted = deduplicate(allItems)
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 40);

    const response: NewsResponse = {
      items: sorted,
      source: okCount === RSS_FEEDS.length ? 'live' : okCount > 0 ? 'partial' : 'mock',
      feedStatus,
      okCount,
      companyCounts: buildCompanyCounts(sorted),
      lastFetch: new Date().toISOString(),
    };
    cache.set(response);
    return NextResponse.json(response);
  } catch (err) {
    const response: NewsResponse = {
      items: MOCK_NEWS,
      source: 'mock',
      feedStatus: [],
      okCount: 0,
      companyCounts: buildCompanyCounts(MOCK_NEWS),
      error: err instanceof Error ? err.message : String(err),
      lastFetch: new Date().toISOString(),
    };
    // Don't cache errors — let next request retry
    return NextResponse.json(response);
  }
}
