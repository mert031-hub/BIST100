import { NextResponse } from 'next/server';
import { MOCK_BROKERS } from '@/data/mock/brokers';
import { parseBrokerSources } from '@/lib/broker-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const result = await parseBrokerSources();

  // Parser found live reports → live data
  if (result.reports.length > 0) {
    return NextResponse.json({
      reports: result.reports,
      source: 'live',
      sourceStatus: result.probes,
      lastFetch: result.parsedAt,
    });
  }

  // Parser returned nothing (stub or all sources unreachable) → mock fallback
  return NextResponse.json({
    reports: MOCK_BROKERS,
    source: 'mock',
    sourceStatus: result.probes,
    lastFetch: result.parsedAt,
  });
}
