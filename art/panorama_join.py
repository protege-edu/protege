"""
Re-stitch the journey panorama from the painted steps, without visible seams.

  venv\\Scripts\\python art\\panorama_join.py <start.png> <steps_dir> <out.png>

Each step (from art/panorama.py) is a 1344-wide painting whose left half repeats what was already
painted and whose right half is new. The image model drifts a little in brightness and colour each
time, which showed up as vertical bands in the sky. So for each step:
  1. colour-correct the whole step so its copy of the old half matches the real old half (in Lab colour)
  2. blend old into new across a wide band (300 px), then append the new half
"""
import glob
import os
import sys

import cv2
import numpy as np
from PIL import Image

HALF = 672
BLEND = 300


def lab(img):
    return cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)


def rgb(lab_img):
    return cv2.cvtColor(lab_img.clip(0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)


BANDS = 8  # sky, mountains, hills, grass... each matched separately so the sky doesn't steer the grass


def band_stats(img_lab):
    H = img_lab.shape[0]
    edges = np.linspace(0, H, BANDS + 1).astype(int)
    return edges, np.array([[(img_lab[e0:e1, :, c].mean(), img_lab[e0:e1, :, c].std() + 1e-3) for c in range(3)] for e0, e1 in zip(edges[:-1], edges[1:])])


def match_to(step, region, ref):
    """Correct `step` so that `region` (its new part) has the tone of `ref` (the original valley), band by band."""
    edges, want = ref
    _, have = band_stats(lab(region))
    out = lab(step)
    rows = np.arange(step.shape[0])
    centres = (edges[:-1] + edges[1:]) / 2
    for c in range(3):
        gain = np.clip(want[:, c, 1] / have[:, c, 1], 0.75, 1.3)
        off = want[:, c, 0] - have[:, c, 0] * gain
        g = np.interp(rows, centres, gain)[:, None]
        o = np.interp(rows, centres, off)[:, None]
        out[..., c] = out[..., c] * g + o
    return rgb(out)


def main():
    start, steps_dir, out = sys.argv[1:4]
    pano = np.array(Image.open(start).convert("RGB")).astype(np.float32)
    ref = band_stats(lab(pano))  # the original valley's tone, which every new stretch should keep
    steps = sorted(glob.glob(os.path.join(steps_dir, "step-[0-9].png")))
    for path in steps:
        step = np.array(Image.open(path).convert("RGB")).astype(np.float32)
        corrected = match_to(step, step[:, HALF:], ref)
        # the correction fades in across the seam: none on the repeated old half, full on the new half
        w = np.clip((np.arange(HALF * 2) - (HALF - 220)) / 370, 0, 1)[None, :, None]
        w = w * w * (3 - 2 * w)
        fixed = step * (1 - w) + corrected * w
        old = pano[:, -HALF:]
        t = np.clip((np.arange(HALF) - (HALF - BLEND)) / BLEND, 0, 1)[None, :, None]
        t = t * t * (3 - 2 * t)  # smoothstep
        joined = old * (1 - t) + fixed[:, :HALF] * t
        pano = np.concatenate([pano[:, :-HALF], joined, fixed[:, HALF:]], axis=1)
        print(f"{os.path.basename(path)} -> {pano.shape[1]} wide", flush=True)
    Image.fromarray(pano.clip(0, 255).astype(np.uint8)).save(out)


if __name__ == "__main__":
    main()
