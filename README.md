# BIST RADAR STUDIO

BIST100 piyasa takip ve sosyal medya içerik üretim paneli.  
Retro Bloomberg Terminal estetiğinde, Next.js ile yazılmış web uygulaması.

> **Yasal Uyarı:** Bu uygulama yalnızca **bilgilendirme amaçlıdır**.  
> Hiçbir içerik yatırım tavsiyesi değildir. Yatırım kararlarınızı lisanslı  
> bir finansal danışmana danışarak alın.

---

## Özellikler

| Panel | Açıklama |
|---|---|
| **Hisse Takip** | BIST100 fiyatları (Yahoo Finance), canlı/mock fallback |
| **KAP Bildirimleri** | RSS + JSON API prototype; önem skoru + kategori filtresi |
| **Aracı Kurum Radari** | Hedef fiyat / tavsiye takibi; kaynak probe diagnostiği |
| **Makro Panel** | TCMB EVDS faiz ve enflasyon verileri |
| **Haber Akışı** | BBC Türkçe, NTV, Ekonomim RSS besleri; kaynak sağlık çubuğu |
| **Content Studio** | IG post/carousel/story, X flood, LinkedIn, Telegram formatları |
| **PNG Export** | 1080×1350 Instagram kartı indirme (html-to-image) |

---

## Kurulum

```bash
git clone https://github.com/mert031-hub/BIST100.git
cd BIST100
npm install
```

### Ortam Değişkenleri

`.env.example` dosyasını kopyalayın:

```bash
cp .env.example .env.local
```

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `EVDS_API_KEY` | Hayır | TCMB EVDS API anahtarı. Yoksa mock veri kullanılır. |
| `DEBUG_ENABLED` | Hayır | `true` → `/debug` sayfasını production'da açar. |

> `EVDS_API_KEY` almak için: [evds2.tcmb.gov.tr](https://evds2.tcmb.gov.tr/index.php?lang=tr)

---

## Geliştirme

```bash
npm run dev      # localhost:3000
npm run build    # production build
npm run start    # production sunucu
```

### Debug Console

Geliştirme ortamında `http://localhost:3000/debug` adresinde tüm API  
endpoint'lerinin ham JSON çıktısını, response sürelerini ve  
live/mock/fallback durumlarını görebilirsiniz.

Production'da erişmek için `.env.local` dosyasına `DEBUG_ENABLED=true` ekleyin.

---

## Veri Kaynakları

| Kaynak | Tip | Notlar |
|---|---|---|
| [Yahoo Finance](https://finance.yahoo.com) | Hisse fiyatları | yahoo-finance2 kütüphanesi |
| [KAP](https://www.kap.org.tr) | Kamuyu aydınlatma bildirimleri | RSS + JSON API; production test gerekli |
| [BBC Türkçe](https://www.bbc.com/turkce) | Haber RSS | |
| [NTV](https://www.ntv.com.tr) | Haber RSS | |
| [Ekonomim](https://www.ekonomim.com) | Haber RSS | |
| [TCMB EVDS](https://evds2.tcmb.gov.tr) | Faiz, enflasyon | API anahtarı gerekli |
| Aracı Kurumlar | Araştırma raporları | Şu an mock; kaynak mimarisi hazır |

Tüm kaynaklar erişilemez olduğunda sistem mock veriye fallback yapar —  
panel hiçbir zaman tamamen boş kalmaz.

---

## Vercel Deployment

### 1. Projeyi Deploy Et

```bash
# Vercel CLI ile
npm i -g vercel
vercel
```

veya [vercel.com/new](https://vercel.com/new) üzerinden GitHub repo bağlayın.

### 2. Environment Variables

Vercel Dashboard → Settings → Environment Variables:

```
EVDS_API_KEY      = <TCMB anahtarınız>
DEBUG_ENABLED     = false   # production'da /debug kapalı tutun
```

### 3. Build Ayarları

Vercel otomatik olarak Next.js projesini algılar. Ek ayar gerekmez.

- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Node Version:** 18.x veya üzeri

### 4. Bilinen Kısıtlamalar

- **KAP RSS/JSON:** Cloud sandbox ortamında `kap.org.tr` erişimi kısıtlı olabilir.  
  Vercel'in production network'ünde test edilmesi gerekir.
- **Yahoo Finance:** Aşırı yükte geçici rate-limit alınabilir; mock fallback devreye girer.
- **Aracı Kurum Raporları:** Gerçek kaynak ayrıştırma henüz implement edilmedi;  
  `lib/broker-parser.ts` stub olarak çalışır, mock veriye fallback yapılır.

---

## Mimari

```
app/
  page.tsx              Ana dashboard
  debug/page.tsx        API debug console (dev/staging only)
  api/
    health/             Kaynak sağlık kontrolü
    stocks/             BIST100 fiyatları
    news/               Haber RSS'leri
    kap/                KAP bildirimleri
    brokers/            Aracı kurum raporları
    tcmb/               TCMB EVDS verileri
components/dashboard/   Panel bileşenleri
lib/
  kap-live.ts           KAP canlı veri prototype (RSS + JSON API)
  broker-sources.ts     Aracı kurum kaynak registrisi
  broker-parser.ts      Kaynak probe + parser stub
  content-generator.ts  Platform bazlı içerik üretici
  news-scorer.ts        Haber önem skoru
data/mock/              Fallback mock verileri
types/                  TypeScript tip tanımları
store/                  Zustand state (Content Studio)
```

---

## Lisans

MIT — Ticari kullanım serbesttir.

**Feragatname:** Uygulama geliştiricileri, bu platform aracılığıyla yapılan  
yatırım kararlarından sorumlu tutulamaz. Tüm veriler bilgilendirme amaçlıdır.
