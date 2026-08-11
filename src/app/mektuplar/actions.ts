"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePerson } from "@/lib/session";

const WriteInput = z.object({
  title: z.string().trim().min(1, "Başlık boş olamaz").max(120, "Başlık çok uzun"),
  body: z.string().trim().min(1, "Mektup boş olamaz").max(8000, "Mektup çok uzun"),
  /** `YYYY-MM-DD` — açılma günü. */
  openAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih geçersiz"),
});

export async function writeLetter(
  input: z.infer<typeof WriteInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requirePerson();
  const parsed = WriteInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const [y, m, d] = parsed.data.openAt.split("-").map(Number);
  // Açılma anı, seçilen günün yerel gece yarısı.
  const openAt = new Date(y, m - 1, d, 0, 0, 0, 0);

  if (openAt.getTime() <= Date.now()) {
    return { ok: false, error: "Açılma tarihi ileride bir gün olmalı." };
  }

  await db.letter.create({
    data: {
      fromId: user,
      toId: user === "bilal" ? "partner" : "bilal",
      title: parsed.data.title,
      body: parsed.data.body,
      openAt,
    },
  });

  revalidatePath("/mektuplar");
  return { ok: true };
}

/**
 * Mektubu açılmış olarak işaretler.
 *
 * İçeriği burada döndürmüyoruz — sayfa yeniden çizildiğinde sunucu zaten
 * tarihi kontrol edip gönderiyor. Tek kaynak orası kalsın.
 */
export async function markLetterOpened(id: string): Promise<{ ok: boolean }> {
  const user = await requirePerson();

  const letter = await db.letter.findUnique({ where: { id } });
  if (!letter || letter.toId !== user) return { ok: false };
  if (letter.openAt.getTime() > Date.now()) return { ok: false };

  if (!letter.openedAt) {
    await db.letter.update({ where: { id }, data: { openedAt: new Date() } });
  }
  revalidatePath("/mektuplar");
  return { ok: true };
}

export async function deleteLetter(id: string): Promise<{ ok: boolean }> {
  const user = await requirePerson();
  const letter = await db.letter.findUnique({ where: { id } });
  // Yalnızca yazan silebilir, o da açılmadan önce.
  if (!letter || letter.fromId !== user || letter.openedAt) return { ok: false };
  await db.letter.delete({ where: { id } });
  revalidatePath("/mektuplar");
  return { ok: true };
}
