import { NextResponse } from 'next/server';
import { MOCK_KAP } from '@/data/mock/kap';
import { fetchKapLive } from '@/lib/kap-live';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const result = await fetchKapLive();

  // Both strategies succeeded → live data
  if (result.disclosures.length > 0) {
    return NextResponse.json({
      disclosures: result.disclosures,
      source: result.source,
      strategies: result.strategies,
      lastFetch: result.fetchedAt,
    });
  }

  // All strategies failed → mock fallback (panel never breaks)
  return NextResponse.json({
    disclosures: MOCK_KAP,
    source: 'mock',
    strategies: result.strategies,
    error: result.strategies.map((s) => `${s.strategy}: ${s.error ?? 'ok'}`).join(' | '),
    lastFetch: result.fetchedAt,
  });
}
