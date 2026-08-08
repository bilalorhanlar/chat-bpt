"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { questionForDate } from "@/lib/daily-question";
import { todayDateOnly } from "@/lib/date-only";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

/**
 * Günün sorusu.
 *
 * Soru metni veritabanında saklanmıyor, tarihten hesaplanıyor: aynı gün her
 * zaman aynı soruyu verir ve havuza dokunmadıkça geçmiş de değişmez.
 * `DailyQuestion` satırı yalnızca ilk cevap yazıldığında oluşuyor — böylece
 * cevaplanmamış günler tabloyu şişirmiyor.
 */

const AnswerInput = z.object({
  /** `YYYY-MM-DD` */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  text: z.string().trim().min(1, "Boş cevap gönderilemez").max(1000, "Çok uzun"),
});

export async function answerQuestion(
  input: z.infer<typeof AnswerInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = AnswerInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const [y, m, d] = parsed.data.date.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  // Sadece bugünün sorusu cevaplanabilir: geçmişe dönük yazmak "aynı anda
  // açılma" fikrini bozar.
  if (date.getTime() !== todayDateOnly().getTime()) {
    return { ok: false, error: "Yalnızca bugünün sorusu cevaplanabilir." };
  }

  const question = await db.dailyQuestion.upsert({
    where: { date },
    create: { date, text: questionForDate(date) },
    update: {},
  });

  await db.questionAnswer.upsert({
    where: { questionId_userId: { questionId: question.id, userId: session.user } },
    create: { questionId: question.id, userId: session.user, text: parsed.data.text },
    update: { text: parsed.data.text },
  });

  revalidatePath("/gunun-sorusu");
  return { ok: true };
}
