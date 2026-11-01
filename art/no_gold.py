r"""
Turn gold details silver in a cut-out painting (lantern gold only ever means understanding in Protégé,
so a rival's monocle or brooch can't be gold).

  venv\Scripts\python art\no_gold.py <in.webp> [out.webp]
"""
import sys

import numpy as np
from PIL import Image


def main():
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else src
    im = Image.open(src).convert("RGBA")
    rgba = np.array(im).astype(np.float32)
    hsv = np.array(im.convert("RGB").convert("HSV")).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    # warm yellows and oranges that are saturated and bright: gold
    gold = (h > 28) & (h < 62) & (s > 0.35) & (v > 0.35) & (rgba[..., 3] > 8)
    grey = rgba[..., :3].mean(axis=2, keepdims=True)
    silver = np.clip(grey * 1.05 + 8, 0, 255)
    rgba[..., :3] = np.where(gold[..., None], silver, rgba[..., :3])
    Image.fromarray(rgba.astype(np.uint8), "RGBA").save(out, quality=90)
    print(f"{int(gold.sum())} gold pixels turned silver")


if __name__ == "__main__":
    main()
