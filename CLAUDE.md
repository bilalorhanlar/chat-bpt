@AGENTS.md

# Bizim Yerimiz — proje notları

İki kişilik özel bir site. Ölçeklenebilirlik hedef değil; akıcılık, mobil
deneyim ve estetik hedef. Kullanıcı arayüzü ve kod yorumları **Türkçe**,
tanımlayıcılar İngilizce.

## Değişmeyen kurallar

**Oyun kuralları yalnızca sunucu eylemlerinde çalışır.**
`src/app/oyunlar/**/actions.ts` tek otoritedir. Soket katmanı
(`server/realtime/`) kural bilmez, sadece `emitMatchState` ile durum yayar.
Aynı mantığı iki yere koymayın — kaçınılmaz olarak ayrışır.

**Oyun motorları saf tutulur.** `src/games/*` DOM'a, ağa, `Date.now()`'a ve
rastgeleliğe dokunmaz; zamanı ve zarı çağıran verir. Bu sayede sunucu
doğrulaması ile tarayıcı önizlemesi aynı kodu çalıştırıyor. Yeni kural
eklerken önce buraya ve testine yazın.

**Animasyonda yalnızca `transform` ve `opacity`.** `width/height/top/left`
ve `filter` değerleri animasyonlanmaz. Blur'lu bir katman transform ile
hareket ettirilebilir ama blur *değeri* değiştirilemez — her karede yeniden
rasterleştirme demek. Aurora arka planı bu yüzden hiç `filter` kullanmıyor,
yumuşaklık radial-gradient'in kendisinden geliyor.

**Tarih-yalnız değerler `src/lib/date-only.ts` üzerinden.** Prisma `@db.Date`
sütunlarını UTC gece yarısı verir; Türkiye UTC+3 olduğu için yerel
getiricilerle (`getDate()`) okumak günü bir geri kaydırır. Doğum günü ve
sayaçlar bu yüzden bir gün şaşardı.

**`"use server"` dosyalarında her export async olmalı.** Senkron yardımcıları
ayrı bir modüle koyun (`date-only.ts`, `daily-question.ts` böyle doğdu).

**Canlı saat/tarih istemcide hesaplanır, karar sunucuda verilir.** Sunucu ile
tarayıcının saati farklı olduğunda React hidrasyon uyuşmazlığı verir; bu
yüzden sayaçlar ilk karede yer tutucu çizip `useEffect` ile dolar. Ama
satrançta süre bitişini sunucu ilan eder — istemciye bıraksak sekmesini
kapatan hiç kaybetmezdi.

## Yapı

```
server/index.ts          Next + Socket.IO tek süreçte (Railway)
src/games/*              saf oyun motorları + testleri
src/app/oyunlar/*/actions.ts   kuralların çalıştığı tek yer
src/lib/match.ts         maçların ortak katmanı (koltuk, kaydetme, bitirme)
src/lib/realtime.ts      sunucu eylemi → soket köprüsü (globalThis üzerinden)
src/lib/people.ts        isimler/tarihler DB'den; config/site.ts yalnız tohum
scripts/photos/          fotoğraf boru hattı (tekrar üretilebilir)
```

## Sık düşülen tuzaklar

- **Tavla tahtasında iki koordinat sistemi var.** `*_BOARD` sabitleri tahta
  kutusunun yüzdesi, `*_LOCAL` olanlar hane sütununun yüzdesi. Pullar sütunun
  içinde olduğu için CSS yüzdeleri sütuna göre çözülür.
- **Tavlada `dice` boş olması turun bittiği anlamına gelmez.** Zarlar oynanınca
  boşalır ama tur devredilmemiştir; ölçüt `rolled`. (`canRoll`)
- **3B zar modeli eksene hizalı değil.** Yüz yönleri geometriden ölçüldü
  (`FACE_NORMAL`), "X ekseninde 90° döndür" gibi bir tablo yazılamıyor.
- **Prisma 6'ya sabitlendi.** 7, `url = env()` desteğini kaldırıp sürücü
  adaptörü ve yeni generator çıktısı istiyor; bu proje için getirisi yok.

## Komutlar

`npm run dev` · `npm test` · `npm run typecheck` · `npm run build`
· `npm run db:migrate` · `npm run db:seed` · `npm run photos`
