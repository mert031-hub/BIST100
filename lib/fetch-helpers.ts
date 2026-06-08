/**
 * Races a promise against a timeout. Rejects with a timeout error if the
 * promise does not settle within `ms` milliseconds.
 * Note: does NOT cancel the original promise (no abort signal forwarded),
 * so it's safe to use with third-party libraries that don't accept signals.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timer]);
}

/**
 * HTTP statuses that indicate the host is blocked / not reachable.
 * On these codes we fail immediately instead of waiting for a full timeout.
 */
export const BLOCKED_STATUSES = new Set([403, 451, 407, 429]);

/**
 * Fetch with a built-in timeout via AbortSignal and standard browser-like headers.
 * Throws on network errors, timeouts, or blocked status codes.
 */
export async function timedFetch(url: string, ms = 7000): Promise<Response> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BistRadar/1.0; +https://github.com)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
      'Cache-Control': 'no-cache',
    },
  });

  if (BLOCKED_STATUSES.has(res.status)) {
    throw new Error(`HTTP ${res.status}: host blocked or rate-limited`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res;
}
