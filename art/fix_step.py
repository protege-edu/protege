"""
Remove a hard vertical step (a seam) at one column: measure how much brighter/darker each row is just
right of the seam than just left of it, and cancel that difference, fading the correction out to the right.

  venv\\Scripts\\python art\\fix_step.py <in.png> <out.png> <x_seam> <y_end> [fade_px]
"""
import sys

import cv2
import numpy as np
from PIL import Image


def main():
    src, out = sys.argv[1], sys.argv[2]
    xe, y_end = int(sys.argv[3]), int(sys.argv[4])
    fade = int(sys.argv[5]) if len(sys.argv) > 5 else 260
    img = np.array(Image.open(src).convert("RGB")).astype(np.float32)
    left = img[:, xe - 14 : xe - 4].mean(axis=1)
    right = img[:, xe + 4 : xe + 14].mean(axis=1)
    step = cv2.GaussianBlur((right - left)[:, None, :], (0, 0), 6)[:, 0, :]  # per row, smoothed down the image
    # only above y_end (the sky and far hills), easing off below it
    rows = np.clip((y_end + 60 - np.arange(img.shape[0])) / 60, 0, 1)[:, None]
    step *= rows
    x = np.arange(img.shape[1] - xe)
    k = np.clip(1 - x / fade, 0, 1)
    k = k * k * (3 - 2 * k)
    img[:, xe:] -= step[:, None, :] * k[None, :, None]
    # soften the 8 columns around the seam itself
    img[:, xe - 6 : xe + 6] = cv2.GaussianBlur(img[:, xe - 12 : xe + 12], (0, 0), 3)[:, 6:18]
    Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(out)
    print("ok")


if __name__ == "__main__":
    main()
