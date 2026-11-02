#!/usr/bin/env python3
"""
Convert the intro-title font (Harry P) from TTF to a small Basic Latin woff2.

    pip install fonttools brotli
    python scripts/make-title-font.py path/to/HarryP-MVZ6w.ttf

Writes src/assets/fonts/harry-p-latin-400-normal.woff2 (U+0020-007E only).

Font: "Harry P" by Phoenix Phonts & GeM, Freeware. Credit is in README.md.
"""
import sys
from pathlib import Path

try:
    import brotli  # noqa: F401  (needed by fontTools to write woff2)
except ImportError:
    raise SystemExit("brotli is missing: pip install fonttools brotli")

from fontTools import subset
from fontTools.ttLib import TTFont

OUT = Path(__file__).resolve().parent.parent / "src/assets/fonts/harry-p-latin-400-normal.woff2"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    src = Path(sys.argv[1])
    if not src.is_file():
        print(f"not found: {src}")
        return 1

    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga", "calt"]
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # keep copyright + licence strings
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True

    font = TTFont(str(src))
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=range(0x20, 0x7F))
    sub.subset(font)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(str(OUT))
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())