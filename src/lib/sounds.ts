"use client";

/**
 * Oyun sesleri.
 *
 * İki tuzağı çözüyor:
 *
 * 1. **Mobil otomatik oynatma kilidi.** iOS ve Android, kullanıcı sayfaya
 *    dokunmadan ses çalmayı engelliyor. `unlock()` ilk dokunuşta çağrılıyor ve
 *    bütün dosyaları sessizce bir kez oynatıp duraklatıyor; sonrasında
 *    `play()` gecikmesiz çalışıyor.
 *
 * 2. **Üst üste binen sesler.** Tek bir `Audio` nesnesini yeniden oynatmak,
 *    önceki sesi keser. Her ses için küçük bir havuz tutuluyor; sıradaki boş
 *    olan çalıyor. Zar ve satranç sesleri hızlı ardışık geldiği için gerekli.
 */

export type SoundName = "zar" | "win" | "lose" | "mars" | "satranc" | "at" | "place" | "uyari";

const FILES: Record<SoundName, string> = {
  zar: "/ses/zar.mp3",
  win: "/ses/win.mp3",
  lose: "/ses/lose.mp3",
  mars: "/ses/mars.mp3",
  satranc: "/ses/satranc.mp3",
  at: "/ses/at.mp3",
  place: "/ses/place.mp3",
  uyari: "/ses/uyari.mp3",
};

/** Kısa efektler üst üste binebilir; uzun olanların tek kopyası yeter. */
const POOL_SIZE: Record<SoundName, number> = {
  zar: 3,
  satranc: 3,
  at: 2,
  win: 1,
  lose: 1,
  mars: 1,
  // Pul sesi arka arkaya gelir (zincir hamlede iki kez), havuz gerekli.
  place: 3,
  uyari: 1,
};

const VOLUME: Record<SoundName, number> = {
  zar: 0.55,
  satranc: 0.5,
  at: 0.5,
  win: 0.6,
  lose: 0.6,
  mars: 0.6,
  place: 0.6,
  // Uyarı anonsu dikkat çekmeli ama bağırmamalı.
  uyari: 0.45,
};

type Pool = { items: HTMLAudioElement[]; next: number };

let pools: Partial<Record<SoundName, Pool>> = {};
let unlocked = false;
let muted = false;

function pool(name: SoundName): Pool {
  let existing = pools[name];
  if (!existing) {
    existing = {
      items: Array.from({ length: POOL_SIZE[name] }, () => {
        const audio = new Audio(FILES[name]);
        audio.preload = "auto";
        audio.volume = VOLUME[name];
        return audio;
      }),
      next: 0,
    };
    pools[name] = existing;
  }
  return existing;
}

/**
 * İlk kullanıcı etkileşiminde çağrılır. Tarayıcının ses kilidini açar ve
 * dosyaları önden indirir; oyun içinde ilk sesin geç gelmesini engeller.
 */
export function unlockSounds() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;

  for (const name of Object.keys(FILES) as SoundName[]) {
    for (const audio of pool(name).items) {
      const previousVolume = audio.volume;
      audio.volume = 0;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = previousVolume;
        })
        .catch(() => {
          // Kilit hâlâ açılmadıysa sessizce geç; bir sonraki dokunuşta olur.
          audio.volume = previousVolume;
          unlocked = false;
        });
    }
  }
}

export function playSound(name: SoundName) {
  if (typeof window === "undefined" || muted) return;
  const p = pool(name);
  const audio = p.items[p.next];
  p.next = (p.next + 1) % p.items.length;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    // Otomatik oynatma engellendiyse sessizce geç — oyun akışını bozmayalım.
  });
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("ses", value ? "kapali" : "acik");
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("ses") === "kapali";
}

/** Test ve sıcak yükleme için havuzu sıfırlar. */
export function resetSounds() {
  pools = {};
  unlocked = false;
}

/** Oyun bittiğinde sonuca göre doğru sesi çalar. */
export function playOutcome(won: boolean, result?: string | null) {
  if (won && (result === "MARS" || result === "HAMARS")) return playSound("mars");
  playSound(won ? "win" : "lose");
}
