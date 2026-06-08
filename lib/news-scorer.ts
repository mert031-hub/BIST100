import { NewsItem, NewsCategory } from '@/types/news';

const CATEGORY_BASE_SCORES: Record<NewsCategory, number> = {
  TCMB: 90,
  ENFLASYON: 88,
  FAIZ: 85,
  KUR: 80,
  BORSA: 70,
  BANKACILIK: 75,
  SIRKET: 72,
  SAVUNMA: 78,
  ENERJI: 74,
  JEOPOLITIK: 80,
  GENEL: 40,
};

const HIGH_IMPACT_KEYWORDS = [
  'rekor', 'sözleşme', 'ihale', 'birleşme', 'satın alma', 'faiz', 'enflasyon',
  'sermaye artırımı', 'temettü', 'zarar', 'iflas', 'haciz', 'dava',
];

const LOW_IMPACT_KEYWORDS = [
  'rutin', 'olağan', 'basın toplantısı', 'sunum',
];

export function scoreNews(title: string, description: string, category: NewsCategory): number {
  let score = CATEGORY_BASE_SCORES[category] ?? 50;
  const combined = (title + ' ' + description).toLowerCase();

  for (const kw of HIGH_IMPACT_KEYWORDS) {
    if (combined.includes(kw)) {
      score = Math.min(100, score + 8);
    }
  }

  for (const kw of LOW_IMPACT_KEYWORDS) {
    if (combined.includes(kw)) {
      score = Math.max(10, score - 15);
    }
  }

  return score;
}

export function categorizeNews(title: string, description: string): NewsCategory {
  const text = (title + ' ' + description).toLowerCase();

  if (text.includes('tcmb') || text.includes('merkez bankası') || text.includes('para politikası')) return 'TCMB';
  if (text.includes('enflasyon') || text.includes('tüfe') || text.includes('üfe') || text.includes('fiyat')) return 'ENFLASYON';
  if (text.includes('faiz') || text.includes('getiri') || text.includes('tahvil')) return 'FAIZ';
  if (text.includes('dolar') || text.includes('euro') || text.includes('kur') || text.includes('döviz')) return 'KUR';
  if (text.includes('bist') || text.includes('borsa') || text.includes('endeks') || text.includes('hisse')) return 'BORSA';
  if (text.includes('banka') || text.includes('kredi') || text.includes('mevduat')) return 'BANKACILIK';
  if (text.includes('savunma') || text.includes('askeri') || text.includes('savaş') || text.includes('hava kuvveti')) return 'SAVUNMA';
  if (text.includes('enerji') || text.includes('petrol') || text.includes('gaz') || text.includes('elektrik')) return 'ENERJI';
  if (text.includes('jeopoliti') || text.includes('savaş') || text.includes('çatışma') || text.includes('ambargo')) return 'JEOPOLITIK';
  if (text.includes('şirket') || text.includes('firma') || text.includes('ortaklık') || text.includes('ihracat')) return 'SIRKET';

  return 'GENEL';
}

export function sortByImportance<T extends { importanceScore: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.importanceScore - a.importanceScore);
}
