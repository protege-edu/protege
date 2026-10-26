"""
Grow the valley painting into a long journey panorama, one half-screen at a time (outpainting).

  venv\\Scripts\\python art\\panorama.py <start.png> <out_dir> [--seed 501]

Each step keeps the right half of what's painted so far and paints a new half-screen after it,
with a soft overlap so the seam disappears. Every new stretch gets its own landmark, where a
checkpoint shrine will stand. Writes panorama.png (+ each step), and landmarks.json: the centre
of each landmark across the panorama (0..1), so the game knows where the checkpoints are.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import comfy  # noqa: E402
import prompts  # noqa: E402

STEP = 672  # half of the 1344-wide painting
OVERLAP = 120  # soft edge between old and new paint

# What each new stretch of the valley holds (a landmark the path passes)
STRETCHES = [
    "a narrow stream crossing the meadow with a small crooked old wooden footbridge over it, reeds along the water",
    "the edge of a dark pine forest with one enormous ancient hollow tree with twisted roots beside the path",
    "a small grassy rise with a ring of old mossy standing stones, tall wild grass around them",
    "a rocky hilltop overlook at the end of the path with a lone windswept tree, the far valley stretching away below",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("start")
    ap.add_argument("out")
    ap.add_argument("--seed", type=int, default=501)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    pano = np.array(Image.open(a.start).convert("RGB"))
    H = pano.shape[0]
    W0 = pano.shape[1]
    centres = [W0 * 0.5]
    for i, what in enumerate(STRETCHES):
        # canvas: the last half-screen we have + a transparent half-screen to paint
        canvas = np.zeros((H, STEP * 2, 4), np.uint8)
        canvas[:, :STEP, :3] = pano[:, -STEP:]
        canvas[:, STEP:, :3] = pano[:, -STEP:][:, ::-1]  # a mirrored hint of colour under the new part
        alpha = np.ones(STEP * 2, np.float32)
        ramp = np.clip((np.arange(STEP * 2) - (STEP - OVERLAP)) / OVERLAP, 0, 1)
        alpha = (1 - ramp) * 255
        canvas[..., 3] = alpha.astype(np.uint8)[None, :]
        src = os.path.join(a.out, f"step-{i}-in.png")
        Image.fromarray(canvas, "RGBA").save(src)
        prompt = (
            "a wide quiet valley at night, layered rolling hills fading into mist, a jagged mountain range on the horizon, "
            "a clear sky full of faint stars, a soft grassy meadow foreground with a faint winding footpath, "
            + what
            + ", very dark night lit only by faint starlight and a little warm glow, "
            + prompts.STYLE
        )
        out = os.path.join(a.out, f"step-{i}.png")
        secs = comfy.run(comfy.inpaint(prompt, src, seed=a.seed + i), out)
        print(f"{out} ({secs:.0f}s)", flush=True)
        new = np.array(Image.open(out).convert("RGB"))
        # blend the overlap so the seam disappears, then append the new half
        t = ramp[:STEP * 2][None, :, None]
        blended = (canvas[..., :3].astype(np.float32) * (1 - t) + new.astype(np.float32) * t).astype(np.uint8)
        pano = np.concatenate([pano[:, :-STEP], blended], axis=1)
        centres.append(pano.shape[1] - STEP * 0.5)
        Image.fromarray(pano).save(os.path.join(a.out, "panorama.png"))

    W = pano.shape[1]
    with open(os.path.join(a.out, "landmarks.json"), "w") as f:
        json.dump({"width": W, "height": H, "landmarks": [round(c / W, 4) for c in centres]}, f, indent=2)
    print(f"panorama {W}x{H}")


if __name__ == "__main__":
    main()
