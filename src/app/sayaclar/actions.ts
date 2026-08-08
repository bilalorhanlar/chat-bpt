"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fromDateString, toDateString } from "@/lib/date-only";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

const AddInput = z.object({
  title: z.string().trim().min(1, "Başlık boş olamaz").max(80, "Başlık çok uzun"),
  /** `YYYY-MM-DD` */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih geçersiz"),
  emoji: z.string().trim().max(8).optional(),
  repeatYearly: z.boolean(),
});

export type CountdownView = {
  id: string;
  title: string;
  /** `YYYY-MM-DD` — saat dilimi taşımaması için düz metin. */
  date: string;
  emoji: string | null;
  repeatYearly: boolean;
  createdById: string;
};

export async function addCountdown(
  input: z.infer<typeof AddInput>,
): Promise<{ ok: true; item: CountdownView } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = AddInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const created = await db.countdown.create({
    data: {
      title: parsed.data.title,
      date: fromDateString(parsed.data.date),
      emoji: parsed.data.emoji || null,
      repeatYearly: parsed.data.repeatYearly,
      createdById: session.user,
    },
  });

  revalidatePath("/sayaclar");
  return {
    ok: true,
    item: {
      id: created.id,
      title: created.title,
      date: toDateString(created.date),
      emoji: created.emoji,
      repeatYearly: created.repeatYearly,
      createdById: created.createdById,
    },
  };
}

export async function deleteCountdown(id: string) {
  await requireSession();
  await db.countdown.delete({ where: { id } });
  revalidatePath("/sayaclar");
}
