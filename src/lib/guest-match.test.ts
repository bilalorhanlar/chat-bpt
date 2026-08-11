import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";

import { PrismaClient } from "@prisma/client";

import type { Session } from "./auth";
import { canAct, createMatch, loadMatch, matchAccess } from "./match";

/**
 * Misafir maçı sahipliği.
 *
 * Yakaladığı açık: misafir maçları herhangi bir oturuma açıktı. Maç
 * bağlantısını gören başka bir misafir — ya da ev sahiplerinden biri — oyuna
 * hamle yapabiliyordu. Artık maç, onu açan misafir oturumunun kimliğine bağlı.
 */

const db = new PrismaClient();
const hasDb = Boolean(process.env.DATABASE_URL);

after(async () => {
  if (hasDb) await db.gameMatch.deleteMany({ where: { guest: true } });
  await db.$disconnect();
});

const bilal: Session = { kind: "kisi", user: "bilal" };

describe("misafir maçı sahipliği", { skip: hasDb ? false : "DATABASE_URL yok" }, () => {
  it("yalnızca açan misafir oynayabilir", async () => {
    const sahibi: Session = { kind: "misafir", id: randomUUID() };
    const yabanci: Session = { kind: "misafir", id: randomUUID() };

    const id = await createMatch({
      game: "TAVLA",
      mode: "LOCAL",
      creator: "bilal",
      state: { turn: 0 },
      status: "ACTIVE",
      guest: true,
      guestId: sahibi.id,
    });
    const match = (await loadMatch(id))!;

    assert.equal(canAct(match, sahibi, 0), true, "açan misafir oynayabilmeli");
    assert.equal(matchAccess(match, sahibi).allowed, true);

    assert.equal(canAct(match, yabanci, 0), false, "başka misafir oynayamaz");
    assert.equal(matchAccess(match, yabanci).allowed, false);

    // Ev sahipleri de misafir maçına karışmıyor: kendi maçlarını açarlar.
    assert.equal(canAct(match, bilal, 0), false);
    assert.equal(matchAccess(match, bilal).allowed, false);
  });

  it("kimliksiz misafir maçı kimseye açılmaz", async () => {
    const misafir: Session = { kind: "misafir", id: randomUUID() };

    // guestId olmadan yazılmış (eski) kayıt.
    const id = await createMatch({
      game: "TAVLA",
      mode: "LOCAL",
      creator: "bilal",
      state: { turn: 0 },
      status: "ACTIVE",
      guest: true,
    });
    const match = (await loadMatch(id))!;

    assert.equal(match.guestId, null);
    assert.equal(canAct(match, misafir, 0), false);
    assert.equal(matchAccess(match, misafir).allowed, false);
  });

  it("misafir, ev sahiplerinin maçına karışamaz", async () => {
    const misafir: Session = { kind: "misafir", id: randomUUID() };

    const id = await createMatch({
      game: "TAVLA",
      mode: "LOCAL",
      creator: "bilal",
      state: { turn: 0 },
      status: "ACTIVE",
    });
    const match = (await loadMatch(id))!;

    assert.equal(canAct(match, misafir, 0), false);
    assert.equal(matchAccess(match, misafir).allowed, false);
    assert.equal(canAct(match, bilal, 0), true, "ev sahibi kendi maçını oynayabilir");

    await db.gameMatch.delete({ where: { id } });
  });
});
