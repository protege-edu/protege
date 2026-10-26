"""
Cut a painted Gloam into an animation rig (one per age style).

  venv\\Scripts\\python art\\gloam2_rig.py <painting.png> <out_dir> [art/rigs/<age>.json]

The measurements of each painting (where the head, arms, legs, face and lantern are) live in art/rigs/<age>.json
(art/grid.py draws a measuring grid). Default: art/rigs/senior.json (CONCEPTS["c2_felt"], seed 8). It makes,
with the file's "prefix" (gloam2 for high school):
  <prefix>-body.webp         the body: no face, no arms, no legs, no stalk (code draws the face; arms/legs move)
  <prefix>-arm-l/r.webp      each painted arm, to swing from its shoulder
  <prefix>-leg-l/r.webp      each painted leg + foot, to step
  <prefix>-lantern-lit.webp  the painted lantern, glowing
  <prefix>-lantern-dark.webp the same lantern, unlit (gold only ever means understanding)
  <prefix>-parts.json        where every part is, for the age style's rig file (lib/age-styles/rigs/)
A human artist can repaint any of these files 1:1.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

# ---- the painting's measurements, from art/rigs/<age>.json (pixels in the 1024 x 1024 painting) ----
#   head, torso: ellipses [centre, radii] that together make the body's silhouette
#   arms, legs: [polygon around the limb (shoulder/hip first), pivot]
#   face: ellipses to paint out (the code draws the face): the eyes first ("eyes" says how many), then the rest
#   lanternBox / lantern: the lantern's box and ellipse; crop: the body's box
#   headTopY: dark shading above this line on the head gets repainted (0 = none); muzzle: an ellipse kept smooth
#   glowOnHead: the painting has the lantern's yellow light on the head (repainted, the real light is live)
RIG = json.load(open(sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(__file__), "rigs", "senior.json")))
pair = lambda e: (tuple(e[0]), tuple(e[1]))  # noqa: E731
HEAD = pair(RIG["head"])
TORSO = pair(RIG["torso"])
ARMS = {k: ([tuple(p) for p in v[0]], tuple(v[1])) for k, v in RIG["arms"].items()}
LEGS = {k: ([tuple(p) for p in v[0]], tuple(v[1])) for k, v in RIG["legs"].items()}
FACE = [pair(e) for e in RIG["face"]]
EYES = RIG.get("eyes", 2)
LANTERN_BOX = tuple(RIG["lanternBox"])
LANTERN = pair(RIG["lantern"])
CROP = tuple(RIG["crop"])
PREFIX = RIG.get("prefix", "gloam2")
# felt paintings hide a repaint in their fuzz (grain 9, a 4px blend); smooth watercolour needs little grain, a wide blend
GRAIN = RIG.get("grain", 9)
SOFT = RIG.get("soft", 4)


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
    grain = cv2.GaussianBlur(rng.normal(0, GRAIN * 0.8, rgb.shape[:2]).astype(np.float32), (0, 0), 0.8)[..., None]
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
            size = save(rgb, m, box, os.path.join(out, f"{PREFIX}-{kind}-{side}.webp"))
            limbs[f"{kind}-{side}"] = m
            parts[f"{kind}_{side}"] = {"size": size, "pivot": [pivot[0] - box[0], pivot[1] - box[1]], "at": [pivot[0] - CROP[0], pivot[1] - CROP[1]]}

    # ---- the body: head + torso silhouette, limbs and face painted out ----
    body_shape = np.clip(ell_mask(shape, [HEAD, TORSO] + [pair(e) for e in RIG.get("extraEllipses", [])], 2), 0, 1)
    # anything else that belongs to the body's outline (a tuft of fuzz, a scarf's loose end)
    for poly in RIG.get("extraPolys", []):
        body_shape = np.maximum(body_shape, poly_mask(shape, [tuple(p) for p in poly], 2))
    under_limbs = np.zeros(shape, np.float32)
    # legsBehind: the game draws the legs behind the body, so where they overlap, the body keeps its own paint
    for name, m in limbs.items():
        if RIG.get("legsBehind") and name.startswith("leg"):
            continue
        under_limbs = np.maximum(under_limbs, m)
    lantern = ell_mask(shape, [LANTERN], 1)
    # where a limb or the lantern covered the body, the true outline is hidden: trust the drawn silhouette there;
    # everywhere else, trust the cut-out
    covered = np.maximum(under_limbs, lantern) > 0.3
    # outlineFromShapeAbove: above this line, the outline is the drawn shape, not the painting's (hair spikes, a stalk)
    above = np.mgrid[0 : shape[0], 0 : shape[1]][0] < RIG.get("outlineFromShapeAbove", 0)
    body_a = body_shape * np.where(covered | above, 1.0, alpha)
    hole = np.maximum(ell_mask(shape, FACE, 0), np.maximum(under_limbs, lantern) * (body_shape > 0.05))
    # repaintAbove: everything on the head above this line is repainted as smooth fur (painted hair, brows, eyes)
    if RIG.get("repaintAbove"):
        top = (np.mgrid[0 : shape[0], 0 : shape[1]][0] < RIG["repaintAbove"]) & (ell_mask(shape, [HEAD], 0) > 0.5)
        hole = np.maximum(hole, top.astype(np.float32))
    # shadows the stalk, lantern and arms painted ON the body: dark pixels near them get repainted too
    v = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 2]
    near = cv2.dilate((np.maximum(under_limbs, lantern) > 0.2).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
    ys = np.mgrid[0 : shape[0], 0 : shape[1]][0]
    head_top = (ys < RIG.get("headTopY", 0)) & (body_shape > 0.5)
    shadow = (v < 120) & (body_shape > 0.5) & (near | head_top) & (ell_mask(shape, FACE[:EYES], 0) < 0.5)
    shadow = cv2.dilate(shadow.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(np.float32)
    hole = np.maximum(hole, shadow)
    # the old lantern's yellow glow painted on the head (the real lantern moves, so its light is drawn live)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    if RIG.get("glowOnHead", False):
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
    muzzle = ell_mask(shape, [pair(RIG["muzzle"])], 0) > 0.5 if RIG.get("muzzle") else np.zeros(shape, bool)
    yy, xx = np.mgrid[0 : shape[0], 0 : shape[1]].astype(np.float32)
    feats = lambda m: np.stack([np.ones(m.sum()), xx[m] / 1024, yy[m] / 1024, (xx[m] / 1024) ** 2, (xx[m] * yy[m]) / 1024**2, (yy[m] / 1024) ** 2], 1)  # noqa: E731
    valid = head & (hole < 0.5) & (sat > 120) & (alpha > 0.9) & ~muzzle
    # fitHueMax: only the body's own colour teaches the fill (not a scarf, not hair)
    if RIG.get("fitHueMax") is not None:
        valid &= (cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 0] <= RIG["fitHueMax"]) & (cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 2] > 110)
    coef, *_ = np.linalg.lstsq(feats(valid), rgb[valid].astype(np.float32), rcond=None)
    fillm = head & (hole > 0.5) & ~muzzle & (not RIG.get("repaintAbove"))
    rng = np.random.default_rng(3)
    grain = cv2.GaussianBlur(rng.normal(0, GRAIN, shape).astype(np.float32), (0, 0), 1.2)
    fitted = feats(fillm) @ coef + grain[fillm][:, None]
    soft = cv2.GaussianBlur(fillm.astype(np.float32), (0, 0), SOFT)[..., None]
    field = body_rgb.astype(np.float32).copy()
    field[fillm] = fitted
    body_rgb = (body_rgb * (1 - soft) + field * soft).clip(0, 255).astype(np.uint8)
    # Smooth (watercolour) paintings: fill every hole on the body from the paint AROUND it (a blurred average
    # of the untouched pixels nearby), so the fill follows the painting's own shading instead of a formula.
    if RIG.get("fill") == "local":
        keep = ((hole < 0.2) & (alpha > 0.9)).astype(np.float32)
        sigma = RIG.get("fillSigma", 22)
        num = cv2.GaussianBlur(rgb.astype(np.float32) * keep[..., None], (0, 0), sigma)
        den = cv2.GaussianBlur(keep, (0, 0), sigma)[..., None] + 1e-4
        local = num / den + cv2.GaussianBlur(rng.normal(0, GRAIN, shape).astype(np.float32), (0, 0), 1.0)[..., None]
        blend = cv2.GaussianBlur((hole > 0.3).astype(np.float32), (0, 0), SOFT)[..., None]
        blend = np.maximum(blend, (hole > 0.5)[..., None].astype(np.float32))
        body_rgb = (body_rgb * (1 - blend) + local * blend).clip(0, 255).astype(np.uint8)
    # repaintAbove: a big repaint can't be guessed from the few pixels left, so it's painted as the body's own
    # median colour with soft round shading (light at the top, darker at the edges, like the painting) and felt grain
    if RIG.get("repaintAbove"):
        hsv_all = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        own = (hsv_all[..., 0] <= RIG.get("fitHueMax", 25)) & (hsv_all[..., 1] > 120) & (hsv_all[..., 2] > 110) & (alpha > 0.9) & (body_shape > 0.5)
        base_col = np.median(rgb[own].astype(np.float32), axis=0)
        (cx, cy), (rx, ry) = HEAD
        d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - (cy - ry * 0.35)) / (ry * 1.25)) ** 2)
        shade = (1.14 - 0.36 * np.clip(d, 0, 1.3) ** 2)[..., None]
        felt = cv2.GaussianBlur(np.random.default_rng(5).normal(0, GRAIN, shape).astype(np.float32), (0, 0), 1.1)[..., None]
        painted = (base_col[None, None, :] * shade + felt).clip(0, 255)
        # reaching a little past the outline (it's see-through there), so the blend never fades at the edge
        grown = ((HEAD[0]), (HEAD[1][0] + 16, HEAD[1][1] + 16))
        region = (np.mgrid[0 : shape[0], 0 : shape[1]][0] < RIG["repaintAbove"]) & (ell_mask(shape, [grown], 0) > 0.5)
        m = cv2.GaussianBlur(region.astype(np.float32), (0, 0), 8)[..., None]
        body_rgb = (body_rgb * (1 - m) + painted * m).clip(0, 255).astype(np.uint8)
    size = save(body_rgb, body_a, CROP, os.path.join(out, f"{PREFIX}-body.webp"))
    parts["body"] = {"size": size}

    # ---- the lantern, lit (as painted) and dark ----
    x0, y0, x1, y1 = LANTERN_BOX
    lan_a = alpha * ell_mask(shape, [LANTERN], 1.5)
    lan_rgb = rgb
    # a lantern hanging away from the body can look like "background" to the cut-out: cut it out on its own then
    if lan_a[y0:y1, x0:x1].mean() < 0.05:
        own = np.array(remove(img.crop(LANTERN_BOX), session=new_session("isnet-general-use"), post_process_mask=True))[..., 3].astype(np.float32) / 255
        lan_a = np.zeros(shape, np.float32)
        lan_a[y0:y1, x0:x1] = own
        lan_a *= ell_mask(shape, [LANTERN], 1.5)
        lan_rgb = np.array(img)  # the first cut-out blanked the lantern's colours: take them from the painting
    lsize = save(lan_rgb, lan_a, LANTERN_BOX, os.path.join(out, f"{PREFIX}-lantern-lit.webp"))
    hsv = cv2.cvtColor(lan_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    # unlit paper: still reads as a paper lantern (pale, cool, a little see-through), just no light in it
    hsv[..., 1] *= 0.32
    hsv[..., 2] = hsv[..., 2] * 0.62 + 18
    dark = cv2.cvtColor(hsv.clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
    dark = (dark * np.array([0.92, 1.0, 1.08])).clip(0, 255).astype(np.uint8)  # a little cooler
    save(dark, lan_a, LANTERN_BOX, os.path.join(out, f"{PREFIX}-lantern-dark.webp"))
    parts["lantern"] = {"size": lsize}

    with open(os.path.join(out, f"{PREFIX}-parts.json"), "w") as f:
        json.dump(parts, f, indent=2)
    # a check image: body + limbs put back together
    print(json.dumps(parts))


if __name__ == "__main__":
    main()
