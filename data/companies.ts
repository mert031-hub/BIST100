/**
 * Company registry for BIST100 tracking and news matching.
 *
 * RULE: Keywords must be specific to this company. Generic sector words
 * (e.g. "banka", "demir", "cam") are intentionally excluded to prevent
 * false-positive matches across multiple companies.
 */
export const COMPANIES: Record<string, { name: string; fullName: string; sector: string; keywords: string[] }> = {
  ASELS: {
    name: 'ASELSAN',
    fullName: 'Aselsan Elektronik Sanayi ve Tic. A.Ş.',
    sector: 'Savunma',
    keywords: [
      'aselsan', 'asels', 'aselsan a.ş', 'aselsan elektronik',
    ],
  },
  THYAO: {
    name: 'THY',
    fullName: 'Türk Hava Yolları A.O.',
    sector: 'Havacılık',
    keywords: [
      'thy', 'thyao',
      'türk hava yolları', 'türkhavayolları',
      'turk hava yollari', 'turkish airlines',
      't.c. devlet hava yolları',
    ],
  },
  TUPRS: {
    name: 'TÜPRAŞ',
    fullName: 'Türkiye Petrol Rafinerileri A.Ş.',
    sector: 'Enerji',
    keywords: [
      'tüpraş', 'tuprs', 'tupras',
      'türkiye petrol rafinerileri',
      'tüpraş a.ş',
    ],
  },
  BIMAS: {
    name: 'BİM',
    fullName: 'BİM Birleşik Mağazalar A.Ş.',
    sector: 'Perakende',
    keywords: [
      'bimas', 'bim birleşik', 'bim mağaza',
      'bim a.ş', 'bim market',
    ],
  },
  AKBNK: {
    name: 'AKBANK',
    fullName: 'Akbank T.A.Ş.',
    sector: 'Bankacılık',
    keywords: [
      'akbank', 'akbnk', 'akbank t.a.ş',
    ],
  },
  TCELL: {
    name: 'TURKCELL',
    fullName: 'Turkcell İletişim Hizmetleri A.Ş.',
    sector: 'Telekomünikasyon',
    keywords: [
      'turkcell', 'tcell',
      'turkcell iletişim', 'turcell',
    ],
  },
  EREGL: {
    name: 'EREĞLİ DEMİR',
    fullName: 'Ereğli Demir ve Çelik Fabrikaları T.A.Ş.',
    sector: 'Çelik',
    keywords: [
      'ereğli', 'eregl', 'erdemir',
      'ereğli demir', 'eregli demir',
      'ereğli demir ve çelik',
    ],
  },
  SISE: {
    name: 'ŞİŞECAM',
    fullName: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.',
    sector: 'Cam',
    keywords: [
      'şişecam', 'sise', 'sisecam',
      'türkiye şişe', 'şişe ve cam',
      'tüpkam',
    ],
  },
  TOASO: {
    name: 'TOFAŞ',
    fullName: 'Tofaş Türk Otomobil Fabrikası A.Ş.',
    sector: 'Otomotiv',
    keywords: [
      'tofaş', 'toaso', 'tofas',
      'tofaş türk otomobil',
    ],
  },
  MGROS: {
    name: 'MİGROS',
    fullName: 'Migros Ticaret A.Ş.',
    sector: 'Perakende',
    keywords: [
      'migros', 'mgros',
      'migros ticaret', 'migros a.ş',
    ],
  },
};

export const TRACKED_SYMBOLS = [
  'ASELS.IS', 'THYAO.IS', 'TUPRS.IS', 'BIMAS.IS', 'AKBNK.IS',
  'TCELL.IS', 'EREGL.IS', 'SISE.IS',  'TOASO.IS', 'MGROS.IS',
];
