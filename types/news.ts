export type NewsCategory =
  | 'ENFLASYON'
  | 'TCMB'
  | 'FAIZ'
  | 'KUR'
  | 'BORSA'
  | 'SIRKET'
  | 'JEOPOLITIK'
  | 'ENERJI'
  | 'SAVUNMA'
  | 'BANKACILIK'
  | 'GENEL';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  date: string;
  source: string;
  sourceUrl: string;
  category: NewsCategory;
  relatedCompanies: string[];
  importanceScore: number;
}

export interface NewsState {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}
