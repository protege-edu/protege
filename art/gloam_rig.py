"""
Turn the chosen Gloam painting into animatable parts ("cutout" rig, like 2D games).

  venv\\Scripts\\python art\\gloam_rig.py <painting.png> <out_dir>

Writes:
  gloam-body.webp        the furry body, with the painted eyes and mouth removed (code draws an animated face)
  gloam-stalk-lit.webp   the vine stalk + lantern, glowing
  gloam-stalk-dark.webp  the same, unlit (lantern gold only ever means understanding)
  gloam-rig.json         where the eyes, mouth, stalk base, lantern and feet are, in the output images

Measurements below are for the chosen painting: FLUX.1-schnell, art/prompts.py GLOAM_V2, seed 302, 1024x1024.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

# Where things are in the 1024x1024 painting (measured by eye from the image)
EYES = [(408, 553), (618, 553)]
EYE_R = (62, 40)
MOUTH = (515, 582)
MOUTH_R = (46, 16)
STALK_BASE = (515, 425)
LANTERN = (365, 280)
FEET_Y = 948
BODY_TOP = 398
CROP = (170, 40, 870, 975)  # x0, y0, x1, y1
SCALE = 0.72


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    img = Image.open(src).convert("RGB")
    cut = remove(img, session=new_session("isnet-general-use"), post_process_mask=True)
    rgba = np.array(cut)
    rgb = rgba[..., :3].copy()
    alpha = rgba[..., 3].astype(np.float32) / 255

    # --- separate the stalk + lantern from the body, by colour and position ---
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s = hsv[..., 0].astype(np.int32), hsv[..., 1].astype(np.int32)
    ys, xs = np.mgrid[0 : rgb.shape[0], 0 : rgb.shape[1]]
    greenish = (h > 25) & (h < 90) & (s > 60)  # the vine
    warm = (h < 25) & (s > 90) & (ys < BODY_TOP)  # the lantern
    stalk = (ys < BODY_TOP - 6) | ((greenish | warm) & (ys < BODY_TOP + 45) & (np.abs(xs - STALK_BASE[0]) < 40))
    stalk = cv2.morphologyEx(stalk.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(bool)
    stalk_a = alpha * stalk
    body_a = alpha * (~stalk)

    # --- remove the painted eyes and mouth so the code-drawn face sits on clean fur ---
    hole = np.zeros(rgb.shape[:2], np.uint8)
    for cx, cy in EYES:
        cv2.ellipse(hole, (cx, cy), EYE_R, 0, 0, 360, 255, -1)
    cv2.ellipse(hole, MOUTH, MOUTH_R, 0, 0, 360, 255, -1)
    body_rgb = cv2.inpaint(rgb, hole, 21, cv2.INPAINT_TELEA)
    # put a little fur grain back so the patch isn't smooth
    noise = (np.random.default_rng(3).normal(0, 7, rgb.shape)).astype(np.float32)
    m = cv2.GaussianBlur(hole.astype(np.float32) / 255, (0, 0), 3)[..., None]
    body_rgb = np.clip(body_rgb.astype(np.float32) + noise * m, 0, 255).astype(np.uint8)

    # --- the unlit lantern: warm glow drained to dull, dark paper ---
    lit = rgb.copy()
    dark = rgb.astype(np.float32)
    warm_all = ((h < 32) & (s > 60)).astype(np.float32)
    warm_all = cv2.GaussianBlur(warm_all, (0, 0), 2)[..., None]
    gray = dark @ np.array([0.3, 0.59, 0.11], np.float32)
    unlit = np.dstack([gray * 0.42 + 20, gray * 0.34 + 14, gray * 0.28 + 10])
    dark = dark * (1 - warm_all) + unlit * warm_all
    dark = dark.clip(0, 255).astype(np.uint8)

    x0, y0, x1, y1 = CROP

    def save(name, color, a):
        out_img = np.dstack([color, (a * 255).astype(np.uint8)])[y0:y1, x0:x1]
        pil = Image.fromarray(out_img, "RGBA")
        pil = pil.resize((round(pil.width * SCALE), round(pil.height * SCALE)), Image.LANCZOS)
        pil.save(os.path.join(out, name), quality=90, method=6)
        return pil.size

    size = save("gloam-body.webp", body_rgb, body_a)
    save("gloam-stalk-lit.webp", lit, stalk_a)
    save("gloam-stalk-dark.webp", dark, stalk_a)

    def p(pt):
        return [round((pt[0] - x0) * SCALE, 1), round((pt[1] - y0) * SCALE, 1)]

    rig = {
        "width": size[0],
        "height": size[1],
        "eyes": [p(e) for e in EYES],
        "eyeRadius": [round(EYE_R[0] * SCALE, 1), round(EYE_R[1] * SCALE, 1)],
        "mouth": p(MOUTH),
        "mouthWidth": round(MOUTH_R[0] * SCALE, 1),
        "stalkBase": p(STALK_BASE),
        "lantern": p(LANTERN),
        "feetY": round((FEET_Y - y0) * SCALE, 1),
        "bodyTop": round((BODY_TOP - y0) * SCALE, 1),
    }
    with open(os.path.join(out, "gloam-rig.json"), "w") as f:
        json.dump(rig, f, indent=2)
    print(json.dumps(rig))


if __name__ == "__main__":
    main()
