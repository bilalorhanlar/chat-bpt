"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { PHOTOS, photoSrc } from "@/data/photos";
import { shuffled } from "@/lib/utils";

/**
 * Fare gezdirildikçe / parmak kaydırıldıkça arkada anılar beliren kahraman bölüm.
 *
 * Performans kararları:
 *
 * 1. **Sabit düğüm havuzu.** Her karede `<img>` yaratıp yok etmek çöp toplayıcıyı
 *    çalıştırır ve düzen hesabı tetikler. Bunun yerine sabit sayıda düğüm bir kez
 *    kurulur ve döngüsel olarak yeniden kullanılır.
 *
 * 2. **React hiç karışmıyor.** Havuz `useEffect` içinde DOM API'siyle kurulur;
 *    saniyede onlarca kez state güncellemek yeniden render zinciri açardı.
 *
 * 3. **Web Animations API.** `element.animate()` ile yalnızca `transform` ve
 *    `opacity` animasyonlanır; tarayıcı bunları compositor'a taşır, ana iş
 *    parçacığı boş kalır. Sınıf ekleyip `offsetWidth` okuyarak animasyon
 *    yeniden başlatma hilesi düzen hesabı zorlar — kullanılmıyor.
 *
 * 4. **Mesafe eşiği.** Her `pointermove` olayında değil, imleç eşik kadar yol
 *    aldığında yeni kare doğar. Hızlı hareket = sık kare, yavaş = seyrek.
 *
 * 5. **Kademeli ön yükleme.** Fotoğraflar arka planda dörtlü gruplar hâlinde
 *    indirilir; efekt ilk fotoğraf hazır olduğunda çalışmaya başlar, indikçe
 *    çeşitlenir. İlk boyanmayı 2 MB görsel bekletmez.
 */

const POOL = { desktop: 14, mobile: 8 };
const STEP = { desktop: 92, mobile: 62 }; // iki kare arası minimum piksel
const LIFETIME = 1300; // ms
const PRELOAD_LIMIT = { desktop: PHOTOS.length, mobile: 26 };
const PRELOAD_CONCURRENCY = 4;

/**
 * Easing'ler **kare başına** veriliyor, seçeneklerdeki `easing` alanına değil.
 *
 * Sebebi: WAAPI'de seçeneklerdeki `easing` tüm yinelemenin zamanını büker.
 * `cubic-bezier(.22,1,.36,1)` gibi keskin bir ease-out orada durunca, animasyon
 * gerçek zamanın %36'sında ilerlemenin %89'una varıyor — kare bir anda açılıyor
 * ve ömrünün neredeyse tamamını solarak geçiriyor. Kare başına easing ile
 * görünür plato (16%–72%) gerçek zamanda da o kadar sürüyor.
 */
const KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: "scale(0.62)", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  { opacity: 1, transform: "scale(1.05)", offset: 0.16, easing: "cubic-bezier(0.33, 0, 0.67, 1)" },
  { opacity: 1, transform: "scale(1)", offset: 0.32, easing: "linear" },
  { opacity: 1, transform: "scale(1)", offset: 0.72, easing: "cubic-bezier(0.4, 0, 1, 1)" },
  { opacity: 0, transform: "scale(0.93)" },
];

export function ImageTrail({
  children,
  background,
}: {
  children: ReactNode;
  /** Bölümün en arkasına çizilecek katman (ör. tam ekran fotoğraf). */
  background?: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const layer = layerRef.current;
    if (!section || !layer) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isMobile = !window.matchMedia("(pointer: fine)").matches;
    const poolSize = isMobile ? POOL.mobile : POOL.desktop;
    const step = isMobile ? STEP.mobile : STEP.desktop;

    /* --- havuz --------------------------------------------------------- */
    type Slot = { wrap: HTMLDivElement; img: HTMLImageElement; anim?: Animation };
    const slots: Slot[] = [];

    for (let i = 0; i < poolSize; i++) {
      const wrap = document.createElement("div");
      wrap.className = "absolute left-0 top-0 will-change-transform";

      const img = document.createElement("img");
      img.className =
        "block w-[136px] sm:w-[188px] aspect-[4/5] object-cover rounded-[18px] " +
        "border border-white/70 will-change-[transform,opacity]";
      img.style.opacity = "0";
      img.style.boxShadow = "0 18px 44px -22px rgb(0 0 0 / 0.38)";
      img.decoding = "async";
      img.draggable = false;
      img.alt = "";

      wrap.appendChild(img);
      layer.appendChild(wrap);
      slots.push({ wrap, img });
    }

    /* --- kademeli ön yükleme ------------------------------------------- */
    const deck = shuffled(PHOTOS.map((p) => p.id)).slice(
      0,
      isMobile ? PRELOAD_LIMIT.mobile : PRELOAD_LIMIT.desktop,
    );
    const ready: string[] = [];
    let cancelled = false;

    const loadOne = (id: number) =>
      new Promise<void>((resolve) => {
        const url = photoSrc.trail(id, "webp");
        const probe = new Image();
        probe.onload = () => {
          if (!cancelled) ready.push(url);
          resolve();
        };
        probe.onerror = () => resolve();
        probe.src = url;
      });

    (async () => {
      for (let i = 0; i < deck.length && !cancelled; i += PRELOAD_CONCURRENCY) {
        await Promise.all(deck.slice(i, i + PRELOAD_CONCURRENCY).map(loadOne));
      }
    })();

    /* --- konum ölçüsü -------------------------------------------------- */
    // Kaydırma ve yeniden boyutlandırmada tazelenir; her karede
    // getBoundingClientRect çağırmak düzen okuması demek olurdu.
    let rect = section.getBoundingClientRect();
    const remeasure = () => {
      rect = section.getBoundingClientRect();
    };
    window.addEventListener("scroll", remeasure, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });

    /* --- doğurma ------------------------------------------------------- */
    let lastX = 0;
    let lastY = 0;
    let primed = false;
    let count = 0;
    let hintHidden = false;

    const spawn = (clientX: number, clientY: number) => {
      if (ready.length === 0) return;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (!primed) {
        primed = true;
        lastX = x;
        lastY = y;
        return;
      }

      const dx = x - lastX;
      const dy = y - lastY;
      if (dx * dx + dy * dy < step * step) return;
      lastX = x;
      lastY = y;

      if (!hintHidden) {
        hintHidden = true;
        hintRef.current?.style.setProperty("opacity", "0");
      }

      const slot = slots[count % poolSize];
      count++;

      slot.img.src = ready[count % ready.length];
      // Hafif eğim, dönüşümlü yönlerde — dizilim mekanik görünmesin.
      const tilt = (count % 2 === 0 ? 1 : -1) * (4 + ((count * 7) % 7));
      slot.wrap.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${tilt}deg)`;
      slot.wrap.style.zIndex = String(count);

      slot.anim?.cancel();
      slot.anim = slot.img.animate(KEYFRAMES, {
        duration: LIFETIME,
        easing: "linear",
        fill: "none",
      });
    };

    /* --- girdi --------------------------------------------------------- */
    // Fare/kalem için pointermove; dokunma için touchmove. Dokunmada
    // pointermove kaydırma başlayınca iptal ediliyor, touchmove ise akmaya
    // devam ediyor — bu yüzden ikisi ayrı ayrı bağlanıyor.
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      spawn(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) spawn(t.clientX, t.clientY);
    };

    const onLeave = () => {
      primed = false;
    };

    section.addEventListener("pointermove", onPointerMove, { passive: true });
    section.addEventListener("touchmove", onTouchMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    section.addEventListener("touchend", onLeave, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", remeasure);
      window.removeEventListener("resize", remeasure);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("touchmove", onTouchMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("touchend", onLeave);
      for (const s of slots) {
        s.anim?.cancel();
        s.wrap.remove();
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden px-6 sm:px-10"
    >
      {background}
      <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0 z-0" />
      <StaticCollage />
      {/* İçerik alta oturur: görselin ortasındaki tipografiyle yarışmasın. */}
      <div className="pointer-events-none relative z-10 flex min-h-[100svh] w-full flex-col justify-end pb-16 pt-24 sm:pb-14">
        <div className="pointer-events-auto">{children}</div>
      </div>
      <div
        ref={hintRef}
        aria-hidden
        className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 text-[0.8rem] font-medium uppercase tracking-[0.2em] text-ink/50 transition-opacity duration-700 sm:bottom-16"
      >
        <span className="hidden sm:inline">fareni gezdir</span>
        <span className="sm:hidden">parmağını kaydır</span>
      </div>
    </section>
  );
}

/**
 * `prefers-reduced-motion: reduce` açıkken iz efekti hiç kurulmuyor; onun yerine
 * aynı fotoğraflardan sabit bir kolaj görünüyor. Bölüm boş kalmasın.
 */
const COLLAGE = [
  { className: "left-[4%] top-[14%] w-[26vw] max-w-[180px] -rotate-6" },
  { className: "right-[6%] top-[10%] w-[24vw] max-w-[165px] rotate-5" },
  { className: "left-[12%] bottom-[12%] w-[22vw] max-w-[150px] rotate-3" },
  { className: "right-[10%] bottom-[16%] w-[27vw] max-w-[190px] -rotate-4" },
];

function StaticCollage() {
  return (
    <div aria-hidden className="absolute inset-0 z-0 hidden motion-reduce:block">
      {COLLAGE.map((item, i) => (
        <img
          key={i}
          src={photoSrc.trail(PHOTOS[i * 7]?.id ?? PHOTOS[i].id, "webp")}
          alt=""
          className={`absolute aspect-[4/5] rounded-[18px] border border-white/70 object-cover opacity-90 shadow-soft ${item.className}`}
        />
      ))}
    </div>
  );
}
