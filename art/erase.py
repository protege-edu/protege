"""
Paint something out of a painting (OpenCV inpainting): e.g. the lantern the image model added
to the valley, because Gloam's lantern must be the only one.

  venv\\Scripts\\python art\\erase.py <in.png> <out.png> <x,y,rx,ry[,cutoffY]> [...more ellipses]

Each ellipse is erased; if cutoffY is given, only the part ABOVE that line is erased (keeps grass below).
"""
import sys

import cv2
import numpy as np


def main():
    src, out, *shapes = sys.argv[1:]
    img = cv2.imread(src)
    mask = np.zeros(img.shape[:2], np.uint8)
    for shape in shapes:
        v = [int(n) for n in shape.split(",")]
        x, y, rx, ry = v[:4]
        m = np.zeros_like(mask)
        cv2.ellipse(m, (x, y), (rx, ry), 0, 0, 360, 255, -1)
        if len(v) > 4:
            m[v[4]:, :] = 0
        mask |= m
    # Fill each row sideways, from the untouched pixels left and right of the patch.
    # (A normal inpaint pulls colour from below too, which here is brightly lit grass and leaves a glowing blob.)
    filled = img.astype(np.float32).copy()
    for y in np.where(mask.any(axis=1))[0]:
        xs = np.where(mask[y] > 0)[0]
        x0, x1 = max(0, xs.min() - 6), min(img.shape[1] - 1, xs.max() + 6)
        left = img[y, max(0, x0 - 8) : x0 + 1].astype(np.float32).mean(axis=0)
        right = img[y, x1 : min(img.shape[1], x1 + 9)].astype(np.float32).mean(axis=0)
        t = ((xs - x0) / max(1, x1 - x0))[:, None]
        filled[y, xs] = left * (1 - t) + right * t
    # blur along the patch so rows blend into each other like soft mist
    blurred = cv2.GaussianBlur(filled, (0, 0), 5)
    m3 = (mask > 0)[..., None]
    filled = np.where(m3, blurred, img.astype(np.float32))
    # soften the seam and add back a touch of painterly grain so the patch doesn't look smooth
    soft = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 4)[..., None]
    grain = np.random.default_rng(1).normal(0, 3, img.shape).astype(np.float32)
    result = img.astype(np.float32) * (1 - soft) + (filled + grain) * soft
    cv2.imwrite(out, result.clip(0, 255).astype(np.uint8))
    print("wrote", out)


if __name__ == "__main__":
    main()
