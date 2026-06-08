/**
 * lib/route-cache.ts — Simple in-memory TTL cache for API route handlers.
 *
 * Module-level state persists across requests within the same Node.js process
 * (Next.js dev server, production containers). Serverless cold-starts reset it,
 * which is acceptable — the first request after a cold start re-populates.
 *
 * Usage:
 *   const cache = makeRouteCache<ResponseShape>(60_000); // 60s TTL
 *   const cached = cache.get();
 *   if (cached) return NextResponse.json(cached);
 *   const data = await fetchData();
 *   cache.set(data);
 *   return NextResponse.json(data);
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface RouteCache<T> {
  get(): T | null;
  set(data: T): void;
  invalidate(): void;
}

export function makeRouteCache<T>(ttlMs: number): RouteCache<T> {
  let entry: CacheEntry<T> | null = null;

  return {
    get(): T | null {
      if (entry && Date.now() < entry.expiresAt) return entry.data;
      entry = null;
      return null;
    },
    set(data: T): void {
      entry = { data, expiresAt: Date.now() + ttlMs };
    },
    invalidate(): void {
      entry = null;
    },
  };
}
