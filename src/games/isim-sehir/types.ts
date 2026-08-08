/**
 * İsim–Şehir–Hayvan–Bitki–Eşya.
 *
 * Kelimeler otomatik sözlükle değil **karşılıklı onayla** doğrulanıyor: hazır
 * Türkçe kelime listeleri eksik kalıp geçerli kelimeleri reddediyor, bu da
 * oyunun keyfini kaçırıyor. Süre bitince cevaplar yan yana açılıyor ve her
 * oyuncu karşınınkine geçerli/geçersiz diyor.
 */

export type Category = "isim" | "sehir" | "hayvan" | "bitki" | "esya";

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "isim", label: "İsim" },
  { key: "sehir", label: "Şehir" },
  { key: "hayvan", label: "Hayvan" },
  { key: "bitki", label: "Bitki" },
  { key: "esya", label: "Eşya" },
];

/**
 * Çekilişte kullanılan harfler.
 *
 * Ğ hiçbir kelimenin başında gelmiyor; Iı, J, W, X, Q ile başlayan Türkçe
 * kelime neredeyse yok — hepsi çıkarıldı, tur boşa gitmesin.
 */
export const LETTERS = [
  "A", "B", "C", "Ç", "D", "E", "F", "G", "H", "İ", "K", "L", "M",
  "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z",
] as const;

export const TOTAL_ROUNDS = 5;
/** Online turda paylaşılan süre. */
export const ROUND_SECONDS = 90;

export type Answers = Record<Category, string>;

export type Phase =
  /** İkisi de cevaplarını yazıyor. */
  | "yazma"
  /** Cevaplar açıldı, karşılıklı onay bekleniyor. */
  | "onay"
  /** Tur puanları hesaplandı, sonraki tur bekleniyor. */
  | "sonuc";

export type RoundLog = {
  letter: string;
  answers: [Answers, Answers];
  points: [number, number];
};

export type IsimSehirState = {
  round: number;
  letter: string;
  phase: Phase;
  /** Online turda son yazma anı (ms). Aynı cihazda null. */
  deadline: number | null;
  answers: [Answers, Answers];
  submitted: [boolean, boolean];
  /** Her oyuncunun **karşı tarafın** cevaplarına verdiği geçerlilik oyu. */
  votes: [Partial<Record<Category, boolean>>, Partial<Record<Category, boolean>>];
  voted: [boolean, boolean];
  scores: [number, number];
  rounds: RoundLog[];
  winner: 0 | 1 | null;
};

export function emptyAnswers(): Answers {
  return { isim: "", sehir: "", hayvan: "", bitki: "", esya: "" };
}

/** Karşılaştırma için sadeleştirir: Türkçe küçük harf, kenar boşlukları atılmış. */
export function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

/** Kelime turun harfiyle başlıyor mu? */
export function startsWithLetter(value: string, letter: string): boolean {
  const word = normalize(value);
  if (word.length === 0) return false;
  return word.startsWith(letter.toLocaleLowerCase("tr-TR"));
}

/**
 * Bir turun puanı.
 *
 * Kural: yalnız bulan 10, ikisi de aynı kelimeyi yazdıysa 5, boş ya da
 * karşı tarafın geçersiz saydığı cevap 0. Harfle başlamayan cevap oy
 * beklenmeden geçersiz.
 */
export function scoreRound(state: IsimSehirState): [number, number] {
  let a = 0;
  let b = 0;

  for (const { key } of CATEGORIES) {
    // 0'ın cevabını 1 oyluyor, 1'inkini 0.
    const validA =
      startsWithLetter(state.answers[0][key], state.letter) && state.votes[1][key] !== false;
    const validB =
      startsWithLetter(state.answers[1][key], state.letter) && state.votes[0][key] !== false;

    if (validA && validB) {
      const same = normalize(state.answers[0][key]) === normalize(state.answers[1][key]);
      a += same ? 5 : 10;
      b += same ? 5 : 10;
    } else if (validA) {
      a += 10;
    } else if (validB) {
      b += 10;
    }
  }

  return [a, b];
}

export function initialState(letter: string, deadline: number | null): IsimSehirState {
  return {
    round: 1,
    letter,
    phase: "yazma",
    deadline,
    answers: [emptyAnswers(), emptyAnswers()],
    submitted: [false, false],
    votes: [{}, {}],
    voted: [false, false],
    scores: [0, 0],
    rounds: [],
    winner: null,
  };
}

/** Sonraki tura geçerken durumu sıfırlar; puanlar ve geçmiş korunur. */
export function nextRound(
  state: IsimSehirState,
  letter: string,
  deadline: number | null,
): IsimSehirState {
  return {
    ...state,
    round: state.round + 1,
    letter,
    phase: "yazma",
    deadline,
    answers: [emptyAnswers(), emptyAnswers()],
    submitted: [false, false],
    votes: [{}, {}],
    voted: [false, false],
  };
}
