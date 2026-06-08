import { ContentPlatform, ContentSource, GeneratedContent } from '@/types/content';

const DISCLAIMER = '⚠️ Bu içerik yalnızca bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.';

const HASHTAGS: Record<ContentPlatform, string[]> = {
  INSTAGRAM_POST:     ['#BIST100', '#BorsaIstanbul', '#HisseAnaliz', '#Finans', '#Ekonomi', '#KAP'],
  INSTAGRAM_CAROUSEL: ['#BIST100', '#BorsaAnaliz', '#HisseSenedi', '#Finans', '#Yatırım'],
  INSTAGRAM_STORY:    ['#BIST', '#Borsa', '#HisseAnaliz'],
  X_THREAD:           ['#BIST100', '#Finans', '#BorsaIstanbul', '#KAP', '#Ekonomi'],
  LINKEDIN:           ['#BorsaIstanbul', '#BIST100', '#FinansAnaliz', '#KAPBildirimi', '#Yatırım'],
  TELEGRAM:           ['#BIST100', '#KAP', '#HaberAkışı'],
};

/** Extract BIST ticker codes from source titles (e.g. "İş Yatırım → ASELS: ..."). */
function extractCompanyCodes(sources: ContentSource[]): string[] {
  const codes = new Set<string>();
  for (const s of sources) {
    // Broker report pattern: "Institution → CODE: ..."
    const brokerMatch = s.title.match(/→\s*([A-Z]{2,6})\s*:/);
    if (brokerMatch) codes.add(brokerMatch[1]);
    // Explicit $CODE pattern
    const dollarMatches = s.title.matchAll(/\$([A-Z]{2,6})/g);
    for (const m of dollarMatches) codes.add(m[1]);
    // Bare uppercase codes that look like tickers (2-6 letters, standalone)
    const bareMatch = s.title.match(/^([A-Z]{2,6})\b/);
    if (bareMatch && bareMatch[1].length >= 3) codes.add(bareMatch[1]);
  }
  return [...codes].slice(0, 5);
}

/** Build a concise bullet from a source title (strip long institution prefixes). */
function toBullet(s: ContentSource): string {
  const t = s.title
    .replace(/^[A-Za-zÇçĞğİıÖöŞşÜü\s]+ → [A-Z]{2,6}: /, '') // strip "Inst → CODE: "
    .trim();
  return t.length > 100 ? t.slice(0, 97) + '...' : t;
}

/** Format source attribution line. */
function sourceAttr(s: ContentSource): string {
  const typeLabel = s.type === 'NEWS' ? 'Haber' : s.type === 'KAP' ? 'KAP' : s.type === 'BROKER_REPORT' ? 'Kurum Raporu' : 'TCMB';
  return `• ${toBullet(s).slice(0, 60)} (${typeLabel})`;
}

/** Date formatted as Turkish short. */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function generateContent(
  platform: ContentPlatform,
  sources: ContentSource[],
): GeneratedContent {
  const main = sources[0];
  const companyCodes = extractCompanyCodes(sources);
  const tagLine = companyCodes.length > 0 ? companyCodes.map((c) => `$${c}`).join(' ') : 'BIST100';
  const dateStr = main ? fmtDate(main.date) : fmtDate(new Date().toISOString());
  const bullets = sources.slice(0, 5).map(toBullet);
  const sourceList = sources.map(sourceAttr).join('\n');

  const title = `${tagLine} | ${dateStr}`;

  let body = '';

  switch (platform) {
    case 'INSTAGRAM_POST':
      body = [
        `📌 ${tagLine} | ${dateStr}`,
        '',
        `🔹 ${bullets[0]}`,
        '',
        bullets.slice(1).map((b) => `▪ ${b}`).join('\n'),
        '',
        '📎 Kaynaklar:',
        sourceList,
        '',
        DISCLAIMER,
      ].filter(Boolean).join('\n');
      break;

    case 'INSTAGRAM_CAROUSEL': {
      const slides = sources.map((s, i) => {
        const header = `— Slayt ${i + 1}/${sources.length} —`;
        const body = toBullet(s);
        const src = `Kaynak: ${s.type === 'NEWS' ? 'Haber' : s.type === 'KAP' ? 'KAP Bildirimi' : 'Kurum Raporu'}`;
        return [header, '', body, '', src].join('\n');
      });
      body = [
        ...slides,
        '',
        `— Son Slayt —`,
        '',
        DISCLAIMER,
        '',
        '📎 Kaynaklar:',
        sourceList,
      ].join('\n\n');
      break;
    }

    case 'INSTAGRAM_STORY':
      body = [
        `⚡ ${tagLine}`,
        '',
        bullets[0],
        '',
        sources.length > 1 ? `+${sources.length - 1} haber daha →` : '',
        '',
        DISCLAIMER,
      ].filter(Boolean).join('\n');
      break;

    case 'X_THREAD': {
      const tweets = sources.map((s, i) => {
        const lines = [`${i + 1}/ ${toBullet(s)}`];
        if (s.url) lines.push(`🔗 ${s.url}`);
        return lines.join('\n');
      });
      body = [
        `🧵 ${tagLine} — Gündem (${dateStr})`,
        '',
        ...tweets.map((t, i) => (i === 0 ? t : `\n${t}`)),
        '',
        `${sources.length + 1}/ 📎 Kaynaklar:\n${sourceList}`,
        '',
        `${sources.length + 2}/ ${DISCLAIMER}`,
      ].filter(Boolean).join('\n');
      break;
    }

    case 'LINKEDIN':
      body = [
        `${tagLine} — Gündem Özeti | ${dateStr}`,
        '',
        bullets.map((b) => `📌 ${b}`).join('\n'),
        '',
        'Kaynaklar:',
        sourceList,
        '',
        DISCLAIMER,
      ].filter(Boolean).join('\n');
      break;

    case 'TELEGRAM':
      body = [
        `📡 <b>BIST RADAR | ${dateStr}</b>`,
        '',
        sources.map((s) => `• <a href="${s.url ?? '#'}">${toBullet(s)}</a>`).join('\n'),
        '',
        `<i>${DISCLAIMER}</i>`,
      ].join('\n');
      break;
  }

  return {
    platform,
    title,
    body,
    bullets,
    hashtags: HASHTAGS[platform],
    disclaimer: DISCLAIMER,
    companyCodes,
    sources,
    createdAt: new Date().toISOString(),
  };
}
