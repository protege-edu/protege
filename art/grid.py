"""
A measuring grid over a painting, for writing rig measurements (art/rigs/*.json).

  venv\\Scripts\\python art\\grid.py <painting.png> <out.png> [x0 y0 x1 y1] [step]

Draws a labelled line every `step` pixels (default 50); with a box, crops to it and zooms 2x for detail.
"""
import sys

from PIL import Image, ImageDraw, ImageFont


def main():
    src, out = sys.argv[1], sys.argv[2]
    box = tuple(int(v) for v in sys.argv[3:7]) if len(sys.argv) >= 7 else None
    step = int(sys.argv[7]) if len(sys.argv) >= 8 else (25 if box else 50)
    im = Image.open(src).convert("RGB")
    x0, y0 = (box[0], box[1]) if box else (0, 0)
    if box:
        im = im.crop(box)
    zoom = 2 if box else 1
    im = im.resize((im.width * zoom, im.height * zoom), Image.LANCZOS)
    d = ImageDraw.Draw(im, "RGBA")
    try:
        font = ImageFont.truetype("arial.ttf", 13)
    except OSError:
        font = ImageFont.load_default()
    first_x = (x0 // step + 1) * step
    for x in range(first_x, x0 + im.width // zoom, step):
        px = (x - x0) * zoom
        d.line([(px, 0), (px, im.height)], fill=(255, 0, 80, 110), width=1)
        d.text((px + 2, 2), str(x), fill=(255, 0, 80, 255), font=font)
    first_y = (y0 // step + 1) * step
    for y in range(first_y, y0 + im.height // zoom, step):
        py = (y - y0) * zoom
        d.line([(0, py), (im.width, py)], fill=(0, 120, 255, 110), width=1)
        d.text((2, py + 2), str(y), fill=(0, 120, 255, 255), font=font)
    im.save(out)


if __name__ == "__main__":
    main()
