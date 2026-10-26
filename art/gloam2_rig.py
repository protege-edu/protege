"""
Cut the chosen Gloam 2.0 painting into an animation rig (Phase 3).

  venv\\Scripts\\python art\\gloam2_rig.py <painting.png> <out_dir>

From one painting (FLUX.1-schnell, art/prompts.py CONCEPTS["c2_felt"], seed 8, 1024x1024) it makes:
  gloam2-body.webp         the body: no face, no arms, no legs, no stalk (code draws the face; arms/legs move)
  gloam2-arm-l/r.webp      each painted arm, to swing from its shoulder
  gloam2-leg-l/r.webp      each painted leg + foot, to step
  gloam2-lantern-lit.webp  the painted lantern, glowing
  gloam2-lantern-dark.webp the same lantern, unlit (gold only ever means understanding)
  gloam2-parts.json        where every part is, for lib/age-styles/senior.ts
A human artist can repaint any of these files 1:1.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

# ---- measured on the chosen painting (1024 x 1024) ----
HEAD = ((525, 452), (128, 100))  # ellipse: centre, radii
TORSO = ((528, 665), (206, 176))
ARMS = {  # polygons around each arm (shoulder first), and the shoulder pivot
    "l": ([(372, 515), (330, 560), (306, 640), (312, 700), (346, 700), (372, 640), (392, 560)], (372, 540)),
    "r": ([(676, 515), (712, 560), (748, 640), (752, 672), (722, 676), (686, 620), (664, 560)], (680, 540)),
}
LEGS = {
    "l": ([(404, 806), (472, 806), (474, 845), (466, 880), (404, 882), (408, 845)], (440, 812)),
    "r": ([(572, 806), (640, 806), (648, 845), (650, 872), (590, 874), (578, 840)], (605, 812)),
}
FACE = [  # ellipses to paint out: eyes, brows, mouth, cheeks
    ((468, 452), (40, 30)),
    ((597, 442), (40, 30)),
    ((468, 413), (36, 14)),
    ((592, 407), (36, 14)),
    ((538, 472), (30, 15)),
    ((515, 352), (20, 16)),  # where the painted stalk grew (the code draws its own)
    ((440, 480), (30, 24)),
    ((622, 466), (30, 24)),
]
LANTERN_BOX = (318, 278, 466, 428)  # x0, y0, x1, y1
LANTERN = ((391, 352), (72, 76))  # the lantern itself (its box also catches a bit of head)
CROP = (280, 330, 780, 900)  # the body's box in the painting


def poly_mask(shape, pts, feather=3):
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return cv2.GaussianBlur(m, (0, 0), feather).astype(np.float32) / 255


def ell_mask(shape, ells, feather=0):
    m = np.zeros(shape, np.uint8)
    for c, r in ells:
        cv2.ellipse(m, c, r, 0, 0, 360, 255, -1)
    return (cv2.GaussianBlur(m, (0, 0), feather) if feather else m).astype(np.float32) / 255


def felt_fill(rgb, hole):
    """Paint a hole with the surrounding felt: smooth inpaint, then the painting's own grain added back."""
    filled = cv2.inpaint(rgb, (hole > 0.5).astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
    rng = np.random.default_rng(8)
    grain = cv2.GaussianBlur(rng.normal(0, 7, rgb.shape[:2]).astype(np.float32), (0, 0), 0.8)[..., None]
    out = filled.astype(np.float32) + grain * (hole[..., None] > 0.5)
    return out.clip(0, 255).astype(np.uint8)


def save(rgb, alpha, box, path, scale=1.0):
    x0, y0, x1, y1 = box
    a = (alpha[y0:y1, x0:x1] * 255).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], a]), "RGBA")
    if scale != 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im.save(path, "WEBP", quality=92, method=6)
    return im.size


def bbox(alpha, pad=6):
    ys, xs = np.where(alpha > 0.02)
    return (int(max(0, xs.min() - pad)), int(max(0, ys.min() - pad)), int(xs.max() + pad + 1), int(ys.max() + pad + 1))


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    img = Image.open(src).convert("RGB")
    cut = np.array(remove(img, session=new_session("isnet-general-use"), post_process_mask=True))
    rgb = cut[..., :3].copy()
    alpha = cut[..., 3].astype(np.float32) / 255
    shape = alpha.shape
    parts = {}

    # ---- arms and legs: their own painted pieces ----
    limbs = {}
    for kind, table in (("arm", ARMS), ("leg", LEGS)):
        for side, (pts, pivot) in table.items():
            m = poly_mask(shape, pts) * alpha
            box = bbox(m)
            size = save(rgb, m, box, os.path.join(out, f"gloam2-{kind}-{side}.webp"))
            limbs[f"{kind}-{side}"] = m
            parts[f"{kind}_{side}"] = {"size": size, "pivot": [pivot[0] - box[0], pivot[1] - box[1]], "at": [pivot[0] - CROP[0], pivot[1] - CROP[1]]}

    # ---- the body: head + torso silhouette, limbs and face painted out ----
    body_shape = np.clip(ell_mask(shape, [HEAD, TORSO], 2), 0, 1)
    under_limbs = np.zeros(shape, np.float32)
    for m in limbs.values():
        under_limbs = np.maximum(under_limbs, m)
    lantern = ell_mask(shape, [LANTERN], 1)
    # where a limb or the lantern covered the body, the true outline is hidden: trust the drawn silhouette there;
    # everywhere else, trust the cut-out
    covered = np.maximum(under_limbs, lantern) > 0.3
    body_a = body_shape * np.where(covered, 1.0, alpha)
    hole = np.maximum(ell_mask(shape, FACE, 0), np.maximum(under_limbs, lantern) * (body_shape > 0.05))
    # shadows the stalk, lantern and arms painted ON the body: dark pixels near them get repainted too
    v = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 2]
    near = cv2.dilate((np.maximum(under_limbs, lantern) > 0.2).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
    ys = np.mgrid[0 : shape[0], 0 : shape[1]][0]
    head_top = (ys < 418) & (body_shape > 0.5)
    shadow = (v < 120) & (body_shape > 0.5) & (near | head_top) & (ell_mask(shape, FACE[:2], 0) < 0.5)
    shadow = cv2.dilate(shadow.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(np.float32)
    hole = np.maximum(hole, shadow)
    # the old lantern's yellow glow painted on the head (the real lantern moves, so its light is drawn live)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    glow = (hsv[..., 0] > 18) & (hsv[..., 1] > 130) & (ys < 470) & (body_shape > 0.5)
    hole = np.maximum(hole, cv2.dilate(glow.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(np.float32))
    # outside the cut-out the picture is black; spread the body's own colours out there first,
    # so filling holes near the edge never pulls in black
    small = cv2.resize(rgb, (256, 256), interpolation=cv2.INTER_AREA)
    small_out = (cv2.resize(alpha, (256, 256)) < 0.6).astype(np.uint8) * 255
    spread = cv2.resize(cv2.inpaint(small, small_out, 12, cv2.INPAINT_TELEA), (shape[1], shape[0]), interpolation=cv2.INTER_CUBIC)
    base = np.where((alpha > 0.6)[..., None], rgb, spread).astype(np.uint8)
    body_rgb = felt_fill(base, hole)
    # On the head, big filled areas get the head's own smooth shading (a fitted colour field) + grain,
    # so it reads as a clean round painted head instead of a smudge. The muzzle keeps the smooth fill.
    head = ell_mask(shape, [HEAD], 0) > 0.5
    sat = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 1]
    muzzle = ell_mask(shape, [((538, 485), (62, 40))], 0) > 0.5
    yy, xx = np.mgrid[0 : shape[0], 0 : shape[1]].astype(np.float32)
    feats = lambda m: np.stack([np.ones(m.sum()), xx[m] / 1024, yy[m] / 1024, (xx[m] / 1024) ** 2, (xx[m] * yy[m]) / 1024**2, (yy[m] / 1024) ** 2], 1)  # noqa: E731
    valid = head & (hole < 0.5) & (sat > 120) & (alpha > 0.9) & ~muzzle
    coef, *_ = np.linalg.lstsq(feats(valid), rgb[valid].astype(np.float32), rcond=None)
    fillm = head & (hole > 0.5) & ~muzzle
    rng = np.random.default_rng(3)
    grain = cv2.GaussianBlur(rng.normal(0, 9, shape).astype(np.float32), (0, 0), 1.2)
    fitted = feats(fillm) @ coef + grain[fillm][:, None]
    soft = cv2.GaussianBlur(fillm.astype(np.float32), (0, 0), 4)[..., None]
    field = body_rgb.astype(np.float32).copy()
    field[fillm] = fitted
    body_rgb = (body_rgb * (1 - soft) + field * soft).clip(0, 255).astype(np.uint8)
    size = save(body_rgb, body_a, CROP, os.path.join(out, "gloam2-body.webp"))
    parts["body"] = {"size": size}

    # ---- the lantern, lit (as painted) and dark ----
    x0, y0, x1, y1 = LANTERN_BOX
    lan_a = alpha * ell_mask(shape, [LANTERN], 1.5)
    lsize = save(rgb, lan_a, LANTERN_BOX, os.path.join(out, "gloam2-lantern-lit.webp"))
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    # unlit paper: still reads as a paper lantern (pale, cool, a little see-through), just no light in it
    hsv[..., 1] *= 0.32
    hsv[..., 2] = hsv[..., 2] * 0.62 + 18
    dark = cv2.cvtColor(hsv.clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
    dark = (dark * np.array([0.92, 1.0, 1.08])).clip(0, 255).astype(np.uint8)  # a little cooler
    save(dark, lan_a, LANTERN_BOX, os.path.join(out, "gloam2-lantern-dark.webp"))
    parts["lantern"] = {"size": lsize}

    with open(os.path.join(out, "gloam2-parts.json"), "w") as f:
        json.dump(parts, f, indent=2)
    # a check image: body + limbs put back together
    print(json.dumps(parts))


if __name__ == "__main__":
    main()
