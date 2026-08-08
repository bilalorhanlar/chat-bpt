/**
 * Kırpılmış fotoğrafları web için üretir.
 *
 * Üç varyant:
 *   trail/  480x600 (4:5)  → ana sayfa iz efekti, hepsi aynı orana getirilir
 *   full/   uzun kenar 1200, doğal oran → galeri ve büyütme
 *   ayrıca her fotoğraf için 16px'lik blur placeholder (base64)
 *
 * Neden önceden üretiyoruz: Railway'de next/image'ın çalışma anındaki
 * dönüştürmesi CPU yakar ve ilk istekte gecikme yapar. 65 fotoğraf sabit,
 * derleme zamanında bir kere üretmek her açılışta bedava.
 */
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const SRC = "photo-trimmed";
const OUT = path.join("public", "anilar");
const MANIFEST = path.join("src", "data", "photos.ts");

const TRAIL = { w: 480, h: 600 }; // 4:5
const FULL_LONG_EDGE = 1200;
const BLUR_W = 16;

type Entry = {
  id: number;
  w: number;
  h: number;
  blur: string;
};

/**
 * 4:5'e kırparken hangi dikey noktadan kesileceğini seçer.
 * Portre fotoğraflarda yüzler üst yarıda olduğu için tepeye yakın kesiyoruz;
 * merkezden kesmek çeneleri kırpıyor.
 */
function verticalGravity(w: number, h: number): "north" | "centre" {
  const targetRatio = TRAIL.w / TRAIL.h; // 0.8
  const ratio = w / h;
  if (ratio < targetRatio - 0.02) return "north";
  return "centre";
}

async function main() {
  const files = (await fs.readdir(SRC)).filter((f) => f.endsWith(".jpg")).sort();
  if (files.length === 0) throw new Error(`${SRC} içinde .jpg yok — önce 01-trim.py`);

  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(path.join(OUT, "trail"), { recursive: true });
  await fs.mkdir(path.join(OUT, "full"), { recursive: true });

  const entries: Entry[] = [];

  for (const [i, file] of files.entries()) {
    const id = i + 1;
    const nn = String(id).padStart(2, "0");
    const src = path.join(SRC, file);
    const meta = await sharp(src).metadata();
    const w = meta.width!;
    const h = meta.height!;

    // trail: sabit 4:5
    const trail = sharp(src).resize(TRAIL.w, TRAIL.h, {
      fit: "cover",
      position: verticalGravity(w, h),
    });
    await trail.clone().webp({ quality: 82, effort: 5 }).toFile(path.join(OUT, "trail", `${nn}.webp`));
    await trail.clone().avif({ quality: 62, effort: 5 }).toFile(path.join(OUT, "trail", `${nn}.avif`));

    // full: doğal oran, uzun kenar sınırlı
    const full = sharp(src).resize({
      width: w >= h ? FULL_LONG_EDGE : undefined,
      height: h > w ? FULL_LONG_EDGE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
    await full.clone().webp({ quality: 84, effort: 5 }).toFile(path.join(OUT, "full", `${nn}.webp`));
    await full.clone().avif({ quality: 64, effort: 5 }).toFile(path.join(OUT, "full", `${nn}.avif`));

    const fullMeta = await sharp(path.join(OUT, "full", `${nn}.webp`)).metadata();

    const blurBuf = await sharp(src)
      .resize(BLUR_W, Math.max(1, Math.round((BLUR_W * TRAIL.h) / TRAIL.w)), { fit: "cover" })
      .webp({ quality: 40 })
      .toBuffer();

    entries.push({
      id,
      w: fullMeta.width!,
      h: fullMeta.height!,
      blur: `data:image/webp;base64,${blurBuf.toString("base64")}`,
    });

    process.stdout.write(`\r${id}/${files.length} işlendi`);
  }

  const body = `// OTOMATİK ÜRETİLDİ — scripts/photos/02-optimize.ts
// Elle düzenlemeyin; \`npm run photos\` yeniden üretir.

export type Photo = {
  /** 1'den başlayan sıra numarası; dosya adı iki hane (\`01.webp\`) */
  id: number;
  /** full/ varyantının gerçek boyutu */
  w: number;
  h: number;
  /** 16px genişliğinde base64 webp — yüklenirken gösterilen bulanık kare */
  blur: string;
};

/** Ana sayfa iz efekti için sabit 4:5 varyantın boyutu */
export const TRAIL_SIZE = { w: ${TRAIL.w}, h: ${TRAIL.h} } as const;

export const PHOTOS: Photo[] = ${JSON.stringify(entries, null, 2)};

export const photoSrc = {
  trail: (id: number, ext: "avif" | "webp" = "webp") =>
    \`/anilar/trail/\${String(id).padStart(2, "0")}.\${ext}\`,
  full: (id: number, ext: "avif" | "webp" = "webp") =>
    \`/anilar/full/\${String(id).padStart(2, "0")}.\${ext}\`,
};
`;

  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, body, "utf8");

  console.log(`\n${entries.length} fotoğraf → ${OUT}/{trail,full}`);
  console.log(`manifest → ${MANIFEST}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
