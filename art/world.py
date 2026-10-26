"""
Make a younger age's painted journey world from its file in art/worlds/<age>.json, in stages
(ComfyUI must be running; stop other heavy Ollama models first, they share the GPU):

  venv\\Scripts\\python art\\world.py start  <age> [count]      paint candidates for where the journey starts
  venv\\Scripts\\python art\\world.py grow   <age> <seed>       grow the chosen start into the journey, one landmark per stretch
  venv\\Scripts\\python art\\world.py finish <age>              heal the seams, relight (faded / full colour), cut depth layers,
                                                               make the trail map, copy it all to public/art/<age>/
  venv\\Scripts\\python art\\world.py shrine <age> [count]      paint candidates for the checkpoint shrine
  venv\\Scripts\\python art\\world.py shrinecut <age> <seed>    cut the chosen shrine out to public/art/<age>/shrine.webp

Everything lands in ART_OUT/world-<age>/ first, so every step can be looked at (and re-made from its seed).
"""
import json
import os
import subprocess
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import comfy  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("ART_OUT", r"C:\Users\sonaw\ProtegeArt\out")
PUBLIC = os.path.join(HERE, "..", "public", "art")
PY = sys.executable


def run(*args):
    print(">", " ".join(os.path.basename(str(a)) for a in args[:2]), flush=True)
    subprocess.run([PY, *map(str, args)], check=True)


def main():
    stage, age = sys.argv[1], sys.argv[2]
    world = json.load(open(os.path.join(HERE, "worlds", f"{age}.json")))
    work = os.path.join(OUT, f"world-{age}")
    os.makedirs(work, exist_ok=True)
    pub = os.path.join(PUBLIC, age)
    os.makedirs(pub, exist_ok=True)

    if stage == "start":
        count = int(sys.argv[3]) if len(sys.argv) > 3 else 3
        prompt = f"{world['base']}, {world['start']}, {world['style']}"
        for seed in range(701, 701 + count):
            out = os.path.join(work, f"start-{seed}.png")
            secs = comfy.run(comfy.txt2img(prompt, seed=seed, width=1344, height=768), out)
            print(f"{out} ({secs:.0f}s)", flush=True)

    elif stage == "grow":
        seed = sys.argv[3]
        start = os.path.join(work, f"start-{seed}.png")
        run(os.path.join(HERE, "panorama.py"), start, os.path.join(work, "pano"), "--seed", "801", "--world", os.path.join(HERE, "worlds", f"{age}.json"))
        run(os.path.join(HERE, "panorama_join.py"), start, os.path.join(work, "pano"), os.path.join(work, "joined.png"))

    elif stage in ("finish", "polish"):
        joined = os.path.join(work, "joined.png")
        W = Image.open(joined).width
        # where each new stretch met the last one (panorama.py: 1344 wide to start, then 672 more each step)
        seams = [1344 + 672 * i - 60 for i in range(len(world["stretches"])) if 1344 + 672 * i < W]
        healed = os.path.join(work, "healed.png")
        if stage == "finish":
            run(os.path.join(HERE, "seams.py"), joined, healed, ",".join(map(str, seams)), "--prompt", f"{world['base']}, {world['style']}")
        # the sky still jumps in colour where stretches meet: smooth the broad colour across each join (detail kept)
        smooth = os.path.join(work, "smooth.png")
        Image.open(healed).save(smooth)
        for x in seams:
            c = x + 56
            run(os.path.join(HERE, "smooth_band.py"), smooth, smooth, str(c - 230), str(c + 230), str(world.get("horizon", 360)))
        dark, lit = os.path.join(work, "dark.png"), os.path.join(work, "lit.png")
        run(os.path.join(HERE, "grade.py"), smooth, dark, lit, world.get("grade", "storybook"))
        run(os.path.join(HERE, "layers.py"), dark, lit, pub, "journey")
        for tag, src in (("dark", dark), ("lit", lit)):
            im = Image.open(src).convert("RGB")
            im.resize((1800, round(1800 * im.height / im.width)), Image.LANCZOS).save(os.path.join(pub, f"journey-map-{tag}.webp"), "WEBP", quality=86, method=6)
        print(f"world {age}: {W} x {Image.open(joined).height}, layers and map in {os.path.normpath(pub)}")

    elif stage == "shrine":
        count = int(sys.argv[3]) if len(sys.argv) > 3 else 3
        for seed in range(41, 41 + count):
            out = os.path.join(work, f"shrine-{seed}.png")
            secs = comfy.run(comfy.txt2img(world["shrine"], seed=seed, width=768, height=768), out)
            print(f"{out} ({secs:.0f}s)", flush=True)

    elif stage == "shrinecut":
        run(os.path.join(HERE, "cutout.py"), os.path.join(work, f"shrine-{sys.argv[3]}.png"), os.path.join(pub, "shrine.webp"), "400")


if __name__ == "__main__":
    main()
