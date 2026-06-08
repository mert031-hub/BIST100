import { notFound } from 'next/navigation';

/**
 * Debug route guard — server-side, runs before the client page is sent.
 * Accessible only when:
 *   - NODE_ENV === 'development'  (local dev server)
 *   - OR DEBUG_ENABLED=true set explicitly in env (staging / test)
 *
 * In a standard Vercel production deploy neither condition is met,
 * so the route returns HTTP 404 and the client bundle is never served.
 */
export default function DebugLayout({ children }: { children: React.ReactNode }) {
  const allowed =
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_ENABLED === 'true';

  if (!allowed) notFound();

  return <>{children}</>;
}
