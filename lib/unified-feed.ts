import type { NewsItem } from '@/types/news';
import type { KapDisclosure } from '@/types/kap';
import type { BrokerReport } from '@/types/broker';
import type { TcmbIndicator } from '@/types/tcmb';
import { PRIORITY_COMPANIES } from '@/data/companies';

export type SignalType = 'NEWS' | 'KAP' | 'BROKER' | 'TCMB';

export interface UnifiedSignal {
  id: string;
  type: SignalType;
  companyCode?: string;
  title: string;
  effectiveScore: number;
  date: string;
  url?: string;
  isPriority: boolean;
  sourceLabel: string;
}

export function brokerScore(r: BrokerReport): number {
  let s = 60;
  if (r.reportType === 'TAVSIYE_DEGISIM')  s = Math.max(s, 80);
  if (r.reportType === 'MODEL_PORTFOY')    s = Math.max(s, 85);
  if (r.oldTargetPrice != null) {
    const chg = r.newTargetPrice - r.oldTargetPrice;
    if (chg > 0) s = Math.max(s, 75);
    if (chg < 0) s = Math.max(s, 70);
  }
  if (PRIORITY_COMPANIES.has(r.companyCode)) s = Math.min(100, s + 10);
  return s;
}

function tcmbScore(ind: TcmbIndicator): number {
  if (ind.category === 'FAIZ')      return 65;
  if (ind.category === 'ENFLASYON') return 58;
  if (ind.category === 'REZERV')    return 52;
  return 50;
}

export function buildUnifiedFeed(
  news: NewsItem[],
  kap: KapDisclosure[],
  brokers: BrokerReport[],
  tcmb: TcmbIndicator[] = [],
): UnifiedSignal[] {
  const signals: UnifiedSignal[] = [];

  for (const n of news) {
    signals.push({
      id:             n.id,
      type:           'NEWS',
      companyCode:    n.relatedCompanies[0],
      title:          n.title,
      effectiveScore: n.importanceScore,
      date:           n.date,
      url:            n.sourceUrl,
      isPriority:     n.relatedCompanies.some((c) => PRIORITY_COMPANIES.has(c)),
      sourceLabel:    n.source,
    });
  }

  for (const k of kap) {
    signals.push({
      id:             k.id,
      type:           'KAP',
      companyCode:    k.companyCode,
      title:          k.title,
      effectiveScore: Math.min(100, k.importanceScore + 15),
      date:           k.date,
      url:            k.sourceUrl,
      isPriority:     PRIORITY_COMPANIES.has(k.companyCode),
      sourceLabel:    'KAP',
    });
  }

  for (const b of brokers) {
    const tp = b.newTargetPrice > 0
      ? `, TP ${b.newTargetPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`
      : '';
    signals.push({
      id:             b.id,
      type:           'BROKER',
      companyCode:    b.companyCode,
      title:          `${b.institution} → ${b.companyCode}: ${b.recommendation}${tp}`,
      effectiveScore: brokerScore(b),
      date:           b.date,
      url:            b.sourceUrl,
      isPriority:     PRIORITY_COMPANIES.has(b.companyCode),
      sourceLabel:    b.institution,
    });
  }

  for (const t of tcmb) {
    signals.push({
      id:             `tcmb-${t.key}`,
      type:           'TCMB',
      title:          `${t.label}: ${t.value} ${t.unit}`,
      effectiveScore: tcmbScore(t),
      date:           t.date,
      isPriority:     false,
      sourceLabel:    'TCMB',
    });
  }

  const seen = new Set<string>();
  return signals
    .filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
    .sort((a, b) => b.effectiveScore - a.effectiveScore);
}
