"""
Split a painting into depth layers for parallax (sky -> far hills -> near hills -> foreground).

  venv\\Scripts\\python art\\layers.py <dark.png> <lit.png> <out_dir> <name> [bands]

1. Depth Anything V2 (free, Apache 2.0) estimates how far away every pixel is.
2. The picture is cut into depth bands with soft, feathered edges.
3. What's hidden behind each nearer band gets painted in (OpenCV inpainting), so when the
   camera drifts and layers slide past each other, no holes appear.
4. The SAME cuts are applied to the dark and the lit painting, so the pair always lines up.

Writes <name>-<k>-dark.webp and <name>-<k>-lit.webp, back (0) to front, and prints the depth of each layer.
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image
from transformers import pipeline


def depth_map(img: Image.Image) -> np.ndarray:
    est = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
    d = np.array(est(img)["depth"].resize(img.size, Image.BICUBIC), dtype=np.float32)
    d = (d - d.min()) / max(1e-6, d.max() - d.min())  # 0 = far, 1 = near
    return cv2.GaussianBlur(d, (0, 0), 3)


def fill_behind(rgb: np.ndarray, hole: np.ndarray) -> np.ndarray:
    """Paint plausible pixels where `hole` is set, working small then scaling up (fast, smooth)."""
    if not hole.any():
        return rgb
    h, w = hole.shape
    s = 4
    small = cv2.resize(rgb, (w // s, h // s), interpolation=cv2.INTER_AREA)
    small_hole = cv2.resize(hole.astype(np.uint8) * 255, (w // s, h // s), interpolation=cv2.INTER_NEAREST)
    small_hole = cv2.dilate(small_hole, np.ones((5, 5), np.uint8))
    filled = cv2.inpaint(small, small_hole, 9, cv2.INPAINT_TELEA)
    big = cv2.resize(filled, (w, h), interpolation=cv2.INTER_CUBIC)
    m = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 6)[..., None]
    return (rgb * (1 - m) + big * m).astype(np.uint8)


def main():
    dark_path, lit_path, out_dir, name = sys.argv[1:5]
    bands = int(sys.argv[5]) if len(sys.argv) > 5 else 4
    dark = Image.open(dark_path).convert("RGB")
    lit = Image.open(lit_path).convert("RGB").resize(dark.size, Image.LANCZOS)
    d = depth_map(lit)

    # The sky and far mountains are one band (they're all "very far"). Everything nearer is split
    # into equal shares, so each layer gets a fair amount of the land.
    far = 0.03
    land = d[d > far]
    cuts = [far, *(float(np.percentile(land, p)) for p in np.linspace(0, 100, bands)[1:-1])]
    edges = [-1.0, *cuts, 2.0]
    os.makedirs(out_dir, exist_ok=True)
    feather = 2.5

    for k in range(bands):
        # this layer = everything at or nearer than its far edge; nearer bands also get drawn on top later
        near_enough = (d >= edges[k]).astype(np.float32)
        alpha = cv2.GaussianBlur(near_enough, (0, 0), feather) if k > 0 else np.ones_like(d)
        # hide what nearer layers will cover, and paint plausible pixels there instead
        covered = d >= edges[k + 1] + 0.02 if k < bands - 1 else np.zeros_like(d, dtype=bool)
        for img, tag in ((dark, "dark"), (lit, "lit")):
            rgb = fill_behind(np.array(img), covered)
            rgba = np.dstack([rgb, (alpha * 255).astype(np.uint8)])
            Image.fromarray(rgba, "RGBA").save(os.path.join(out_dir, f"{name}-{k}-{tag}.webp"), quality=88, method=6)
        depth = k / max(1, bands - 1)
        print(f"layer {k}: depth {depth:.2f}, covers {near_enough.mean() * 100:.0f}% of the picture")


if __name__ == "__main__":
    main()
