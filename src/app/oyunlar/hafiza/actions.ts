"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

/**
 * Hafıza oyunu skoru.
 *
 * Tek kişilik olduğu için maç akışı yok: oyun tarayıcıda oynanıyor, buraya
 * yalnızca bitmiş sonuç yazılıyor. Sunucu süreyi doğrulayamaz — iki kişilik
 * bir sitede bunu dert etmeye değmez, ama akıl dışı değerler yine de eleniyor.
 */

const ScoreInput = z.object({
  /** Milisaniye. 3 saniyeden kısa ya da 1 saatten uzun oyun kabul edilmez. */
  durationMs: z.number().int().min(3_000).max(3_600_000),
  moves: z.number().int().min(8).max(500),
  pairs: z.number().int().min(4).max(16),
});

export async function saveHafizaScore(
  input: z.infer<typeof ScoreInput>,
): Promise<{ ok: true; best: boolean } | { ok: false; error: string }> {
  const session = await requireSession();
  const user = sessionUser(session);
  const parsed = ScoreInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz skor." };

  // Misafirin skoru rekor tablosuna girmiyor; oyun yine oynanabiliyor.
  if (user === null) return { ok: true, best: false };

  const previousBest = await db.gameMatch.findFirst({
    where: { game: "HAFIZA", winnerId: user, durationMs: { not: null } },
    orderBy: { durationMs: "asc" },
    select: { durationMs: true },
  });

  await db.gameMatch.create({
    data: {
      game: "HAFIZA",
      mode: "LOCAL",
      status: "FINISHED",
      state: { moves: parsed.data.moves, pairs: parsed.data.pairs },
      winnerId: user,
      result: "NORMAL",
      scoreDelta: 1,
      durationMs: parsed.data.durationMs,
      finishedAt: new Date(),
      players: { create: [{ userId: user, seat: 0 }] },
    },
  });

  revalidatePath("/sampiyona");
  revalidatePath("/oyunlar/hafiza");

  const best =
    previousBest?.durationMs === null ||
    previousBest === null ||
    parsed.data.durationMs < previousBest.durationMs!;
  return { ok: true, best };
}
