"""
Repaint a vertical band of a panorama from scratch (masked inpaint), so the model joins the two sides
with new paint: for seams where the hills or mountains don't line up.

  venv\\Scripts\\python art\\repaint_band.py <in.png> <out.png> <x0> <x1> <y_end> [--seed 700]

Only the band (x0..x1, rows 0..y_end, soft edges) is repainted; the model sees ~300 px on each side as context.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import comfy  # noqa: E402
import prompts  # noqa: E402

CONTEXT = 320
FEATHER = 48


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("x0", type=int)
    ap.add_argument("x1", type=int)
    ap.add_argument("y_end", type=int)
    ap.add_argument("--seed", type=int, default=700)
    a = ap.parse_args()
    img = np.array(Image.open(a.src).convert("RGB")).astype(np.float32)
    H, W = img.shape[:2]
    w0 = max(0, a.x0 - CONTEXT)
    w1 = min(W, a.x1 + CONTEXT)
    w1 = w0 + ((w1 - w0) // 16) * 16  # the model wants sizes in steps of 16
    crop = img[:, w0:w1]
    xs = np.arange(w0, w1)
    ys = np.arange(H)
    # alpha 0 = repaint, with soft edges on every side of the band
    mx = np.clip(np.minimum(xs - a.x0, a.x1 - xs) / FEATHER, 0, 1)
    my = np.clip((a.y_end - ys) / FEATHER, 0, 1)
    repaint = my[:, None] * mx[None, :]
    rgba = np.dstack([crop, (1 - repaint) * 255]).clip(0, 255).astype(np.uint8)
    tmp = os.path.join(os.path.dirname(os.path.abspath(a.out)), "_band-in.png")
    Image.fromarray(rgba, "RGBA").save(tmp)
    prompt = (
        "a wide quiet valley at night, layered misty hills and a distant mountain range, a clear sky full of faint stars, "
        "soft teal moonlight, continuous seamless landscape, " + prompts.STYLE
    )
    res = tmp.replace("-in.png", "-out.png")
    secs = comfy.run(comfy.inpaint(prompt, tmp, seed=a.seed), res)
    new = np.array(Image.open(res).convert("RGB")).astype(np.float32)
    k = repaint[..., None]
    img[:, w0:w1] = crop * (1 - k) + new * k
    Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(a.out)
    print(f"band {a.x0}-{a.x1} repainted ({secs:.0f}s)")


if __name__ == "__main__":
    main()
