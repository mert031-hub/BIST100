export type ContentPlatform = 'INSTAGRAM_POST' | 'INSTAGRAM_CAROUSEL' | 'INSTAGRAM_STORY' | 'X_THREAD' | 'LINKEDIN' | 'TELEGRAM';

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
  title: string;
  body: string;
  hashtags: string[];
  disclaimer: string;
  sources: ContentSource[];
  createdAt: string;
}
