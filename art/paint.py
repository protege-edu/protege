"""
Paint candidates with local FLUX.1-schnell (ComfyUI must be running).

  venv\\Scripts\\python art\\paint.py valley_lit 4          4 candidates of the lit valley
  venv\\Scripts\\python art\\paint.py gloam 6 --size 1024x1024

Candidates land in C:\\Users\\sonaw\\ProtegeArt\\out\\<name>\\seed-<n>.png for review.
The chosen ones get copied into public/art/ by hand (with their seed noted), so every asset is reproducible.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import comfy  # noqa: E402
import prompts  # noqa: E402

PROMPTS = {
    "valley_dark": prompts.VALLEY_DARK,
    "valley_lit": prompts.VALLEY_LIT,
    "gloam": prompts.GLOAM,
    "gloam_v2": prompts.GLOAM_V2,
    **prompts.CONCEPTS,
    "shrine": prompts.SHRINE,
}

OUT = os.environ.get("ART_OUT", r"C:\Users\sonaw\ProtegeArt\out")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name", choices=PROMPTS)
    ap.add_argument("count", type=int, nargs="?", default=1)
    ap.add_argument("--size", default="1344x768")
    ap.add_argument("--seed", type=int, default=101)
    ap.add_argument("--steps", type=int, default=4)
    a = ap.parse_args()
    w, h = (int(v) for v in a.size.split("x"))
    for i in range(a.count):
        seed = a.seed + i
        path = os.path.join(OUT, a.name, f"seed-{seed}.png")
        secs = comfy.run(comfy.txt2img(PROMPTS[a.name], seed=seed, width=w, height=h, steps=a.steps), path)
        print(f"{path}  ({secs:.0f}s)", flush=True)


if __name__ == "__main__":
    main()
