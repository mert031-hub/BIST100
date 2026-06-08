import { NextResponse } from 'next/server';
import { MOCK_KAP } from '@/data/mock/kap';
import { fetchKapLive } from '@/lib/kap-live';
import { makeRouteCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KAP_CACHE_TTL = 180_000; // 3 minutes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = makeRouteCache<Record<string, any>>(KAP_CACHE_TTL);

export async function GET() {
  const cached = cache.get();
  if (cached) return NextResponse.json(cached);

  const result = await fetchKapLive();

  // Both strategies succeeded → live data
  if (result.disclosures.length > 0) {
    const response = {
      disclosures: result.disclosures,
      source: result.source,
      strategies: result.strategies,
      lastFetch: result.fetchedAt,
    };
    cache.set(response);
    return NextResponse.json(response);
  }

  // All strategies failed → mock fallback (panel never breaks)
  const response = {
    disclosures: MOCK_KAP,
    source: 'mock',
    strategies: result.strategies,
    error: result.strategies.map((s) => `${s.strategy}: ${s.error ?? 'ok'}`).join(' | '),
    lastFetch: result.fetchedAt,
  };
  // Cache mock too — prevents hammering KAP when blocked
  cache.set(response);
  return NextResponse.json(response);
}
