export type KapCategory =
  | 'OZEL_DURUM'
  | 'FINANSAL_TABLO'
  | 'TEMETTU'
  | 'SERMAYE_ARTIRIMI'
  | 'GERI_ALIM'
  | 'IHALE'
  | 'YK_KARARI'
  | 'BORCLANMA'
  | 'DIGER';

export interface KapDisclosure {
  id: string;
  companyCode: string;
  companyName: string;
  title: string;
  category: KapCategory;
  date: string;
  summary: string;
  sourceUrl: string;
  importanceScore: number;
}

export interface KapState {
  disclosures: KapDisclosure[];
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}
