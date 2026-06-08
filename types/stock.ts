export interface Stock {
  symbol: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  sparkline: number[];
  lastUpdated: string;
  high: number;
  low: number;
  marketCap?: number;
}

export interface StockState {
  stocks: Stock[];
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}
