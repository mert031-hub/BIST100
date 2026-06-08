import { NextResponse } from 'next/server';
import { MOCK_BROKERS } from '@/data/mock/brokers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    reports: MOCK_BROKERS,
    source: 'mock',
    lastFetch: new Date().toISOString(),
  });
}
