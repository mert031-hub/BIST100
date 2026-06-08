export type KapCategory =
  | 'OZEL_DURUM'
  | 'FINANSAL_TABLO'
  | 'TEMETTU'
  | 'SERMAYE_ARTIRIMI'
  | 'GERI_ALIM'
  | 'IHALE'
  | 'YEN_IS_ILISKISI'
  | 'YK_KARARI'
  | 'BORCLANMA'
  | 'DIGER';

export interface KapDisclosure {
  id: string;
  companyCode: string;
  companyName: string;
  title: string;
  summary: string;
  category: KapCategory;
  date: string;
  sourceUrl: string;
  importanceScore: number;
  /** Suitable for Content Studio (score ≥ 55 and category warrants analysis) */
  contentReady: boolean;
}

export interface KapState {
  disclosures: KapDisclosure[];
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}
