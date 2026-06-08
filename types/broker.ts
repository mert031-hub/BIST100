export type BrokerRecommendation = 'AL' | 'TUT' | 'SAT' | 'ENDEKS_USTU' | 'ENDEKS_ALTI' | 'GOZDEN_GECIR';

export interface BrokerReport {
  id: string;
  institution: string;
  companyCode: string;
  companyName: string;
  recommendation: BrokerRecommendation;
  oldTargetPrice?: number;
  newTargetPrice: number;
  currentPrice?: number;
  upside?: number;
  date: string;
  analyst?: string;
  sourceUrl: string;
  notes?: string;
}

export interface BrokerState {
  reports: BrokerReport[];
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}
