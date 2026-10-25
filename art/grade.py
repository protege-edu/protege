"""
Relight one painting into a DARK and a LIT version, like a film colourist ("day for night").
Both come from the same pixels, so they line up perfectly when the lantern light blends between them.

  venv\\Scripts\\python art\\grade.py <painting.png> <out_dark.png> <out_lit.png>
"""
import sys

import cv2
import numpy as np


def dark_grade(bgr: np.ndarray) -> np.ndarray:
    """Moonless night: warm colours cooled to blue-green, everything lower and quieter."""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
    # warm hues (orange/yellow, OpenCV hue 5..40) lose their warmth and brightness
    warm = np.clip(1 - np.abs(h - 20) / 22, 0, 1) * np.clip((s - 0.15) / 0.4, 0, 1)
    h = h * (1 - warm) + 88 * warm  # toward teal
    s = s * (1 - 0.65 * warm) * 0.85
    v = v * (1 - 0.55 * warm)
    v = np.power(v, 1.18) * 0.62
    out = cv2.cvtColor(np.dstack([h, s * 255, v * 255]).clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
    # a cool tint in the shadows
    tint = np.array([1.06, 1.02, 0.9], np.float32)  # B, G, R
    return (out * tint).clip(0, 255).astype(np.uint8)


def lit_grade(bgr: np.ndarray) -> np.ndarray:
    """Lantern-lit: warm amber light on whatever was already catching light, deep shadows kept."""
    img = bgr.astype(np.float32) / 255
    lum = img @ np.array([0.114, 0.587, 0.299], np.float32)
    amber = np.array([0.30, 0.70, 1.0], np.float32)  # B, G, R
    light = np.power(np.clip(lum, 0, 1), 0.75)[..., None]
    # A lantern lights the land, not the sky: warmth fades out above the horizon
    rows = np.linspace(0, 1, img.shape[0], dtype=np.float32)
    land = np.clip((rows - 0.36) / 0.22, 0, 1)
    land = (land * land * (3 - 2 * land) * 0.85 + 0.15)[:, None, None]
    out = img * (0.92 + 0.25 * light * land) + amber * light * 0.42 * land
    # lift the warm grass and edges a little more, like rim light
    out = out + amber * np.power(light, 2.2) * 0.25 * land
    return (out.clip(0, 1) * 255).astype(np.uint8)


if __name__ == "__main__":
    src, out_dark, out_lit = sys.argv[1:4]
    img = cv2.imread(src)
    cv2.imwrite(out_dark, dark_grade(img))
    cv2.imwrite(out_lit, lit_grade(img))
    print("wrote", out_dark, out_lit)
