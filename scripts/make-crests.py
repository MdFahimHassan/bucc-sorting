"""
Turns the seven department crest renders (2000x2000 RGBA PNG) into small WebP files in
src/assets/crests/. Kept light on purpose: the ceremony runs on low-end phones.

    python scripts/make-crests.py <folder-with-the-seven-pngs>

Edit SOURCES below if the source file names change. Output is committed, so the site build
never needs Python.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'assets', 'crests')
SIZE = 400  # square output, px. Ring slots are 80 CSS px; the chosen crest scales to ~240 CSS px.
QUALITY = 70

# department id -> source file
SOURCES = {
    'events': '71c18850-image.png',
    'creative': 'fa7b3b1e-image.png',
    'comms': '85fb37ff-image.png',
    'finance': '22996bea-image.png',
    'hr': '2b4dc75d-image.png',
    'press': 'f02e39ca-image.png',
    'rnd': '18a68762-image.png',
}


def main(src_dir):
    os.makedirs(OUT, exist_ok=True)
    for dept, name in SOURCES.items():
        im = Image.open(os.path.join(src_dir, name)).convert('RGBA')
        # Crop the empty margin using only clearly visible pixels, then centre on a square.
        alpha = im.getchannel('A').point(lambda v: 255 if v > 10 else 0)
        box = alpha.getbbox() or (0, 0, *im.size)
        im = im.crop(box)
        side = max(im.size)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
        path = os.path.join(OUT, f'{dept}.webp')
        sq.save(path, 'WEBP', quality=QUALITY, method=6, alpha_quality=70)
        print(f'{dept}: {os.path.getsize(path) / 1024:.0f} KB')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])