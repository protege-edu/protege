"""
Hide a seam inside a soft bank of mist (an old matte-painting trick): around the seam, the painting
dissolves into a heavily blurred, slightly misty version of itself, strongest at the seam.

  venv\\Scripts\\python art\\mist_veil.py <in.png> <out.png> <x_seam> <y_end> [half_width] [mist_hex]
"""
import sys

import cv2
import numpy as np
from PIL import Image


def main():
    src, out = sys.argv[1], sys.argv[2]
    xs, y_end = int(sys.argv[3]), int(sys.argv[4])
    half = int(sys.argv[5]) if len(sys.argv) > 5 else 200
    mist = np.array([int((sys.argv[6] if len(sys.argv) > 6 else "7fa294")[i : i + 2], 16) for i in (0, 2, 4)], np.float32)
    img = np.array(Image.open(src).convert("RGB")).astype(np.float32)
    H, W = img.shape[:2]
    x0, x1 = max(0, xs - half * 2), min(W, xs + half * 2)
    region = img[:, x0:x1]
    # the mist: the painting blurred a lot (keeps its local colour), lifted a little toward the fog colour
    veil = cv2.GaussianBlur(region, (0, 0), 55) * 0.82 + mist * 0.18
    d = np.abs(np.arange(x0, x1) - xs) / half
    w = np.clip(1 - d, 0, 1)
    w = (w * w * (3 - 2 * w)) * 0.9
    rows = np.clip((y_end + 70 - np.arange(H)) / 70, 0, 1)
    k = rows[:, None, None] * w[None, :, None]
    img[:, x0:x1] = region * (1 - k) + veil * k
    # a few stars survive in front of the mist, so the sky doesn't look smudged
    Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(out)
    print("ok")


if __name__ == "__main__":
    main()
