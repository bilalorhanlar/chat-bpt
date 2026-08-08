# Çift Sitesi — Tasarım Dokümanı

**Tarih:** 2026-08-08
**Durum:** Onaylandı (mimari), uygulamaya geçildi

## 1. Amaç

Bilal ve kız arkadaşının özel kullanımına açık, şifreli bir web sitesi. İki ana işi var:
birlikte oyun oynamak (skorları kalıcı tutarak) ve ortak listeleri/anıları/sayaçları
tek yerde toplamak. Tasarım ve mobil deneyim birinci öncelik.

Kullanıcı sayısı ikidir. Ölçeklenebilirlik bir hedef değildir; akıcılık ve estetik hedeftir.

## 2. Kararlar (kullanıcı onaylı)

| Konu | Karar |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Mimari | Tek servis: Next.js + Socket.IO aynı Node process'inde (`server.js`) |
| Hosting | Railway |
| Veritabanı | Railway Postgres + Prisma |
| Giriş | 4 haneli ortak PIN → ardından "kimsin?" seçimi |
| Oyun modu | Hem gerçek zamanlı online hem aynı cihazda sırayla |
| İsim-Şehir doğrulama | Karşılıklı onay (otomatik sözlük yok) |
| İlişki başlangıcı | 11 Ocak 2020 |
| Doğum günleri | Bilal 1 Kasım 2002, partner 17 Şubat 2002 |
| Fotoğraflar | 66 adet elle kırpılıp döndürülür, sonra otomatik optimize edilir |
| Ekstralar | Şampiyona tablosu, Günün sorusu, Zaman kapsülü mektup, Fotoğraf hafıza oyunu |

### Açık varsayım

Partnerin adı bilinmiyor. `src/config/site.ts` içinde `partnerName` alanına yer tutucu
konur ve site içindeki Ayarlar ekranından değiştirilebilir. Kullanıcı adı verdiğinde
tek satır değişir.

## 3. Mimari

### 3.1 Süreç yapısı

Tek Node process:

```
server.js
├── next({ dev })            → tüm HTTP istekleri
└── socket.io                → /socket.io yolunda, aynı http.Server üzerinde
```

Railway'de tek servis, tek deploy. DB'ye Railway iç ağından bağlanır.

Bunun sebebi: Vercel'in serverless modeli kalıcı WebSocket tutamaz, harici bir
Pusher/Ably bağımlılığı gerektirir. Railway kalıcı bir container çalıştırdığı için
Socket.IO'yu doğrudan barındırabiliyoruz.

### 3.2 Otoriter sunucu

Oyun kuralları sunucuda çalışır. Tarayıcı hamleyi *önerir*, sunucu doğrular ve
yeni durumu yayınlar. Bu, iki tarayıcının durum ayrışmasını (desync) yapısal olarak
imkânsız kılar ve yenilenen sayfanın oyunu kaybetmesini engeller.

Oyun motorları **izomorfik**: `src/games/*` altındaki saf TypeScript modülleri hem
sunucuda doğrulama, hem tarayıcıda anında geri bildirim (optimistic UI) için kullanılır.
Yan etkisi yok, DOM'a ve Node API'lerine dokunmaz.

### 3.3 Realtime protokolü

Socket.IO odaları: `match:{matchId}`.

| Yön | Olay | İçerik |
|---|---|---|
| C→S | `match:join` | `{ matchId }` |
| S→C | `match:state` | tam durum anlık görüntüsü + `serverNow` |
| C→S | `match:action` | `{ matchId, action }` — oyuna özel |
| S→C | `match:rejected` | `{ reason }` — geçersiz hamle |
| S→C | `match:presence` | `{ userId, online }` |
| S→C | `match:over` | `{ winnerId, result, scoreDelta }` |

**Saat senkronizasyonu:** sunucu `lastMoveAt` ve `serverNow` gönderir, tarayıcı
aradaki farkı yerel saatine göre düzeltip geri sayımı kendi çizer. Süre bitişi
kararını **her zaman sunucu** verir (bir zamanlayıcı ile), tarayıcı sadece gösterir.

### 3.4 Kimlik doğrulama

- Ortak PIN, `bcrypt` ile hash'lenip `Setting` tablosunda tutulur (env'den seed edilir).
- Doğru PIN → "Kimsin?" ekranı → seçilen kullanıcı ile imzalı JWT, `httpOnly`
  `SameSite=Lax` çerezine yazılır (90 gün).
- Middleware korumalı tüm yolları kontrol eder; `/kilit` hariç her şey kapalı.
- Kaba kuvvete karşı: IP başına 10 deneme / 15 dk (bellek içi sayaç yeterli — iki kullanıcı).

## 4. Tasarım dili

### 4.1 Renk

Beyaz zemin, mor birincil, yumuşak gül ikincil aksan.

```
--bg          #FFFFFF        sayfa zemini
--bg-tint     #FBFAFF        bölüm zemini (çok hafif mor)
--surface     #FFFFFF        kart
--border      #ECE8F8        kart kenarı
--text        #1A1523        birincil metin (mor-siyah)
--text-muted  #6B6478        ikincil metin

--violet-50   #F5F3FF        --violet-500  #8B5CF6
--violet-100  #EDE9FE        --violet-600  #7C3AED   ← birincil
--violet-200  #DDD6FE        --violet-700  #6D28D9
--violet-300  #C4B5FD        --violet-900  #4C1D95
--violet-400  #A78BFA

--rose-300    #F0ABFC        ikincil aksan (kalp, doğum günü, romantik dokunuşlar)
--rose-400    #E879F9
```

Kontrast: metin/zemin 15:1, `--violet-600` beyaz üzerinde 5.9:1 — WCAG AA sağlanır.

### 4.2 Tipografi

- **Başlık:** Fraunces (variable serif, `next/font/google`, `latin` + `latin-ext`
  alt kümeleri Türkçe karakterleri kapsar). Yumuşak, karakterli, şablon görünmüyor.
- **Gövde:** Inter (variable).
- Ölçek: `clamp()` ile akışkan — mobilde ayrı breakpoint gerekmiyor.

### 4.3 Işık ve duman

Karmaşıklıktan kaçınılır; üç katman yeterli:

1. **Aurora blob'lar** — 3 adet (mobilde 2) büyük radial-gradient daire,
   `filter: blur(80px)`, çok yavaş `transform: translate3d + scale` animasyonu.
   Blur değeri **sabit**; sadece transform animasyonlanır.
2. **Grain** — tek seferlik SVG `feTurbulence` dokusu, statik overlay, `opacity: .035`.
3. **İmleç ışıltısı** — imleci takip eden çok soluk radial-gradient. Yalnızca
   masaüstünde (`pointer: fine`), `prefers-reduced-motion` kapalıysa.

### 4.4 Performans kuralları (bağlayıcı)

- Yalnızca `transform` ve `opacity` animasyonlanır. `width/height/top/left/filter` asla.
- Blur'lu eleman hareket ettirilir; blur *değeri* animasyonlanmaz (her karede
  yeniden hesap = kasma).
- Image trail sabit bir DOM havuzu kullanır (masaüstü 12, mobil 6 düğüm) —
  düğüm yaratıp yok etmez, mevcut düğümleri geri dönüştürür.
- Tek `requestAnimationFrame` döngüsü tüm imleç tabanlı efektleri sürer.
- Fotoğraflar `next/image` ile AVIF/WebP, 3 genişlik varyantı, blur placeholder.
- 3B zar yalnızca atış anında mount edilir, animasyon bitince unmount.
  `dpr` en fazla 2, atış dışında render döngüsü durur.
- `prefers-reduced-motion: reduce` → trail, aurora ve konfeti kapanır; geçişler
  anlık olur.
- Sesler tek bir `AudioPool` üzerinden çalınır, ilk kullanıcı etkileşiminde
  önceden yüklenir (mobil autoplay kısıtı için).

## 5. Sayfa yapısı

```
/kilit                    PIN ekranı (4 hane) → kimsin?
/                         Ana sayfa: image-trail hero, birlikte-X-gün, navigasyon
/oyunlar                  oyun seçimi
/oyunlar/tavla
/oyunlar/satranc
/oyunlar/isim-sehir
/oyunlar/hafiza
/sampiyona                skor tablosu, seriler, ayın şampiyonu
/sayaclar                 özel gün geri sayımları + doğum günleri
/listeler/[tur]           tur ∈ yillik | evlilik | gidilecek | izlenecek
/gunun-sorusu             günün sorusu + arşiv
/mektuplar                zaman kapsülü mektuplar
/galeri                   tüm fotoğraflar
/ayarlar                  isimler, ilişki tarihi, PIN değiştirme
```

Dört liste **tek** sayfa bileşenidir; `tur` parametresi başlığı, ikonu ve
alan şemasını değiştirir.

## 6. Veri modeli

```prisma
enum Game      { TAVLA SATRANC ISIM_SEHIR HAFIZA }
enum MatchMode { ONLINE LOCAL }
enum MatchStatus { WAITING ACTIVE FINISHED ABANDONED }
enum ListType  { YILLIK EVLILIK GIDILECEK IZLENECEK }

model User {
  id        String   @id           // "bilal" | "partner" — seed ile sabit
  name      String
  birthday  DateTime @db.Date
  accent    String                 // tema aksan rengi
  ...ilişkiler
}

model GameMatch {
  id         String      @id @default(cuid())
  game       Game
  mode       MatchMode
  status     MatchStatus @default(WAITING)
  state      Json                   // oyuna özel otoriter durum
  winnerId   String?
  result     String?                // MAT | PAT | SURE | MARS | HAMARS | NORMAL | TERK
  scoreDelta Int         @default(1) // mars 2, hamars 3
  durationMs Int?                    // hafıza oyunu rekoru
  players    MatchPlayer[]
  moves      Move[]
  createdAt  DateTime    @default(now())
  finishedAt DateTime?
}

model MatchPlayer { matchId String; userId String; seat Int; @@id([matchId,userId]) }
model Move        { matchId String; ply Int; userId String; data Json; msLeft Int?
                    @@unique([matchId, ply]) }

model ListItem  { list ListType; title String; note String?; meta Json?
                  done Boolean; doneAt DateTime?; order Int; createdById String }
model Countdown { title String; date DateTime; emoji String?; repeatYearly Boolean }
model DailyQuestion  { date DateTime @unique @db.Date; text String; answers ... }
model QuestionAnswer { questionId String; userId String; text String
                       @@unique([questionId,userId]) }
model Letter    { fromId String; toId String; title String; body String
                  openAt DateTime; openedAt DateTime? }
model Setting   { key String @id; value Json }
```

`GameMatch.state` neden `Json`: her oyunun durumu farklı şekilde (tavla için tahta +
zar + bar, satranç için FEN + saatler, isim-şehir için harf + cevaplar). Ayrı
tablolar açmak dört kat şema ve dört kat sorgu demek olurdu; durum her zaman tek
parça okunup tek parça yazılıyor, bu yüzden JSON doğru seçim. Tip güvenliği
`src/games/*/types.ts` içindeki TypeScript tipleriyle ve yazma anında Zod
doğrulamasıyla sağlanır.

## 7. Oyun kuralları (kullanıcı şartları)

### Tavla
- Standart kurallar: bar, ev toplama, blot vurma, çift zar = dört hamle.
- **Mars** (rakip hiç taş toplamadan yenilirse) 2 puan, **hamars** 3 puan.
- 3B zar modeli `3d/dice.obj` → GLB, siyah materyal mora çevrilir.
- Sesler: zar `u_qpfzpydtro-dice-142528.mp3`, kazanma `win.mp3`,
  kaybetme `lose.mp3`, mars `mars.mp3`.
- **Tur süresi göstergesi var, bitince hiçbir şey olmaz** — sadece görsel.

### Satranç
- `chess.js` kuralları; lichess benzeri tahta: koordinatlar, son hamle vurgusu,
  geçerli kare noktaları, terfi seçici, alınan taşlar, hamle listesi.
- **5+0 saat. Süre eklemesi yok. Süresi biten kaybeder.**
- Sesler: her hamlede `satranc.mp3`; **yalnızca at oynatıldığında** `at.mp3`
  (satranç sesinin yerine, üstüne değil). Kazanma/kaybetme aynı dosyalar.

### İsim-Şehir-Hayvan-Bitki-Eşya
- Rastgele harf, geri sayım, ikisi de yazar.
- Süre bitince cevaplar yan yana açılır; her oyuncu karşınınkini onaylar/reddeder.
- Puanlama: yalnız bulan 10, ikisi aynı kelime 5, boş/geçersiz 0.

### Fotoğraf hafıza oyunu
- Kendi fotoğraflarıyla eşleştirme, süre tutar, en hızlı rekor `durationMs`'e yazılır.

## 8. Uygulama fazları

Her fazın sonunda çalışan bir çıktı olur.

**Faz 1 — Temel + Ana sayfa**
Next.js iskeleti, `server.js` + Socket.IO taşıyıcısı, Prisma şeması/migration/seed,
PIN girişi, tasarım sistemi ve bileşen kütüphanesi, aurora + grain arka plan,
66 fotoğrafın işlenmesi (kırpma/döndürme + AVIF/WebP varyantları),
image-trail hero, birlikte-X-gün sayacı, navigasyon, sayfa geçişleri, mobil menü.

**Faz 2 — Listeler ve zaman**
Dört liste (ekle/düzenle/sil/tamamla/sırala, kim ekledi), özel gün sayaçları,
doğum günü modu (o gün tema değişir + konfeti + yaş), günün sorusu (ikisi
cevaplayınca açılır + arşiv), zaman kapsülü mektuplar.

**Faz 3 — Tavla**
İzomorfik motor, 3B zar, tahta UI ve sürükleme, tur göstergesi, sesler,
online + aynı cihaz.

**Faz 4 — Satranç**
chess.js entegrasyonu, tahta UI, 5+0 saat, sesler, online + aynı cihaz.

**Faz 5 — İsim-Şehir, Hafıza, Şampiyona**
Harf çekilişi ve karşılıklı onay akışı, hafıza oyunu, şampiyona tablosu
(toplam puan, seriler, ayın şampiyonu).

## 9. Kapsam dışı (YAGNI)

Bilerek yapılmayanlar: kullanıcı kaydı/davet akışı, e-posta bildirimi, çoklu dil,
bilgisayara karşı oyun (Stockfish), sohbet (WhatsApp var), fotoğraf yükleme arayüzü
(66 fotoğraf derlenmiş halde geliyor), oyun izleyici modu, ELO/derecelendirme.
