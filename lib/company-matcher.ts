import { COMPANIES } from '@/data/companies';

export function matchCompanies(text: string): string[] {
  const lowerText = text.toLowerCase();
  const matched: string[] = [];

  for (const [code, company] of Object.entries(COMPANIES)) {
    const isMatch = company.keywords.some((kw) => lowerText.includes(kw));
    if (isMatch) {
      matched.push(code);
    }
  }

  return [...new Set(matched)];
}
