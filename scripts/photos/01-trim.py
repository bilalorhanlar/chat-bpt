#!/usr/bin/env python3
"""Telefon ekran görüntülerindeki siyah bantları kırpar.

Satır/kolon bazında en parlak pikseli ölçer; eşiğin altında kalan kenarları atar.
`magick -trim` yerine bunu kullanıyoruz çünkü -trim köşe rengine bakıp fuzz ile
karar veriyor ve koyu fotoğraf içeriğini de yiyebiliyor.

Çıktı: photo-trimmed/NN.jpg  (sıralı numaralı, orijinal isimler tarih sıralı)
"""
import json
import pathlib
import sys

from PIL import Image

SRC = pathlib.Path("photo")
OUT = pathlib.Path("photo-trimmed")
THRESHOLD = 20  # 0-255; bunun altındaki satır/kolon "siyah bant" sayılır

# --- elle belirlenen düzeltmeler ------------------------------------------
# Ekran görüntülerinde EXIF yönü yok, yani yan yatmış fotoğraflar yazılımsal
# olarak tespit edilemiyor. Aşağıdaki değerler 66 fotoğrafa tek tek bakılarak
# belirlendi. Anahtar = kaynak dosyaların tarih sırasındaki 1 tabanlı sırası.
#
# Değerler PIL kuralına göre **saat yönünün tersine** derece.
ROTATIONS: dict[int, int] = {28: 90, 34: 90, 63: 90, 64: 90, 65: -90, 66: 90}

# Telefonun Fotoğraflar arayüzü (tarih çubuğu, alt küçük resim şeridi) siyah
# bandın içinde metin taşıdığı için parlaklık eşiğine takılmıyor; bu kareler
# elle ölçüldü. Değer: (x, y, genişlik, yükseklik).
UI_CROPS: dict[int, tuple[int, int, int, int]] = {18: (0, 309, 828, 1104)}

# 09, 08'in aynısı — sadece telefon arayüzüyle çekilmiş hâli. Temizi duruyor.
SKIP: set[int] = {9}


def content_box(img: Image.Image) -> tuple[int, int, int, int]:
    g = img.convert("L")
    w, h = g.size
    px = g.load()

    def row_bright(y: int) -> int:
        return max(px[x, y] for x in range(0, w, 4))

    def col_bright(x: int) -> int:
        return max(px[x, y] for y in range(0, h, 4))

    top = 0
    while top < h - 1 and row_bright(top) < THRESHOLD:
        top += 1
    bottom = h - 1
    while bottom > top and row_bright(bottom) < THRESHOLD:
        bottom -= 1
    left = 0
    while left < w - 1 and col_bright(left) < THRESHOLD:
        left += 1
    right = w - 1
    while right > left and col_bright(right) < THRESHOLD:
        right -= 1
    return left, top, right + 1, bottom + 1


def main() -> int:
    if not SRC.is_dir():
        print(f"hata: {SRC} bulunamadı", file=sys.stderr)
        return 1
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.jpg"):
        old.unlink()

    files = sorted(SRC.glob("*.jpeg"))
    manifest = []
    for i, f in enumerate(files, start=1):
        if i in SKIP:
            print(f"{i:02d}  atlandı (kopya)")
            continue

        with Image.open(f) as img:
            box = content_box(img)
            out = img.crop(box)

            if i in UI_CROPS:
                x, y, w, h = UI_CROPS[i]
                out = out.crop((x, y, x + w, y + h))

            if i in ROTATIONS:
                out = out.rotate(ROTATIONS[i], expand=True)

            name = f"{i:02d}.jpg"
            out.save(OUT / name, "JPEG", quality=95, subsampling=0)

        manifest.append(
            {
                "id": i,
                "file": name,
                "source": f.name,
                "box": list(box),
                "rotation": ROTATIONS.get(i, 0),
                "size": list(out.size),
            }
        )
        print(f"{name}  -> {out.size[0]}x{out.size[1]}"
              + (f"  döndürüldü {ROTATIONS[i]}°" if i in ROTATIONS else ""))

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\n{len(manifest)} fotoğraf hazır -> {OUT}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
