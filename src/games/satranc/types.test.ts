import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";

import { START_MS, remainingMs, sideToMove, type SatrancState } from "./types";

function state(partial: Partial<SatrancState> = {}): SatrancState {
  return {
    fen: new Chess().fen(),
    history: [],
    lastMove: null,
    clocks: [START_MS, START_MS],
    turnStartedAt: 1_000_000,
    winner: null,
    result: null,
    ...partial,
  };
}

describe("sıra", () => {
  it("başlangıçta beyaz oynar", () => {
    assert.equal(sideToMove(state()), 0);
  });

  it("hamleden sonra siyaha geçer", () => {
    const chess = new Chess();
    chess.move("e4");
    assert.equal(sideToMove(state({ fen: chess.fen() })), 1);
  });
});

describe("saat", () => {
  it("yalnızca sırası gelenin saati akar", () => {
    const s = state({ turnStartedAt: 1_000_000 });
    const now = 1_030_000; // 30 saniye sonra

    assert.equal(remainingMs(s, 0, now), START_MS - 30_000, "beyazın saati işliyor");
    assert.equal(remainingMs(s, 1, now), START_MS, "siyahınki duruyor");
  });

  it("ekleme yok: hamle sonrası kalan süre olduğu gibi duruyor", () => {
    // Beyaz 30 saniye düşünüp oynadı; sıra siyahta, beyazın saati durdu.
    // 5+0 olduğu için beyaza hiçbir şey eklenmemeli — 4:30 kalmalı.
    const chess = new Chess();
    chess.move("e4");
    const afterWhiteMove = state({
      fen: chess.fen(),
      clocks: [START_MS - 30_000, START_MS],
      turnStartedAt: 2_000_000,
    });

    assert.equal(sideToMove(afterWhiteMove), 1, "sıra siyaha geçti");
    assert.equal(
      remainingMs(afterWhiteMove, 0, 2_010_000),
      START_MS - 30_000,
      "beyazın saati donmuş, üstüne ekleme yok",
    );
    assert.equal(remainingMs(afterWhiteMove, 1, 2_010_000), START_MS - 10_000);
  });

  it("süre sıfırın altına inmez", () => {
    const s = state({ clocks: [5_000, START_MS], turnStartedAt: 1_000_000 });
    assert.equal(remainingMs(s, 0, 1_060_000), 0);
  });

  it("oyun bittiğinde saat donar", () => {
    const s = state({ clocks: [42_000, 10_000], turnStartedAt: 1_000_000, winner: 1 });
    assert.equal(remainingMs(s, 0, 9_999_999), 42_000);
  });
});

describe("sonuç okuma", () => {
  it("çoban matı mat olarak biter", () => {
    const chess = new Chess();
    for (const san of ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"]) chess.move(san);
    assert.equal(chess.isCheckmate(), true);
    // Mat olan sıradaki taraftır; burada siyah.
    assert.equal(chess.turn(), "b");
  });

  it("pat konumu mat değil beraberedir", () => {
    const chess = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    assert.equal(chess.isStalemate(), true);
    assert.equal(chess.isCheckmate(), false);
  });
});
