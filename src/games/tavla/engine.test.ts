import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyMove,
  canBearOff,
  canRoll,
  endTurn,
  initialState,
  legalMoves,
  mustPass,
  pipCount,
  reachableFrom,
  roll,
  scoreResult,
  undoTurn,
} from "./engine";
import { BAR, OFF, type Player, type TavlaState } from "./types";

/** `{dizin: taşSayısı}` — pozitif beyaz, negatif siyah. */
function points(map: Record<number, number>): number[] {
  const out = new Array<number>(24).fill(0);
  for (const [index, count] of Object.entries(map)) out[Number(index)] = count;
  return out;
}

function state(partial: Partial<TavlaState> & { points: number[] }): TavlaState {
  return {
    bar: [0, 0],
    off: [0, 0],
    turn: 0,
    rolled: null,
    dice: [],
    turnMoves: [],
    turnStart: null,
    winner: null,
    result: null,
    turnStartedAt: 0,
    ply: 0,
    ...partial,
  };
}

const moveKeys = (s: TavlaState) =>
  legalMoves(s)
    .map((m) => `${m.from}->${m.to}/${m.die}`)
    .sort();

describe("başlangıç", () => {
  it("her oyuncuda 15 taş var", () => {
    const s = initialState(0, 0);
    const white = s.points.filter((n) => n > 0).reduce((a, b) => a + b, 0);
    const black = -s.points.filter((n) => n < 0).reduce((a, b) => a + b, 0);
    assert.equal(white, 15);
    assert.equal(black, 15);
  });

  it("iki tarafın da pip sayısı 167", () => {
    const s = initialState(0, 0);
    assert.equal(pipCount(s, 0), 167);
    assert.equal(pipCount(s, 1), 167);
  });
});

describe("zar atışı", () => {
  it("çift atışta dört hamle hakkı verir", () => {
    const s = roll(initialState(0, 0), [4, 4], 0);
    assert.deepEqual(s.dice, [4, 4, 4, 4]);
  });

  it("farklı zarlarda iki hamle hakkı verir", () => {
    const s = roll(initialState(0, 0), [6, 3], 0);
    assert.deepEqual(s.dice, [6, 3]);
  });
});

describe("bar zorunluluğu", () => {
  it("bar'da taş varken başka hamle üretilmez", () => {
    const s = state({
      points: points({ 12: 3 }),
      bar: [1, 0],
      dice: [5, 3],
      turn: 0,
    });
    // Beyaz 5 ile 19'a, 3 ile 21'e girer; tahtadaki taş oynatılamaz.
    assert.deepEqual(moveKeys(s), ["-1->19/5", "-1->21/3"]);
  });

  it("giriş hanesi kapalıysa o zarla girilemez", () => {
    const s = state({
      points: points({ 19: -2 }), // 5 ile girilecek hane kapalı
      bar: [1, 0],
      dice: [5, 3],
      turn: 0,
    });
    assert.deepEqual(moveKeys(s), ["-1->21/3"]);
  });

  it("hiçbir zarla girilemiyorsa tur pas geçilir", () => {
    const s = state({
      points: points({ 19: -2, 21: -3 }),
      bar: [1, 0],
      dice: [5, 3],
      turn: 0,
    });
    assert.equal(legalMoves(s).length, 0);
    assert.equal(mustPass(s), true);
  });
});

describe("vuruş", () => {
  it("tek taşlı haneye gelince rakip bar'a gider", () => {
    const before = state({
      points: points({ 5: 1, 2: -1 }),
      dice: [3],
      turn: 0,
    });
    const after = applyMove(before, 5, 2);
    assert.equal(after.points[2], 1, "hane artık beyazın");
    assert.deepEqual(after.bar, [0, 1], "siyah taş bar'a gitti");
  });

  it("iki taşlı haneye girilemez", () => {
    const s = state({ points: points({ 5: 1, 2: -2 }), dice: [3], turn: 0 });
    assert.equal(legalMoves(s).length, 0);
  });
});

describe("en çok zarı oynama zorunluluğu", () => {
  it("ikinci zarı öldüren hamle elenir", () => {
    // Beyazın tek taşı 12'de. 6 ile 6'ya gidemiyor (kapalı).
    // 5 ile 7'ye, oradan 6 ile 1'e gidebiliyor → iki zar oynanabilir.
    const s = state({
      points: points({ 12: 1, 6: -2 }),
      dice: [6, 5],
      turn: 0,
    });
    assert.deepEqual(moveKeys(s), ["12->7/5"]);
  });

  it("yalnızca tek zar oynanabiliyorsa büyük olan zorunludur", () => {
    // Her iki zar da tek başına oynanabiliyor ama ikisi birden oynanamıyor.
    const s = state({
      points: points({ 10: 1, 1: -2 }),
      dice: [6, 3],
      turn: 0,
    });
    assert.deepEqual(moveKeys(s), ["10->4/6"]);
  });
});

describe("toplama", () => {
  it("tüm taşlar evde değilken toplanamaz", () => {
    const s = state({ points: points({ 0: 14, 12: 1 }), dice: [6], turn: 0 });
    assert.equal(canBearOff(s, 0), false);
  });

  it("bar'da taş varken toplanamaz", () => {
    const s = state({ points: points({ 0: 14 }), bar: [1, 0], dice: [6], turn: 0 });
    assert.equal(canBearOff(s, 0), false);
  });

  it("zar fazlaysa yalnızca en uzaktaki taş toplanır", () => {
    // 15 taş evde: 0, 1 ve 2 numaralı dizinlerde beşer.
    const s = state({ points: points({ 0: 5, 1: 5, 2: 5 }), dice: [6], turn: 0 });
    assert.equal(canBearOff(s, 0), true);
    assert.deepEqual(moveKeys(s), ["2->24/6"]);
  });

  it("zar tam gelirse o haneden toplanır", () => {
    const s = state({ points: points({ 0: 5, 1: 5, 2: 5 }), dice: [2], turn: 0 });
    // 2 zarı 1 numaralı dizinden tam toplar; 2'den 0'a normal hamle de var.
    assert.ok(moveKeys(s).includes("1->24/2"));
    assert.ok(moveKeys(s).includes("2->0/2"));
  });

  it("siyah da kendi evinden toplayabilir", () => {
    const s = state({ points: points({ 23: -5, 22: -5, 21: -5 }), dice: [6], turn: 1 });
    assert.equal(canBearOff(s, 1), true);
    assert.deepEqual(moveKeys(s), ["21->24/6"]);
  });
});

describe("oyun sonu", () => {
  it("15. taş toplanınca kazanan belirlenir", () => {
    const s = state({ points: points({ 0: 1 }), off: [14, 0], dice: [1], turn: 0 });
    const after = applyMove(s, 0, OFF);
    assert.equal(after.winner, 0);
    assert.equal(after.off[0], 15);
  });

  it("kaybeden taş topladıysa normal sonuç", () => {
    const s = state({ points: points({ 20: -3 }), off: [15, 5] });
    assert.equal(scoreResult(s, 0), "NORMAL");
  });

  it("kaybeden hiç toplayamadıysa mars", () => {
    const s = state({ points: points({ 20: -15 }), off: [15, 0] });
    assert.equal(scoreResult(s, 0), "MARS");
  });

  it("kaybedenin bar'da taşı varsa hamars", () => {
    const s = state({ points: points({ 20: -14 }), bar: [0, 1], off: [15, 0] });
    assert.equal(scoreResult(s, 0), "HAMARS");
  });

  it("kaybedenin taşı kazananın evindeyse hamars", () => {
    const s = state({ points: points({ 3: -1, 20: -14 }), off: [15, 0] });
    assert.equal(scoreResult(s, 0), "HAMARS");
  });
});

describe("tur akışı", () => {
  it("oynanacak hamle varken tur devredilmez", () => {
    const s = roll(initialState(0, 0), [3, 1], 0);
    assert.equal(endTurn(s, 0).turn, 0);
  });

  it("zarlar bitince sıra karşıya geçer", () => {
    const s = state({ points: points({ 12: 1 }), dice: [], turn: 0, ply: 4 });
    const after = endTurn(s, 100);
    assert.equal(after.turn, 1);
    assert.equal(after.ply, 5);
    assert.equal(after.turnStartedAt, 100);
  });

  it("geri alma tur başına döner", () => {
    const start = roll(state({ points: points({ 12: 2 }), turn: 0 }), [3, 1], 0);
    const moved = applyMove(start, 12, 9);
    assert.notDeepEqual(moved.points, start.points);

    const undone = undoTurn(moved);
    assert.deepEqual(undone.points, start.points);
    assert.deepEqual(undone.dice, [3, 1]);
    assert.equal(undone.turnMoves.length, 0);
  });
});

describe("hamle doğrulama", () => {
  it("geçersiz hamle hata fırlatır", () => {
    const s = roll(initialState(0, 0), [3, 1], 0);
    assert.throws(() => applyMove(s, 23, 0), /oynanamaz/);
  });

  it("bar'daki oyuncu tahtadaki taşını oynayamaz", () => {
    const s = state({ points: points({ 12: 3 }), bar: [1, 0], dice: [5, 3], turn: 0 });
    assert.throws(() => applyMove(s, 12, 7), /oynanamaz/);
  });
});

describe("simülasyon", () => {
  it("rastgele 200 oyun kural hatası vermeden biter", () => {
    // Sözde rastgele: tohum sabit, başarısızlık tekrar üretilebilsin.
    let seed = 12345;
    const nextInt = (max: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % max;
    };

    for (let game = 0; game < 200; game++) {
      let s = initialState((game % 2) as Player, 0);
      let guard = 0;

      while (s.winner === null && guard++ < 5000) {
        s = roll(s, [nextInt(6) + 1, nextInt(6) + 1], 0);

        while (s.winner === null) {
          const moves = legalMoves(s);
          if (moves.length === 0) break;
          const pick = moves[nextInt(moves.length)];
          s = applyMove(s, pick.from as number, pick.to as number);
        }

        if (s.winner !== null) break;
        s = endTurn(s, 0);
      }

      assert.notEqual(s.winner, null, `oyun ${game} bitmedi`);
      assert.equal(s.off[s.winner!], 15);

      // Taş sayısı korunmalı: hiçbir taş kaybolmamalı ya da çoğalmamalı.
      for (const player of [0, 1] as Player[]) {
        const onBoard = s.points.reduce(
          (sum, value) => sum + (player === 0 ? Math.max(0, value) : Math.max(0, -value)),
          0,
        );
        assert.equal(onBoard + s.bar[player] + s.off[player], 15, `oyun ${game}, oyuncu ${player}`);
      }
    }
  });
});

describe("tur başına tek atış", () => {
  it("tur başında zar atılabilir", () => {
    assert.equal(canRoll(initialState(0, 0)), true);
  });

  it("atıştan sonra tekrar atılamaz", () => {
    const s = roll(initialState(0, 0), [6, 3], 0);
    assert.equal(canRoll(s), false);
    // Aynı tur içinde ikinci atış durumu değiştirmemeli.
    assert.deepEqual(roll(s, [1, 1], 0), s);
  });

  it("zarların hepsi oynanınca da tekrar atılamaz", () => {
    // Bu, sunucuda gerçekten çıkan hatanın regresyon testi: `dice` boşalınca
    // oyuncu sırayı devretmeden yeniden zar atabiliyordu.
    let s = roll(state({ points: points({ 12: 2 }), turn: 0 }), [3, 1], 0);
    s = applyMove(s, 12, 9);
    s = applyMove(s, 12, 11);
    assert.deepEqual(s.dice, [], "zarlar tükendi");
    assert.equal(canRoll(s), false, "tur devredilmeden atış olmamalı");

    const next = endTurn(s, 0);
    assert.equal(next.turn, 1);
    assert.equal(canRoll(next), true, "devredilince karşı taraf atabilir");
  });
});

describe("bar sabiti", () => {
  it("bar ve off dizin değerleri hane aralığının dışında", () => {
    assert.equal(BAR, -1);
    assert.equal(OFF, 24);
  });
});

describe("zincirleme hamleler", () => {
  it("aynı pul iki zarı da oynayabiliyorsa üç hedef de görünür", () => {
    // Tek beyaz pul 12'de, zarlar 3 ve 5. Gidebileceği yerler:
    //   3 ile 9, 5 ile 7, ikisiyle 4.
    const s = state({ points: points({ 12: 1 }), dice: [3, 5], turn: 0 });
    const reach = reachableFrom(s, 12)
      .map((r) => r.to)
      .sort((a, b) => Number(a) - Number(b));
    assert.deepEqual(reach, [4, 7, 9]);
  });

  it("zincirin adımları sırayla veriliyor", () => {
    const s = state({ points: points({ 12: 1 }), dice: [3, 5], turn: 0 });
    const far = reachableFrom(s, 12).find((r) => r.to === 4);
    assert.equal(far?.path.length, 2, "iki zar da kullanılmalı");
    assert.equal(far?.path[0].from, 12);
    assert.equal(far?.path.at(-1)?.to, 4);
    // Adımlar art arda bağlanmalı: birinin hedefi diğerinin kaynağı.
    assert.equal(far?.path[0].to, far?.path[1].from);
  });

  it("ara hane kapalıysa o zincir kurulmaz", () => {
    // 12'den 3 ile 9'a gidilemiyor (kapalı), 5 ile 7'ye gidilip oradan
    // 3 ile 4'e devam edilebiliyor. Yani 9 hedef listesinde olmamalı.
    const s = state({ points: points({ 12: 1, 9: -2 }), dice: [3, 5], turn: 0 });
    const reach = reachableFrom(s, 12)
      .map((r) => r.to)
      .sort((a, b) => Number(a) - Number(b));
    assert.deepEqual(reach, [4, 7]);
  });

  it("çift zarda dört adıma kadar zincirlenir", () => {
    const s = state({ points: points({ 20: 1 }), dice: [2, 2, 2, 2], turn: 0 });
    const reach = reachableFrom(s, 20)
      .map((r) => r.to)
      .sort((a, b) => Number(a) - Number(b));
    assert.deepEqual(reach, [12, 14, 16, 18]);
  });

  it("toplanan pul zincire devam etmez", () => {
    const s = state({ points: points({ 0: 5, 1: 5, 2: 5 }), dice: [1, 1, 1, 1], turn: 0 });
    const off = reachableFrom(s, 0).find((r) => r.to === OFF);
    assert.equal(off?.path.length, 1, "toplama tek adımdır");
  });
});
