"""
Heal the seams in a stitched panorama: lightly repaint a window around each seam (image-to-image,
same composition) so the paint flows across it, then feather the repaint back in.

  venv\\Scripts\\python art\\seams.py <panorama.png> <out.png> <x1,x2,...> [--denoise 0.45]
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import comfy  # noqa: E402
import prompts  # noqa: E402

WIN = 448  # half-width of the repainted window


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("seams")
    ap.add_argument("--denoise", type=float, default=0.45)
    ap.add_argument("--seed", type=int, default=611)
    a = ap.parse_args()
    pano = np.array(Image.open(a.src).convert("RGB")).astype(np.float32)
    H, W = pano.shape[:2]
    tmp = os.path.join(os.path.dirname(os.path.abspath(a.out)), "_seam")
    os.makedirs(tmp, exist_ok=True)
    prompt = (
        "a wide quiet valley at night, layered rolling hills fading into mist, a mountain range on the horizon, "
        "a clear sky full of faint stars, a soft grassy meadow with a faint winding footpath, very dark night, " + prompts.STYLE
    )
    for i, x in enumerate(int(v) for v in a.seams.split(",")):
        x0, x1 = max(0, x - WIN), min(W, x + WIN)
        crop = pano[:, x0:x1].astype(np.uint8)
        src = os.path.join(tmp, f"seam-{i}-in.png")
        Image.fromarray(crop).save(src)
        dst = os.path.join(tmp, f"seam-{i}.png")
        secs = comfy.run(comfy.img2img(prompt, src, seed=a.seed + i, denoise=a.denoise), dst)
        new = np.array(Image.open(dst).convert("RGB").resize((x1 - x0, H), Image.LANCZOS)).astype(np.float32)
        # strongest at the seam, fading to nothing at the window's edges
        d = np.abs(np.arange(x0, x1) - x) / WIN
        w = np.clip(1 - d, 0, 1)
        w = (w * w * (3 - 2 * w))[None, :, None]
        pano[:, x0:x1] = pano[:, x0:x1] * (1 - w) + new * w
        print(f"seam at {x} healed ({secs:.0f}s)", flush=True)
    Image.fromarray(pano.clip(0, 255).astype(np.uint8)).save(a.out)


if __name__ == "__main__":
    main()
