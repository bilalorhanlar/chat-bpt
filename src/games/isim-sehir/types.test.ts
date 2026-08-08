import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  emptyAnswers,
  initialState,
  normalize,
  scoreRound,
  startsWithLetter,
  type Answers,
  type IsimSehirState,
} from "./types";

function withAnswers(
  letter: string,
  a: Partial<Answers>,
  b: Partial<Answers>,
  votes: IsimSehirState["votes"] = [{}, {}],
): IsimSehirState {
  const s = initialState(letter, null);
  s.answers = [
    { ...emptyAnswers(), ...a },
    { ...emptyAnswers(), ...b },
  ];
  s.votes = votes;
  return s;
}

describe("sadeleştirme", () => {
  it("Türkçe küçük harf kuralını uygular", () => {
    // Türkçe'de I → ı, İ → i. İngilizce toLowerCase bunu yanlış yapar.
    assert.equal(normalize("İZMİR"), "izmir");
    assert.equal(normalize("  Ankara  "), "ankara");
  });

  it("harf denetimi Türkçe'ye göre çalışır", () => {
    assert.equal(startsWithLetter("İzmir", "İ"), true);
    assert.equal(startsWithLetter("Ankara", "İ"), false);
    assert.equal(startsWithLetter("   ", "A"), false);
  });
});

describe("puanlama", () => {
  it("farklı geçerli kelimeler 10'ar puan", () => {
    const s = withAnswers("A", { sehir: "Ankara" }, { sehir: "Adana" });
    assert.deepEqual(scoreRound(s), [10, 10]);
  });

  it("aynı kelime 5'er puan", () => {
    const s = withAnswers("A", { sehir: "Ankara" }, { sehir: "ankara" });
    assert.deepEqual(scoreRound(s), [5, 5]);
  });

  it("yalnız bulan 10, boş bırakan 0", () => {
    const s = withAnswers("A", { hayvan: "Ayı" }, {});
    assert.deepEqual(scoreRound(s), [10, 0]);
  });

  it("harfle başlamayan cevap sayılmaz", () => {
    const s = withAnswers("A", { sehir: "Bursa" }, { sehir: "Adana" });
    assert.deepEqual(scoreRound(s), [0, 10]);
  });

  it("karşı taraf geçersiz derse puan gitmez", () => {
    // 1 numaralı oyuncu, 0'ın "sehir" cevabını reddediyor.
    const s = withAnswers("A", { sehir: "Aaaa" }, { sehir: "Adana" }, [{}, { sehir: false }]);
    assert.deepEqual(scoreRound(s), [0, 10]);
  });

  it("beş kategori toplanır", () => {
    const s = withAnswers(
      "K",
      { isim: "Kemal", sehir: "Kars", hayvan: "Kedi", bitki: "Kavak", esya: "Kalem" },
      { isim: "Kaan", sehir: "Konya", hayvan: "Kedi", bitki: "Kekik", esya: "Kaşık" },
    );
    // Dördü farklı (10'ar), "kedi" ortak (5'er).
    assert.deepEqual(scoreRound(s), [45, 45]);
  });

  it("boş tur sıfır puan", () => {
    assert.deepEqual(scoreRound(withAnswers("A", {}, {})), [0, 0]);
  });
});
