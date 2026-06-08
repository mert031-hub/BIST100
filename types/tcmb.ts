export interface TcmbIndicator {
  key: string;
  label: string;
  value: string | number;
  unit: string;
  change?: number;
  changePercent?: number;
  date: string;
  category: 'FAIZ' | 'ENFLASYON' | 'KUR' | 'REZERV' | 'DISTICARET' | 'ISTIHDAM' | 'URETIM';
}

export interface TcmbState {
  indicators: TcmbIndicator[];
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}
