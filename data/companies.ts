export const COMPANIES: Record<string, { name: string; fullName: string; sector: string; keywords: string[] }> = {
  ASELS: {
    name: 'ASELSAN',
    fullName: 'Aselsan Elektronik Sanayi ve Tic. A.Ş.',
    sector: 'Savunma',
    keywords: ['aselsan', 'asels', 'savunma', 'elektronik', 'radar', 'askeri'],
  },
  THYAO: {
    name: 'THY',
    fullName: 'Türk Hava Yolları A.O.',
    sector: 'Havacılık',
    keywords: ['thy', 'thyao', 'türk hava yolları', 'turkish airlines', 'havacılık', 'havayolu'],
  },
  TUPRS: {
    name: 'TÜPRAŞ',
    fullName: 'Türkiye Petrol Rafinerileri A.Ş.',
    sector: 'Enerji',
    keywords: ['tüpraş', 'tuprs', 'rafineri', 'petrol', 'akaryakıt'],
  },
  BIMAS: {
    name: 'BİM',
    fullName: 'BİM Birleşik Mağazalar A.Ş.',
    sector: 'Perakende',
    keywords: ['bim', 'bimas', 'market', 'perakende', 'mağaza'],
  },
  AKBNK: {
    name: 'AKBANK',
    fullName: 'Akbank T.A.Ş.',
    sector: 'Bankacılık',
    keywords: ['akbank', 'akbnk', 'banka', 'bankacılık'],
  },
  TCELL: {
    name: 'TURKCELL',
    fullName: 'Turkcell İletişim Hizmetleri A.Ş.',
    sector: 'Telekomünikasyon',
    keywords: ['turkcell', 'tcell', 'telekom', 'iletişim', 'gsm'],
  },
  EREGL: {
    name: 'EREĞLİ DEMİR',
    fullName: 'Ereğli Demir ve Çelik Fabrikaları T.A.Ş.',
    sector: 'Çelik',
    keywords: ['ereğli', 'eregl', 'erdemir', 'çelik', 'demir'],
  },
  SISE: {
    name: 'ŞİŞECAM',
    fullName: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.',
    sector: 'Cam',
    keywords: ['şişecam', 'sise', 'cam', 'şişe'],
  },
  TOASO: {
    name: 'TOFAŞ',
    fullName: 'Tofaş Türk Otomobil Fabrikası A.Ş.',
    sector: 'Otomotiv',
    keywords: ['tofaş', 'toaso', 'otomobil', 'otomotiv', 'fiat'],
  },
  MGROS: {
    name: 'MİGROS',
    fullName: 'Migros Ticaret A.Ş.',
    sector: 'Perakende',
    keywords: ['migros', 'mgros', 'market', 'perakende', 'süpermarket'],
  },
};

export const TRACKED_SYMBOLS = [
  'ASELS.IS',
  'THYAO.IS',
  'TUPRS.IS',
  'BIMAS.IS',
  'AKBNK.IS',
  'TCELL.IS',
  'EREGL.IS',
  'SISE.IS',
  'TOASO.IS',
  'MGROS.IS',
];
