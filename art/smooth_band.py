"""
Smooth a hard brightness/colour jump across a vertical band, keeping all the fine detail (stars, brushwork).

  venv\\Scripts\\python art\\smooth_band.py <in.png> <out.png> <x0> <x1> <y_end>

Between x0 and x1 (rows 0..y_end, feathered below), the broad light and colour (a heavy blur) is replaced
by a smooth blend from the left edge to the right edge; the fine detail on top is kept as it was.
"""
import sys

import cv2
import numpy as np
from PIL import Image


def main():
    src, out = sys.argv[1], sys.argv[2]
    x0, x1, y_end = (int(v) for v in sys.argv[3:6])
    img = np.array(Image.open(src).convert("RGB")).astype(np.float32)
    low = cv2.GaussianBlur(img, (0, 0), 28)
    detail = img - low
    t = np.linspace(0, 1, x1 - x0)[None, :, None]
    t = t * t * (3 - 2 * t)
    target = low[:, x0 : x0 + 1] * (1 - t) + low[:, x1 - 1 : x1] * t
    fixed = target + detail[:, x0:x1]
    # full effect in the sky, fading out over 80 rows below y_end
    w = np.clip((y_end + 80 - np.arange(img.shape[0])) / 80, 0, 1)[:, None, None]
    img[:, x0:x1] = img[:, x0:x1] * (1 - w) + fixed * w
    Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(out)
    print("ok")


if __name__ == "__main__":
    main()
