export type BrokerRecommendation =
  | 'AL'
  | 'TUT'
  | 'SAT'
  | 'ENDEKS_USTU'
  | 'ENDEKS_ALTI'
  | 'GOZDEN_GECIR';

export type BrokerReportType =
  | 'HEDEF_FIYAT'       // target price revision (up or down)
  | 'TAVSIYE_DEGISIM'   // recommendation change
  | 'MODEL_PORTFOY'     // model portfolio add/remove
  | 'SEKTOR_RAPORU'     // sector-level research
  | 'DIGER';

export type ModelPortfolioAction = 'EKLENDI' | 'CIKARILDI';

/** Rank used to determine whether recommendation went up or down. */
export const REC_RANK: Record<BrokerRecommendation, number> = {
  AL:            5,
  ENDEKS_USTU:   4,
  TUT:           3,
  GOZDEN_GECIR:  2,
  ENDEKS_ALTI:   1,
  SAT:           0,
};

export interface BrokerReport {
  id: string;
  institution: string;
  companyCode: string;
  companyName: string;
  recommendation: BrokerRecommendation;
  previousRecommendation?: BrokerRecommendation;
  oldTargetPrice?: number;
  newTargetPrice: number;
  currentPrice?: number;
  /** Upside potential % based on current price vs new target */
  upside?: number;
  reportType: BrokerReportType;
  modelPortfolioAction?: ModelPortfolioAction;
  date: string;
  analyst?: string;
  sourceUrl: string;
  notes?: string;
  importanceScore: number;
  /** Suitable for Content Studio */
  contentReady: boolean;
}

export interface BrokerState {
  reports: BrokerReport[];
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}
