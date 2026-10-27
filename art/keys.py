"""
The secret-picture key icons (components/join/KeyPad.tsx): cut each chosen painting out of its
background, centre it in a square with a little room around it, and save public/art/keys/<name>.webp.

  venv\\Scripts\\python art\\paint.py key_owl 3 --size 768x768 --seed 301     paint candidates first
  venv\\Scripts\\python art\\keys.py                                          then cut out the chosen ones

The chosen seed for each picture is written down here, so every icon can be made again (or replaced 1:1
by a human artist: any square transparent image works).
"""
import os

import numpy as np
from PIL import Image
from rembg import new_session, remove

OUT = os.environ.get("ART_OUT", os.path.expanduser(os.path.join("~", "ProtegeArt", "out")))
DEST = os.path.join(os.path.dirname(__file__), "..", "public", "art", "keys")
SIZE = 256
# how much of the square the picture fills (the rest is breathing room)
FILL = 0.86

CHOSEN = {
    "moon": 301,
    "fern": 301,
    "lantern": 301,
    "owl": 301,
    "star": 303,
    "mushroom": 302,
    "leaf": 301,
    "moth": 302,
    "stone": 301,
}


def main():
    os.makedirs(DEST, exist_ok=True)
    session = new_session("isnet-general-use")
    for name, seed in CHOSEN.items():
        src = os.path.join(OUT, f"key_{name}", f"seed-{seed}.png")
        cut = remove(Image.open(src).convert("RGB"), session=session, post_process_mask=True)
        a = np.array(cut)[..., 3]
        ys, xs = np.where(a > 8)
        cut = cut.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
        # fit inside the square, keep the shape, centre it
        scale = SIZE * FILL / max(cut.width, cut.height)
        cut = cut.resize((max(1, round(cut.width * scale)), max(1, round(cut.height * scale))), Image.LANCZOS)
        square = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        square.paste(cut, ((SIZE - cut.width) // 2, (SIZE - cut.height) // 2), cut)
        out = os.path.join(DEST, f"{name}.webp")
        square.save(out, "WEBP", quality=88, method=6)
        print(f"{name}: seed {seed} -> {os.path.normpath(out)}")


if __name__ == "__main__":
    main()
