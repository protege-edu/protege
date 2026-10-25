"""
Repaint an existing painting with new lighting, keeping its composition (img2img).

  venv\\Scripts\\python art\\repaint.py <source.png> <dark|full> <denoise> <out.png> [seed]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import comfy  # noqa: E402
import prompts  # noqa: E402

MODES = {"dark": prompts.REPAINT_DARK, "full": prompts.REPAINT_FULL}

if __name__ == "__main__":
    src, mode, denoise, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
    seed = int(sys.argv[5]) if len(sys.argv) > 5 else 7
    secs = comfy.run(comfy.img2img(MODES[mode], src, seed=seed, denoise=denoise), out, timeout=3600)
    print(f"{out} ({secs:.0f}s)", flush=True)
