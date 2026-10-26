"""
Give Gloam ground to stand on: repaint the bottom band of part of a journey panorama (inpainting),
keeping everything above it (sky, bridges, lighthouses). For stretches where the painting has a gorge
or the sea where the path should be.

  venv\\Scripts\\python art\\ground_fix.py <in.png> <out.png> <x0> <x1> <y0> "<what the ground is>" [--seed 901]

Repaints x0..x1 below y0 (soft edges), one 1344-wide window at a time (the image model's size).
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import comfy  # noqa: E402

WIN = 1344
FEATHER = 48


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("x0", type=int)
    ap.add_argument("x1", type=int)
    ap.add_argument("y0", type=int)
    ap.add_argument("prompt")
    ap.add_argument("--seed", type=int, default=901)
    a = ap.parse_args()
    pano = np.array(Image.open(a.src).convert("RGB")).astype(np.float32)
    H, W = pano.shape[:2]
    tmp = os.path.join(os.path.dirname(os.path.abspath(a.out)), "_ground")
    os.makedirs(tmp, exist_ok=True)
    # where to repaint, with soft edges (1 = repaint)
    xs, ys = np.arange(W)[None, :], np.arange(H)[:, None]
    fx = np.clip(np.minimum(xs - a.x0, a.x1 - xs) / FEATHER, 0, 1)
    fy = np.clip((ys - a.y0) / FEATHER, 0, 1)
    want = (fx * fy).astype(np.float32)
    start = a.x0 - FEATHER
    i = 0
    while start < a.x1 + FEATHER:
        w0 = max(0, min(start, W - WIN))
        crop = pano[:, w0 : w0 + WIN].astype(np.uint8)
        m = want[:, w0 : w0 + WIN]
        rgba = np.dstack([crop, ((1 - (m > 0.02)) * 255).astype(np.uint8)])
        src = os.path.join(tmp, f"ground-{i}-in.png")
        Image.fromarray(rgba, "RGBA").save(src)
        dst = os.path.join(tmp, f"ground-{i}.png")
        secs = comfy.run(comfy.inpaint(a.prompt, src, seed=a.seed + i), dst)
        new = np.array(Image.open(dst).convert("RGB").resize((WIN, H), Image.LANCZOS)).astype(np.float32)
        pano[:, w0 : w0 + WIN] = pano[:, w0 : w0 + WIN] * (1 - m[..., None]) + new * m[..., None]
        want[:, w0 : w0 + WIN] = 0  # done here
        print(f"ground repainted {w0}..{w0 + WIN} ({secs:.0f}s)", flush=True)
        start = w0 + WIN
        i += 1
    Image.fromarray(pano.clip(0, 255).astype(np.uint8)).save(a.out)


if __name__ == "__main__":
    main()
