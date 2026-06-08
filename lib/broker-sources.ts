/**
 * lib/broker-sources.ts — Aracı Kurum Kaynak Mimarisi
 *
 * Her kaynak için:
 *   - Kurum adı ve kısa kimliği (id)
 *   - Kaynak tipi: PDF | HTML | RSS
 *   - Probe URL (genellikle araştırma bölümünün ana sayfası)
 *   - Aktif mi? (false = probe edilmez, mimaride kayıtlı kalır)
 *   - Not: kısıtlamalar, auth gereksinimleri, doğrulama durumu
 *
 * Gerçek parser entegrasyonu bu dosyadan bağımsız olarak lib/broker-parser.ts
 * içinde geliştirilecek; bu dosya sadece kayıt defteri.
 */

export type BrokerSourceType = 'PDF' | 'HTML' | 'RSS';

export interface BrokerSource {
  id: string;              // slug — BrokerReport.institution ile eşleşmeli
  institution: string;     // görünen ad
  type: BrokerSourceType;
  url: string;             // probe / araştırma bölümü URL'i
  active: boolean;         // true → probe edilir; false → atlanır
  note: string;            // kısıtlamalar, auth, doğrulama notu
}

/** SourceProbeResult — probelayıcı her kaynak için döner */
export interface SourceProbeResult {
  id: string;
  institution: string;
  type: BrokerSourceType;
  url: string;
  status: 'reachable' | 'blocked' | 'timeout' | 'error' | 'skipped';
  httpStatus?: number;
  error?: string;
  durationMs: number;
}

export const BROKER_SOURCES: BrokerSource[] = [
  // ─── Yerli Aracı Kurumlar ────────────────────────────────────────────────

  {
    id: 'is-yatirim',
    institution: 'İş Yatırım',
    type: 'HTML',
    url: 'https://www.isyatirim.com.tr/arastirma-ve-tahminler/arastirma',
    active: true,
    note: 'Büyük yerli aracı kurum. Araştırma sayfası HTML liste. Session gerektirmeyebilir. URL doğrulama gerekli.',
  },
  {
    id: 'garanti-yatirim',
    institution: 'Garanti BBVA Yatırım',
    type: 'HTML',
    url: 'https://www.garantibbvayatirim.com.tr/arastirma',
    active: true,
    note: 'BBVA grup. Araştırma raporları HTML sayfada listeleniyor olabilir. URL doğrulama gerekli.',
  },
  {
    id: 'yk-yatirim',
    institution: 'Yapı Kredi Yatırım',
    type: 'HTML',
    url: 'https://www.ykyatirim.com.tr/bist-hisseleri/yatirim-onerileri',
    active: true,
    note: 'Yapı Kredi grup. Yatırım önerileri sayfası. Gerçek path değişmiş olabilir. URL doğrulama gerekli.',
  },
  {
    id: 'ak-yatirim',
    institution: 'AK Yatırım',
    type: 'HTML',
    url: 'https://www.akyatirim.com.tr/analiz-ve-arastirma',
    active: true,
    note: 'Akbank grup. Analiz sayfası HTML. URL doğrulama gerekli.',
  },
  {
    id: 'deniz-yatirim',
    institution: 'Deniz Yatırım',
    type: 'HTML',
    url: 'https://www.denizyatirim.com.tr/arastirma',
    active: true,
    note: 'Denizbank grup. Araştırma sayfası. URL doğrulama gerekli.',
  },
  {
    id: 'teb-yatirim',
    institution: 'TEB Yatırım',
    type: 'HTML',
    url: 'https://www.tebyatirim.com.tr/arastirma',
    active: true,
    note: 'TEB / BNP Paribas grup. URL doğrulama gerekli.',
  },
  {
    id: 'halk-yatirim',
    institution: 'Halk Yatırım',
    type: 'HTML',
    url: 'https://www.halkyatirim.com.tr/arastirma',
    active: true,
    note: 'Halkbank grup. URL doğrulama gerekli.',
  },
  {
    id: 'vakif-yatirim',
    institution: 'Vakıf Yatırım',
    type: 'HTML',
    url: 'https://www.vakifyatirim.com.tr/arastirma',
    active: true,
    note: 'Vakıfbank grup. URL doğrulama gerekli.',
  },
  {
    id: 'seker-yatirim',
    institution: 'Şeker Yatırım',
    type: 'HTML',
    url: 'https://www.sekeryatirim.com.tr/analiz',
    active: true,
    note: 'Bağımsız aracı kurum. URL doğrulama gerekli.',
  },
  {
    id: 'global-menkul',
    institution: 'Global Menkul',
    type: 'HTML',
    url: 'https://www.globalmenkul.com/arastirma',
    active: true,
    note: 'Bağımsız aracı kurum. URL doğrulama gerekli.',
  },
  {
    id: 'ata-yatirim',
    institution: 'Ata Yatırım',
    type: 'HTML',
    url: 'https://www.ataonline.com.tr/arastirma',
    active: true,
    note: 'Bağımsız aracı kurum. URL / domain doğrulama gerekli.',
  },
  {
    id: 'oyak-yatirim',
    institution: 'Oyak Yatırım',
    type: 'HTML',
    url: 'https://www.oyakyatirim.com.tr/arastirma',
    active: true,
    note: 'OYAK grup. URL doğrulama gerekli.',
  },

  // ─── Uluslararası Kurumlar (kamuya açık feed yok) ────────────────────────

  {
    id: 'jpmorgan',
    institution: 'JPMorgan',
    type: 'PDF',
    url: 'https://www.jpmorgan.com/insights/research',
    active: false,
    note: 'Türkiye hisse raporları kamuya açık değil. Kurumsal erişim + lisans gerekli. Devre dışı.',
  },
  {
    id: 'goldman-sachs',
    institution: 'Goldman Sachs',
    type: 'PDF',
    url: 'https://www.goldmansachs.com/insights/research',
    active: false,
    note: 'Kurumsal erişim gerekli. Portals.gs.com ve Bloomberg terminal. Kamuya açık endpoint yok. Devre dışı.',
  },
  {
    id: 'deutsche-bank',
    institution: 'Deutsche Bank',
    type: 'PDF',
    url: 'https://www.db.com/what-we-do/insights-and-publications/research.html',
    active: false,
    note: 'Yalnızca müşteri erişimi. Devre dışı.',
  },
];

/** Sadece aktif kaynakları döner */
export function getActiveSources(): BrokerSource[] {
  return BROKER_SOURCES.filter((s) => s.active);
}
