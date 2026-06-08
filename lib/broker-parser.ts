/**
 * lib/broker-parser.ts — Aracı Kurum Rapor Parser (Prototip / Mock)
 *
 * Mevcut durum: KAYNAK PROBE aşaması.
 *   - Her aktif kaynak için HEAD isteği atar → erişilebilirlik ölçer.
 *   - Gerçek rapor ayrıştırma YAPILMAZ (BrokerReport[] boş döner).
 *   - API route mock veriye fallback yapar.
 *
 * Bir sonraki aşamada eklenecekler (kaynak tipine göre):
 *   HTML → cheerio veya regex ile tablo/liste parse
 *   PDF  → pdf-parse veya başka lib ile metin çıkarma
 *   RSS  → rss-parser ile feed okuma (KAP modeline benzer)
 *
 * Şimdilik bu dosya şunu sağlar:
 *   1. probeSource()     → tek kaynak erişilebilirlik testi
 *   2. probeAllSources() → tüm aktif kaynakları eş zamanlı probe eder
 *   3. parseBrokerSources() → probe + boş rapor listesi döner
 */

import type { BrokerReport } from '@/types/broker';
import { getActiveSources, type BrokerSource, type SourceProbeResult } from '@/lib/broker-sources';

const PROBE_TIMEOUT_MS = 4000;

export interface BrokerParseResult {
  reports: BrokerReport[];           // şimdilik her zaman boş
  probes: SourceProbeResult[];       // her aktif kaynak için probe sonucu
  parsedAt: string;
}

/**
 * Tek bir kaynağa HEAD isteği atar ve erişilebilirliğini raporlar.
 * Bloklu / hatalı kaynaklar exception fırlatmaz; status alanına yazar.
 */
export async function probeSource(source: BrokerSource): Promise<SourceProbeResult> {
  const t0 = Date.now();

  if (!source.active) {
    return {
      id: source.id,
      institution: source.institution,
      type: source.type,
      url: source.url,
      status: 'skipped',
      durationMs: 0,
    };
  }

  try {
    const res = await fetch(source.url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BistRadar/1.0; +https://github.com)',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });

    const durationMs = Date.now() - t0;

    // 200-299 → reachable; 3xx redirects followed by fetch automatically
    if (res.ok || (res.status >= 200 && res.status < 400)) {
      return {
        id: source.id,
        institution: source.institution,
        type: source.type,
        url: source.url,
        status: 'reachable',
        httpStatus: res.status,
        durationMs,
      };
    }

    // 401/403/407/429/451 → access is blocked
    if ([401, 403, 407, 429, 451].includes(res.status)) {
      return {
        id: source.id,
        institution: source.institution,
        type: source.type,
        url: source.url,
        status: 'blocked',
        httpStatus: res.status,
        error: `HTTP ${res.status}`,
        durationMs,
      };
    }

    return {
      id: source.id,
      institution: source.institution,
      type: source.type,
      url: source.url,
      status: 'error',
      httpStatus: res.status,
      error: `HTTP ${res.status}`,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.toLowerCase().includes('timeout') || msg.includes('abort');
    return {
      id: source.id,
      institution: source.institution,
      type: source.type,
      url: source.url,
      status: isTimeout ? 'timeout' : 'error',
      error: msg,
      durationMs,
    };
  }
}

/**
 * Tüm aktif kaynakları eş zamanlı probe eder.
 * Kısa timeout sayesinde toplam gecikme ~4s ile sınırlıdır.
 */
export async function probeAllSources(): Promise<SourceProbeResult[]> {
  const sources = getActiveSources();
  return Promise.all(sources.map(probeSource));
}

/**
 * Ana ayrıştırıcı.
 * Şu an sadece probe yapar, BrokerReport ayrıştırması YAPILMAZ.
 * Çağıran (route.ts) boş rapor listesini görünce mock'a fallback yapar.
 *
 * Üretim parser geldiğinde bu fonksiyon, reachable kaynaklardan
 * içerik çekecek ve BrokerReport[] dolduracak.
 */
export async function parseBrokerSources(): Promise<BrokerParseResult> {
  const probes = await probeAllSources();

  // Gelecekte: reachable kaynakları filtrele → her biri için tipine göre parser çağır
  // const reachable = probes.filter((p) => p.status === 'reachable');
  // const reports = await parseReachableSources(reachable);

  return {
    reports: [],   // stub — parser henüz implement edilmedi
    probes,
    parsedAt: new Date().toISOString(),
  };
}
