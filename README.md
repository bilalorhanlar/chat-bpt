# Bizim Yerimiz

Bilal ve kız arkadaşına ait, şifreli özel bir site: birlikte oyun oynanan,
listeler tutulan ve anıların durduğu bir yer.

## Ne var içinde

**Oyunlar** — dördü de skorları veritabanına yazıyor.

| Oyun | Mod | Notlar |
|---|---|---|
| Tavla | online + aynı cihaz | 3B zar, mars/hamars, tur süresi göstergesi |
| Satranç | online + aynı cihaz | 5+0 saat, ekleme yok, süresi biten kaybeder |
| İsim Şehir | online + aynı cihaz | 5 tur, karşılıklı onayla puanlama |
| Hafıza | tek kişilik | kendi fotoğraflarımızla eşleştirme, rekor tutar |

**Diğer** — 4 liste (bu yıl / evlenince / gidilecekler / izlenecekler), özel gün
sayaçları, günün sorusu, zaman kapsülü mektuplar, galeri, şampiyona tablosu.

## Kurulum

```bash
npm install
cp .env.example .env      # DATABASE_URL, AUTH_SECRET, APP_PIN doldur
npm run db:migrate        # tabloları kur
npm run db:seed           # iki kullanıcı + PIN + başlangıç sayaçları
npm run dev               # http://localhost:3000
```

`AUTH_SECRET` en az 24 karakter rastgele olmalı:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Komutlar

| Komut | İş |
|---|---|
| `npm run dev` | Next + Socket.IO tek süreçte (geliştirme) |
| `npm run build` | Prisma istemcisi + üretim derlemesi |
| `npm start` | Üretim sunucusu |
| `npm test` | Oyun motorlarının testleri |
| `npm run typecheck` | TypeScript denetimi |
| `npm run db:studio` | Veritabanını tarayıcıda gez |
| `npm run photos` | Fotoğrafları baştan işle (aşağıya bak) |

## Mimari — neden böyle

**Tek servis.** Next.js ve Socket.IO aynı Node sürecinde çalışıyor
(`server/index.ts`). Railway kalıcı bir container verdiği için gerçek WebSocket
doğrudan burada barınıyor; Vercel'in serverless modeli bunu tutamadığından
ayrıca Pusher/Ably gerekirdi.

**Kurallar tek yerde.** Oyun kuralları yalnızca sunucu eylemlerinde
(`src/app/oyunlar/**/actions.ts`) çalışıyor. Soket katmanı hiç kural bilmiyor,
sadece yeni durumu odaya yayınlıyor (`src/lib/realtime.ts`). Aynı mantığı iki
yerde tutsaydık kaçınılmaz olarak ayrışırdı.

**Oyun motorları saf.** `src/games/*` altındaki modüller DOM'a, ağa ve
rastgeleliğe dokunmuyor; zar dışarıdan veriliyor. Bu sayede hem sunucuda
doğrulama hem tarayıcıda anında geri bildirim için aynı kod çalışıyor ve
testleri kolay.

**Tarih işleri.** Sunucu `Europe/Istanbul` saatinde çalışıyor
(`server/index.ts` `TZ`'yi ayarlıyor). Prisma `@db.Date` sütunlarını UTC gece
yarısı olarak veriyor; yerel getiricilerle okumak günü kaydırdığı için tüm
tarih-yalnız dönüşümler `src/lib/date-only.ts` üzerinden gidiyor.

**Canlı saatler istemcide çizilmiyor mu?** Çiziliyor, ama karar sunucunun:
satrançta süre bitişini sunucu ilan ediyor, yoksa sekmesini kapatan hiç
kaybetmezdi.

## Fotoğraflar

Kaynak ekran görüntüleri `photo/` içinde. `npm run photos` iki adım çalıştırır:

1. `scripts/photos/01-trim.py` — siyah bantları kırpar, elle belirlenmiş 6
   dönüş düzeltmesini uygular, telefon arayüzü kalan kareyi temizler, kopyayı
   atar. Düzeltmeler script'in içinde sabit olarak duruyor, yani tekrar
   üretilebilir.
2. `scripts/photos/02-optimize.ts` — 4:5 iz varyantı ve doğal oranlı büyük
   varyantı AVIF + WebP olarak üretir, `src/data/photos.ts` manifestini yazar.

Yeni fotoğraf eklerken `photo/` klasörüne atıp `npm run photos` çalıştırmak
yeterli; dönük olan varsa `01-trim.py` içindeki `ROTATIONS` tablosuna sırasını
yazın.

## Dağıtım (Railway)

`railway.json` hazır. Servise şu değişkenler gerekiyor:

- `DATABASE_URL` — Railway Postgres eklentisinden
- `AUTH_SECRET` — rastgele, üretimde geliştirmedekinden farklı
- `APP_PIN` — ilk tohumlama için 4 rakam

Dağıtım komutu önce `prisma migrate deploy` çalıştırıp sonra sunucuyu açıyor.
İlk dağıtımdan sonra bir kez `npm run db:seed` gerekiyor.
