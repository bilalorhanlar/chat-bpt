import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { PrismaClient } from "@prisma/client";

import { FIXED_SEATS, joinOrCreateOnlineMatch, loadMatch, seatOf } from "./match";

/**
 * Online eşleşme testleri — gerçek veritabanına vurur.
 *
 * `DATABASE_URL` yoksa (CI, temiz makine) sessizce atlanır; bu mantık
 * yalnızca Postgres'in benzersizlik ve ilişki davranışıyla birlikte anlamlı,
 * sahte veri katmanıyla test etmek yanlış güven verirdi.
 *
 * Yakaladığı hata: maç açılırken iki koltuk da baştan yazılınca "rakibin
 * bekleyen odası var mı?" sorgusu kişinin kendi odasını buluyordu ve herkes
 * kendi odasına katılıp ayrı ayrı oynuyordu.
 */

const db = new PrismaClient();
const hasDb = Boolean(process.env.DATABASE_URL);

after(async () => {
  if (hasDb) {
    await db.gameMatch.deleteMany({ where: { game: "HAFIZA", mode: "ONLINE" } });
  }
  await db.$disconnect();
});

const state = () => ({ test: true });

/** Testler HAFIZA/ONLINE'ı kullanıyor: gerçek oyunların maçlarına dokunmasın. */
async function reset() {
  await db.gameMatch.deleteMany({ where: { game: "HAFIZA", mode: "ONLINE" } });
}

describe("online eşleşme", { skip: hasDb ? false : "DATABASE_URL yok" }, () => {
  it("aynı kişi iki kez basınca ikinci oda açılmaz", async () => {
    await reset();

    const first = await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "bilal",
      createState: state,
    });
    const second = await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "bilal",
      createState: state,
    });

    assert.equal(second.id, first.id, "aynı odaya dönmeli");
    assert.equal(second.joined, false, "kendi odasına katılmış sayılmamalı");

    const match = await loadMatch(first.id);
    assert.equal(match?.status, "WAITING", "rakip gelmeden başlamamalı");
    assert.equal(match?.seats.partner, undefined, "karşı tarafın koltuğu daha yok");
  });

  it("rakip basınca aynı odaya katılır ve maç başlar", async () => {
    await reset();

    const host = await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "bilal",
      createState: state,
    });
    const guest = await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "partner",
      createState: state,
    });

    assert.equal(guest.id, host.id, "yeni oda açmamalı");
    assert.equal(guest.joined, true);

    const match = await loadMatch(host.id);
    assert.equal(match?.status, "ACTIVE");
    // Koltuklar sabit: Sümeyye 0 (beyaz), Bilal 1 (siyah) — maçı kim açarsa açsın.
    assert.equal(match?.seats.partner, 0);
    assert.equal(match?.seats.bilal, 1);

    const total = await db.gameMatch.count({ where: { game: "HAFIZA", mode: "ONLINE" } });
    assert.equal(total, 1, "toplam tek maç olmalı");
  });

  it("başlayan maç yeni gelene tekrar açılmaz", async () => {
    await reset();

    const host = await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "bilal",
      createState: state,
    });
    await joinOrCreateOnlineMatch({ game: "HAFIZA", user: "partner", createState: state });

    // Maç ACTIVE; yeniden basmak yeni bir bekleyen oda açmalı.
    const again = await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "bilal",
      createState: state,
    });
    assert.notEqual(again.id, host.id);
    assert.equal(again.joined, false);

    const fresh = await loadMatch(again.id);
    assert.equal(fresh?.status, "WAITING");
  });

  it("renkler maçı kim açarsa açsın sabit kalır", async () => {
    await reset();

    // Bu kez Bilal değil Sümeyye açıyor; yine de Sümeyye beyaz (0) olmalı.
    const host = await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "partner",
      createState: state,
    });
    await joinOrCreateOnlineMatch({ game: "HAFIZA", user: "bilal", createState: state });

    const match = await loadMatch(host.id);
    assert.equal(match?.seats.partner, 0);
    assert.equal(match?.seats.bilal, 1);
    assert.equal(seatOf("partner"), 0);
    assert.equal(seatOf("bilal"), 1);
    assert.equal(FIXED_SEATS.length, 2);
  });

  it("onStart durumu maç başlarken tazeler", async () => {
    await reset();

    const host = await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "bilal",
      createState: () => ({ baslangic: true }),
    });
    await joinOrCreateOnlineMatch({
      game: "HAFIZA",
      user: "partner",
      createState: state,
      onStart: () => ({ tazelendi: true }),
    });

    const match = await loadMatch(host.id);
    assert.deepEqual(match?.state, { tazelendi: true }, "saatler katılım anında sıfırlanmalı");
  });
});
