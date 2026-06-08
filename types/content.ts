export type ContentPlatform =
  | 'INSTAGRAM_POST'
  | 'INSTAGRAM_CAROUSEL'
  | 'INSTAGRAM_STORY'
  | 'X_THREAD'
  | 'LINKEDIN'
  | 'TELEGRAM';

export type ContentSourceType = 'NEWS' | 'KAP' | 'BROKER_REPORT' | 'TCMB';

export interface ContentSource {
  type: ContentSourceType;
  id: string;
  title: string;
  date: string;
  url?: string;
}

export interface GeneratedContent {
  platform: ContentPlatform;
  /** Headline — user-editable in the studio */
  title: string;
  /** Main body text — user-editable in the studio */
  body: string;
  /** 3-5 concise bullets for IG preview card */
  bullets: string[];
  hashtags: string[];
  disclaimer: string;
  /** BIST ticker codes mentioned across selected sources */
  companyCodes: string[];
  sources: ContentSource[];
  createdAt: string;
}
