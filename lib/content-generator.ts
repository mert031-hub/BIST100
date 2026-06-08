import { ContentPlatform, ContentSource, GeneratedContent } from '@/types/content';

const DISCLAIMER = '⚠️ Bu içerik bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.';

const HASHTAGS_BY_PLATFORM: Record<ContentPlatform, string[]> = {
  INSTAGRAM_POST: ['#BIST100', '#BorsaIstanbul', '#HisseAnaliz', '#Finans', '#Ekonomi'],
  INSTAGRAM_CAROUSEL: ['#BIST100', '#BorsaAnaliz', '#Yatırım', '#Finans'],
  INSTAGRAM_STORY: ['#BIST', '#Borsa', '#Hisse'],
  X_THREAD: ['#BIST100', '#THYAO', '#Finans', '#Borsa'],
  LINKEDIN: ['#BorsaIstanbul', '#BIST100', '#FinansAnaliz', '#KAPBildirimi'],
  TELEGRAM: ['#BIST100', '#KAP', '#HaberAkışı'],
};

export function generateContent(
  platform: ContentPlatform,
  sources: ContentSource[],
  companyCode?: string
): GeneratedContent {
  const mainSource = sources[0];
  const title = `📊 ${mainSource?.title ?? 'Piyasa Güncelleme'}`;

  let body = '';

  switch (platform) {
    case 'INSTAGRAM_POST':
      body = buildInstagramPost(sources, companyCode);
      break;
    case 'INSTAGRAM_CAROUSEL':
      body = buildCarousel(sources, companyCode);
      break;
    case 'INSTAGRAM_STORY':
      body = buildStory(sources, companyCode);
      break;
    case 'X_THREAD':
      body = buildXThread(sources, companyCode);
      break;
    case 'LINKEDIN':
      body = buildLinkedIn(sources, companyCode);
      break;
    case 'TELEGRAM':
      body = buildTelegram(sources, companyCode);
      break;
  }

  return {
    platform,
    title,
    body,
    hashtags: HASHTAGS_BY_PLATFORM[platform],
    disclaimer: DISCLAIMER,
    sources,
    createdAt: new Date().toISOString(),
  };
}

function buildInstagramPost(sources: ContentSource[], companyCode?: string): string {
  const main = sources[0];
  return [
    `📌 ${companyCode ? `$${companyCode}` : 'BIST100'} | ${new Date(main.date).toLocaleDateString('tr-TR')}`,
    '',
    `${main.title}`,
    '',
    '📎 Detaylar için kaynağı inceleyebilirsiniz.',
    '',
    DISCLAIMER,
  ].join('\n');
}

function buildCarousel(sources: ContentSource[], companyCode?: string): string {
  const slides = sources.map((s, i) => `Slide ${i + 1}: ${s.title}`).join('\n');
  return [
    `📊 ${companyCode ? `$${companyCode}` : 'BIST100'} Özet`,
    '',
    slides,
    '',
    DISCLAIMER,
  ].join('\n');
}

function buildStory(sources: ContentSource[], companyCode?: string): string {
  const main = sources[0];
  return [
    `⚡ ${companyCode ?? 'BIST'} HABER`,
    main.title,
    DISCLAIMER,
  ].join('\n');
}

function buildXThread(sources: ContentSource[], companyCode?: string): string {
  return sources
    .map((s, i) => `${i + 1}/ ${s.title} ${s.url ? `\n🔗 ${s.url}` : ''}`)
    .join('\n\n') + `\n\n${DISCLAIMER}`;
}

function buildLinkedIn(sources: ContentSource[], companyCode?: string): string {
  const main = sources[0];
  return [
    `${companyCode ? `$${companyCode}` : 'Piyasa'} Gündem Özeti`,
    '',
    main.title,
    '',
    sources.slice(1).map((s) => `• ${s.title}`).join('\n'),
    '',
    'Detaylı analiz için kaynakları inceleyiniz.',
    '',
    DISCLAIMER,
  ].join('\n');
}

function buildTelegram(sources: ContentSource[], companyCode?: string): string {
  return [
    `📡 <b>${companyCode ? `$${companyCode}` : 'BIST100'} GÜNCEL</b>`,
    '',
    ...sources.map((s) => `• <a href="${s.url ?? '#'}">${s.title}</a>`),
    '',
    `<i>${DISCLAIMER}</i>`,
  ].join('\n');
}
