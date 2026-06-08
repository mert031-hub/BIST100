import { ContentPlatform, ContentSource, GeneratedContent } from '@/types/content';

const DISCLAIMER = '⚠️ Bu içerik bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.';

const HASHTAGS: Record<ContentPlatform, string[]> = {
  INSTAGRAM_POST:     ['#BIST100', '#BorsaIstanbul', '#HisseAnaliz', '#Finans', '#Ekonomi'],
  INSTAGRAM_CAROUSEL: ['#BIST100', '#BorsaAnaliz', '#Finans', '#Hisse'],
  INSTAGRAM_STORY:    ['#BIST', '#Borsa', '#Hisse'],
  X_THREAD:           ['#BIST100', '#Finans', '#Borsa', '#KAP'],
  LINKEDIN:           ['#BorsaIstanbul', '#BIST100', '#FinansAnaliz', '#KAPBildirimi'],
  TELEGRAM:           ['#BIST100', '#KAP', '#HaberAkışı'],
};

export function generateContent(
  platform: ContentPlatform,
  sources: ContentSource[],
  companyCode?: string
): GeneratedContent {
  const mainSource = sources[0];
  const title = `📊 ${mainSource?.title ?? 'Piyasa Güncelleme'}`;
  const tag = companyCode ? `$${companyCode}` : 'BIST100';
  const dateStr = mainSource ? new Date(mainSource.date).toLocaleDateString('tr-TR') : '';

  let body = '';
  switch (platform) {
    case 'INSTAGRAM_POST':
      body = [
        `📌 ${tag} | ${dateStr}`,
        '',
        mainSource?.title ?? '',
        '',
        sources.slice(1, 3).map((s) => `• ${s.title}`).join('\n'),
        '',
        '📎 Detaylar için kaynağı inceleyebilirsiniz.',
        '',
        DISCLAIMER,
      ].filter(Boolean).join('\n');
      break;

    case 'INSTAGRAM_CAROUSEL':
      body = sources
        .map((s, i) => [
          `— Slide ${i + 1} —`,
          s.title,
        ].join('\n'))
        .join('\n\n') + `\n\n${DISCLAIMER}`;
      break;

    case 'INSTAGRAM_STORY':
      body = [
        `⚡ ${tag}`,
        '',
        mainSource?.title ?? '',
        '',
        DISCLAIMER,
      ].join('\n');
      break;

    case 'X_THREAD':
      body = sources
        .map((s, i) => `${i + 1}/ ${s.title}${s.url ? `\n🔗 ${s.url}` : ''}`)
        .join('\n\n') + `\n\n${DISCLAIMER}`;
      break;

    case 'LINKEDIN':
      body = [
        `${tag} — Gündem Özeti | ${dateStr}`,
        '',
        mainSource?.title ?? '',
        '',
        sources.slice(1).map((s) => `• ${s.title}`).join('\n'),
        '',
        'Detaylı analiz için kaynakları inceleyiniz.',
        '',
        DISCLAIMER,
      ].filter(Boolean).join('\n');
      break;

    case 'TELEGRAM':
      body = [
        `📡 <b>${tag} GÜNCEL</b>`,
        '',
        ...sources.map((s) => `• <a href="${s.url ?? '#'}">${s.title}</a>`),
        '',
        `<i>${DISCLAIMER}</i>`,
      ].join('\n');
      break;
  }

  return {
    platform,
    title,
    body,
    hashtags: HASHTAGS[platform],
    disclaimer: DISCLAIMER,
    sources,
    createdAt: new Date().toISOString(),
  };
}
