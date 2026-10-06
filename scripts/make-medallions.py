# Porträt-Pipeline: generierte Porträts → kreisförmige Medaillons mit transparentem Rand.
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
import os, sys

SRC = "src/assets/gen"
SIZE = 512

for name in ["freud", "jung", "adler", "wundt", "reich", "bowlby", "levine",
             "shapiro", "porges", "herman", "linehan", "vanderkolk"]:
    src = os.path.join(SRC, f"pf-{name}.png")
    dst = os.path.join(SRC, f"med-pf-{name}.png")
    if not os.path.exists(src):
        print("missing", src)
        continue
    img = Image.open(src).convert("RGB")
    w, h = img.size
    side = min(w, h)
    img = img.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    # leichte Wärme/Entsättigung für Konsistenz
    img = ImageEnhance.Color(img).enhance(0.88)
    img = ImageEnhance.Contrast(img).enhance(1.05)

    # Kreismaske mit weichem Rand
    mask = Image.new("L", (SIZE, SIZE), 0)
    d = ImageDraw.Draw(mask)
    pad = 6
    d.ellipse((pad, pad, SIZE - pad, SIZE - pad), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(3))

    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)

    # Bernsteinkranz
    ring = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rw = 10
    rd.ellipse((pad - rw // 2, pad - rw // 2, SIZE - pad + rw // 2, SIZE - pad + rw // 2),
               outline=(226, 163, 92, 235), width=rw)
    ring = ring.filter(ImageFilter.GaussianBlur(1.2))
    out = Image.alpha_composite(out, ring)

    # äußerer Schimmer
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((pad - rw, pad - rw, SIZE - pad + rw, SIZE - pad + rw),
               outline=(226, 163, 92, 90), width=rw * 2)
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    out = Image.alpha_composite(out, glow)

    out.save(dst, "PNG", optimize=True)
    print("medallion", dst)
