import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Lightweight health check — verifies each external data source is reachable.
 * Returns JSON with connectivity status for each source.
 */
const PROBES = [
  { key: 'yahoo',   url: 'https://query1.finance.yahoo.com/v1/test/getcrumb', timeout: 4000 },
  { key: 'bbc_rss', url: 'https://feeds.bbci.co.uk/turkish/rss.xml',          timeout: 4000 },
  { key: 'ntv_rss', url: 'https://www.ntv.com.tr/ekonomi.rss',                timeout: 4000 },
  { key: 'kap_rss', url: 'https://www.kap.org.tr/tr/rss/bildirimler',         timeout: 4000 },
  { key: 'evds',    url: 'https://evds2.tcmb.gov.tr',                          timeout: 4000 },
] as const;

async function probe(url: string, timeout: number): Promise<'reachable' | 'blocked' | 'error'> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': 'BistRadar/1.0' },
    });
    if (res.status === 403 || res.status === 407) return 'blocked';
    return 'reachable';
  } catch (e) {
    const msg = String(e);
    if (msg.includes('allowlist') || msg.includes('blocked')) return 'blocked';
    return 'error';
  }
}

export async function GET() {
  const results = await Promise.all(
    PROBES.map(async (p) => ({
      key: p.key,
      url: p.url,
      status: await probe(p.url, p.timeout),
    }))
  );

  const reachable = results.filter((r) => r.status === 'reachable').length;
  const overall = reachable === results.length ? 'live' : reachable > 0 ? 'partial' : 'offline';

  return NextResponse.json({
    overall,
    reachable,
    total: results.length,
    sources: results,
    checkedAt: new Date().toISOString(),
  });
}
