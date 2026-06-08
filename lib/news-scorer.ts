import { NewsCategory } from '@/types/news';

const CATEGORY_BASE: Record<NewsCategory, number> = {
  TCMB:       90,
  ENFLASYON:  88,
  FAIZ:       85,
  KUR:        80,
  BORSA:      70,
  BANKACILIK: 75,
  SIRKET:     72,
  SAVUNMA:    78,
  ENERJI:     74,
  JEOPOLITIK: 80,
  GENEL:      40,
};

const BOOST_WORDS = [
  'rekor', 'sözleşme', 'ihale', 'birleşme', 'satın alma', 'faiz', 'enflasyon',
  'sermaye artırımı', 'temettü', 'zarar', 'iflas', 'haciz', 'dava', 'anlaşma',
];

const PENALTY_WORDS = ['rutin', 'olağan', 'basın toplantısı', 'sunum'];

export function scoreNews(title: string, description: string, category: NewsCategory): number {
  let score = CATEGORY_BASE[category] ?? 50;
  const combined = (title + ' ' + description).toLowerCase();
  for (const kw of BOOST_WORDS) if (combined.includes(kw)) score = Math.min(100, score + 8);
  for (const kw of PENALTY_WORDS) if (combined.includes(kw)) score = Math.max(10, score - 15);
  return score;
}

export function categorizeNews(title: string, description: string): NewsCategory {
  const t = (title + ' ' + description).toLowerCase();
  if (t.includes('tcmb') || t.includes('merkez bankası') || t.includes('para politikası')) return 'TCMB';
  if (t.includes('enflasyon') || t.includes('tüfe') || t.includes('üfe')) return 'ENFLASYON';
  if (t.includes('faiz') || t.includes('getiri') || t.includes('tahvil')) return 'FAIZ';
  if (t.includes('dolar') || t.includes('euro') || t.includes('kur') || t.includes('döviz')) return 'KUR';
  if (t.includes('bist') || t.includes('borsa') || t.includes('endeks') || t.includes('hisse')) return 'BORSA';
  if (t.includes('banka') || t.includes('kredi') || t.includes('mevduat')) return 'BANKACILIK';
  if (t.includes('savunma') || t.includes('askeri') || t.includes('hava kuvveti')) return 'SAVUNMA';
  if (t.includes('enerji') || t.includes('petrol') || t.includes('gaz') || t.includes('elektrik')) return 'ENERJI';
  if (t.includes('jeopoliti') || t.includes('çatışma') || t.includes('ambargo')) return 'JEOPOLITIK';
  if (t.includes('şirket') || t.includes('firma') || t.includes('ihracat')) return 'SIRKET';
  return 'GENEL';
}
