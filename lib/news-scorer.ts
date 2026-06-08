import type { NewsCategory } from '@/types/news';
import { PRIORITY_COMPANIES } from '@/data/companies';

// ─── Finance relevance filter ─────────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  'maç sonuç', 'gol attı', 'lig puan', 'teknik direktör', 'futbol',
  'basketbol', 'voleybol', 'şampiyon oldu', 'tribün', 'deplasman',
  'kurbanlık', 'kurban bayram', 'tatil önerileri', 'yemek tarifi', 'diyet',
  'hamilelik', 'bebek bakım', 'düğün haberi',
  'hava durumu', 'yağış bekleniyor', 'sıcak hava uyarısı', 'kar yağacak',
  'magazin', 'ünlüler', 'oyuncu tutukl', 'şarkıcı',
  'trafik kazasında', 'yangında hayat', 'cinayete kurban',
  'okul kayıt', ' lgs ', ' yks ',
  'astroloji', 'burç yorumu', 'tarihte bugün', 'günün fotoğrafı',
  'seçim kampanya', 'siyasi parti mitingi', 'milletvekili seçim',
];

const FINANCE_PATTERNS = [
  'faiz', 'enflasyon', 'tüfe', 'üfe', 'gsyh', 'büyüme', 'resesyon',
  'döviz', ' kur ', 'dolar', 'euro', 'sterlin', 'swap', 'rezerv',
  'bütçe', 'ihracat', 'ithalat', 'cari açık', 'dış ticaret',
  'tcmb', 'merkez bankası', 'bddk', ' spk ', 'hazine bakanlığ', 'imf ',
  'para politikası', 'ppk toplantı',
  'bist', 'borsa', 'hisse', 'endeks', 'piyasa', 'seans',
  'tahvil', 'bono', 'eurobond', 'faiz getiri',
  'altın fiyat', 'gümüş', 'petrol fiyat', 'brent', 'doğalgaz',
  'halka arz', 'temettü', 'kâr açıkladı', 'net zarar', 'net kâr',
  'birleşme', 'satın alma', 'devralma', 'iş ortaklığı',
  'ihale kazandı', 'sözleşme imzaladı', 'sipariş aldı', 'ihracat rekoru',
  'aselsan', 'türk hava yol', 'tüpraş', 'tupraş', 'akbank',
  'bim market', 'turkcell', 'ereğli demir', 'erdemir', 'şişecam', 'tofaş', 'migros',
  'yapı kredi', 'koç holding', 'sabancı', 'pegasus', 'ford otosan',
  'bankacılık sektör', 'savunma sanayii', 'enerji sektör',
  'kamuoyuna açıkl', 'özel durum açıkl', 'kap bildirimi',
  'hedef fiyat', 'yatırım tavsiy', 'analist raporu',
  'ekonomi', 'finansal', 'mali ', 'sermaye piyasa', 'yatırım fonu',
  'kredi notu', 'moody', 'fitch', "s&p", 'rating',
  'geri alım', 'sermaye artırım', 'bedelli', 'bedelsiz',
];

export function isFinanceRelevant(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase();
  if (BLOCKED_PATTERNS.some((p) => text.includes(p))) return false;
  return FINANCE_PATTERNS.some((p) => text.includes(p));
}

// ─── Age filter ───────────────────────────────────────────────────────────────

export function isWithinMaxAge(dateIso: string): boolean {
  return Date.now() - new Date(dateIso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

// ─── Freshness bonus ──────────────────────────────────────────────────────────

export function freshnessBonus(dateIso: string): number {
  const m = (Date.now() - new Date(dateIso).getTime()) / 60_000;
  if (m <   15) return 20;
  if (m <   30) return 16;
  if (m <   60) return 12;
  if (m <  180) return  8;
  if (m <  360) return  4;
  if (m <  720) return  1;
  if (m < 1440) return  0;
  return -5;
}

// ─── Human-readable age label ─────────────────────────────────────────────────

export function ageLabel(dateIso: string): string {
  const m = Math.floor((Date.now() - new Date(dateIso).getTime()) / 60_000);
  if (m <  1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

// ─── Category classification ──────────────────────────────────────────────────

export function categorizeNews(title: string, description: string): NewsCategory {
  const t = (title + ' ' + description).toLowerCase();
  if (t.includes('tcmb') || t.includes('merkez bankası') || t.includes('para politikası') || t.includes('ppk')) return 'TCMB';
  if (t.includes('enflasyon') || t.includes('tüfe') || t.includes('üfe') || t.includes('fiyat endeksi')) return 'ENFLASYON';
  if (t.includes('faiz') || (t.includes('getiri') && t.includes('tahvil'))) return 'FAIZ';
  if (t.includes('dolar') || t.includes('euro') || (t.includes('kur') && !t.includes('kurban')) || t.includes('döviz')) return 'KUR';
  if (t.includes('savunma') || t.includes('aselsan') || t.includes('roketsan') || t.includes('ssb')) return 'SAVUNMA';
  if (t.includes('petrol') || t.includes('brent') || t.includes('doğalgaz') || t.includes('tüpraş') || t.includes('tupraş')) return 'ENERJI';
  if (t.includes('banka') || t.includes('bddk') || t.includes('mevduat') || t.includes('kredi büyüme')) return 'BANKACILIK';
  if (t.includes('bist') || t.includes('borsa') || t.includes('endeks') || (t.includes('hisse') && t.includes('piyasa'))) return 'BORSA';
  if (t.includes('jeopoliti') || t.includes('çatışma') || t.includes('ambargo')) return 'JEOPOLITIK';
  return 'SIRKET';
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const CATEGORY_BASE: Record<NewsCategory, number> = {
  TCMB:       92,
  ENFLASYON:  90,
  FAIZ:       88,
  KUR:        80,
  SAVUNMA:    80,  // raised — defense is high content priority
  BANKACILIK: 76,
  ENERJI:     75,
  BORSA:      72,
  SIRKET:     75,  // raised from 70 — company news is core content
  JEOPOLITIK: 68,
  GENEL:      40,
};

// High-signal words — company actions and financial events
const BOOST_WORDS = [
  // Company actions (very high signal for content)
  'sözleşme imzaladı', 'ihale kazandı', 'sipariş aldı', 'anlaşma imzaladı',
  'birleşme', 'satın alma', 'devralma', 'iş birliği anlaşması',
  // Financial events
  'kâr açıkladı', 'zarar açıkladı', 'gelir açıkladı', 'finansal sonuç',
  'temettü', 'kâr payı', 'temettü kararı',
  'geri alım', 'hisse geri alım',
  'sermaye artırım', 'bedelli', 'bedelsiz',
  'hedef fiyat', 'hedef fiyat revize', 'tavsiye değiş',
  'halka arz',
  // Scale indicators
  'milyar dolar', 'milyar tl', 'milyon dolar',
  'rekor', 'tarihi', 'ilk kez', 'sürpriz karar',
];

// Low-signal words — opinion / commentary / soft news
const PENALTY_WORDS = [
  'röportaj', 'söyleşi', 'köşe yazısı', 'köşe yazarı',
  'genel değerlendirme', 'görünüm raporu', 'yıl sonu beklentisi',
  'rutin toplantı', 'olağan toplantı', 'basın toplantısı',
  'sempozyum', 'panelde konuştu', 'sunum yaptı',
];

/**
 * Score a news item from 0–100.
 *
 * @param relatedCompanies — BIST codes matched in title/description.
 *   If any are in PRIORITY_COMPANIES, the item gets a +10 boost.
 *   This ensures ASELS/THYAO/TUPRS etc. surface above generic economy news.
 */
export function scoreNews(
  title: string,
  description: string,
  category: NewsCategory,
  dateIso: string,
  relatedCompanies: string[] = [],
): number {
  let s = CATEGORY_BASE[category] ?? 40;
  s += freshnessBonus(dateIso);

  const combined = (title + ' ' + description).toLowerCase();

  for (const w of BOOST_WORDS)   if (combined.includes(w)) s = Math.min(100, s + 8);
  for (const w of PENALTY_WORDS) if (combined.includes(w)) s = Math.max(10,  s - 15);

  // Priority company boost — these companies are the content focus
  if (relatedCompanies.some((c) => PRIORITY_COMPANIES.has(c))) {
    s = Math.min(100, s + 10);
  }

  return Math.round(Math.min(100, Math.max(0, s)));
}
