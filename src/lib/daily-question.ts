import { QUESTIONS, QUESTION_EPOCH } from "@/data/questions";
import { daysBetween, parseDateOnly } from "@/lib/utils";

/**
 * Günün sorusunu tarihten hesaplar.
 *
 * Soru metni veritabanında saklanmıyor: aynı gün her zaman aynı soruyu verir,
 * cevaplanmamış günler tabloyu şişirmez. `DailyQuestion` satırı yalnızca ilk
 * cevap yazıldığında oluşuyor.
 */
export function questionForDate(date: Date): string {
  const index = daysBetween(parseDateOnly(QUESTION_EPOCH), date);
  // Modulo negatif olabilir (epoch öncesi bir gün); pozitife çekiyoruz.
  return QUESTIONS[((index % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length];
}
