/**
 * Tohumlama — boş bir veritabanını kullanılabilir hâle getirir.
 *
 * Tekrar çalıştırılabilir (idempotent): var olanı günceller, kopyalamaz.
 * PIN yalnızca **hiç yoksa** yazılır; Ayarlar ekranından değiştirildikten
 * sonra tohumlama onu geri almaz.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import { PEOPLE, PERSON_KEYS, TOGETHER_SINCE } from "../src/config/site";

const db = new PrismaClient();

function dateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function main() {
  for (const key of PERSON_KEYS) {
    const person = PEOPLE[key];
    await db.user.upsert({
      where: { id: person.key },
      create: {
        id: person.key,
        name: person.name,
        birthday: dateOnly(person.birthday),
        accent: person.accent,
      },
      // İsim Ayarlar'dan değiştirilmiş olabilir — tohumlama üzerine yazmasın.
      update: {},
    });
  }
  console.log(`✓ ${PERSON_KEYS.length} kullanıcı hazır`);

  const pin = process.env.APP_PIN ?? "1101";
  if (!/^\d{4}$/.test(pin)) throw new Error("APP_PIN 4 rakam olmalı");

  const existing = await db.setting.findUnique({ where: { key: "pin" } });
  if (existing) {
    console.log("· PIN zaten kurulu, dokunulmadı");
  } else {
    await db.setting.create({
      data: { key: "pin", value: { hash: await bcrypt.hash(pin, 11) } },
    });
    console.log(`✓ PIN kuruldu (${pin})`);
  }

  await db.setting.upsert({
    where: { key: "togetherSince" },
    create: { key: "togetherSince", value: { date: TOGETHER_SINCE } },
    update: {},
  });

  // Doğum günleri sayaç ekranında da görünsün — yıldönümü olarak işaretli.
  for (const key of PERSON_KEYS) {
    const person = PEOPLE[key];
    const title = `${person.name} doğum günü`;
    const found = await db.countdown.findFirst({ where: { title } });
    if (found) continue;
    await db.countdown.create({
      data: {
        title,
        date: dateOnly(person.birthday),
        emoji: "🎂",
        repeatYearly: true,
        createdById: person.key,
      },
    });
  }

  const anniversary = "Yıldönümümüz";
  if (!(await db.countdown.findFirst({ where: { title: anniversary } }))) {
    await db.countdown.create({
      data: {
        title: anniversary,
        date: dateOnly(TOGETHER_SINCE),
        emoji: "💜",
        repeatYearly: true,
        createdById: "bilal",
      },
    });
  }
  console.log("✓ başlangıç sayaçları hazır");
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
