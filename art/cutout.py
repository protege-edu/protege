"""
Cut a painted prop out of its plain background and crop it tight (rembg, free and local).

  venv\\Scripts\\python art\\cutout.py <painting.png> <out.webp> [max_height]

Prints the cropped size and the crop offset, so measurements made on the painting can be moved into the cut-out.
"""
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove


def main():
    src, out = sys.argv[1], sys.argv[2]
    max_h = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    img = Image.open(src).convert("RGB")
    cut = remove(img, session=new_session("isnet-general-use"), post_process_mask=True)
    a = np.array(cut)[..., 3]
    ys, xs = np.where(a > 8)
    box = (int(xs.min()) - 4, int(ys.min()) - 4, int(xs.max()) + 5, int(ys.max()) + 5)
    cut = cut.crop(box)
    scale = 1.0
    if max_h and cut.height > max_h:
        scale = max_h / cut.height
        cut = cut.resize((round(cut.width * scale), max_h), Image.LANCZOS)
    cut.save(out, "WEBP", quality=90, method=6)
    print(f"size {cut.width}x{cut.height} offset {box[0]},{box[1]} scale {scale:.4f}")


if __name__ == "__main__":
    main()
