"""
Tiny client for a local ComfyUI server (http://127.0.0.1:8188).
Builds FLUX.1-schnell workflows (text-to-image and image-to-image) and saves the results.

Everything runs on this computer. Nothing is uploaded anywhere.
Only uses the Python standard library.
"""
import json
import os
import shutil
import time
import urllib.parse
import urllib.request
import uuid

SERVER = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")
COMFY_DIR = os.environ.get("COMFY_DIR", r"C:\Users\sonaw\ProtegeArt\ComfyUI")

UNET = "flux1-schnell-Q5_K_S.gguf"
T5 = "t5-v1_1-xxl-encoder-Q5_K_M.gguf"
CLIP_L = "clip_l.safetensors"
VAE = "ae.safetensors"


def _post(path, data):
    req = urllib.request.Request(SERVER + path, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def _get(path):
    with urllib.request.urlopen(SERVER + path) as r:
        return json.loads(r.read())


def _base(prompt, seed, steps):
    return {
        "unet": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": UNET}},
        "clip": {"class_type": "DualCLIPLoaderGGUF", "inputs": {"clip_name1": T5, "clip_name2": CLIP_L, "type": "flux"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["clip", 0]}},
        "neg": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["clip", 0]}},
        "sample": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["unet", 0],
                "positive": ["pos", 0],
                "negative": ["neg", 0],
                "seed": seed,
                "steps": steps,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1.0,
            },
        },
        "decode": {"class_type": "VAEDecode", "inputs": {"samples": ["sample", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["decode", 0], "filename_prefix": "protege"}},
    }


def txt2img(prompt, seed=1, width=1344, height=768, steps=4):
    wf = _base(prompt, seed, steps)
    wf["latent"] = {"class_type": "EmptySD3LatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}}
    wf["sample"]["inputs"]["latent_image"] = ["latent", 0]
    return wf


def img2img(prompt, image_path, seed=1, denoise=0.5, steps=4):
    """Repaint an existing picture: same composition, new lighting or mood."""
    name = f"protege_in_{uuid.uuid4().hex[:8]}.png"
    shutil.copy(image_path, os.path.join(COMFY_DIR, "input", name))
    wf = _base(prompt, seed, steps)
    wf["load"] = {"class_type": "LoadImage", "inputs": {"image": name}}
    wf["encode"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["load", 0], "vae": ["vae", 0]}}
    wf["sample"]["inputs"]["latent_image"] = ["encode", 0]
    wf["sample"]["inputs"]["denoise"] = denoise
    return wf


def inpaint(prompt, rgba_path, seed=1, steps=4, denoise=1.0):
    """
    Paint only where the picture is transparent (or half-transparent, for soft edges), keep the rest.
    Used to extend a painting sideways (outpainting) into a long panorama.
    """
    name = f"protege_in_{uuid.uuid4().hex[:8]}.png"
    shutil.copy(rgba_path, os.path.join(COMFY_DIR, "input", name))
    wf = _base(prompt, seed, steps)
    wf["load"] = {"class_type": "LoadImage", "inputs": {"image": name}}  # outputs the picture AND a mask (1 = transparent)
    wf["encode"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["load", 0], "vae": ["vae", 0]}}
    wf["masked"] = {"class_type": "SetLatentNoiseMask", "inputs": {"samples": ["encode", 0], "mask": ["load", 1]}}
    wf["sample"]["inputs"]["latent_image"] = ["masked", 0]
    wf["sample"]["inputs"]["denoise"] = denoise
    return wf


def run(workflow, out_path, timeout=1800):
    """Queue a workflow, wait for it, copy the image to out_path. Returns seconds taken."""
    start = time.time()
    pid = _post("/prompt", {"prompt": workflow, "client_id": "protege"})["prompt_id"]
    while time.time() - start < timeout:
        hist = _get(f"/history/{pid}")
        if pid in hist:
            entry = hist[pid]
            if entry.get("status", {}).get("status_str") == "error":
                raise RuntimeError(json.dumps(entry["status"])[:2000])
            for node in entry["outputs"].values():
                for img in node.get("images", []):
                    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
                    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
                    with urllib.request.urlopen(f"{SERVER}/view?{q}") as r, open(out_path, "wb") as f:
                        f.write(r.read())
                    return time.time() - start
        time.sleep(2)
    raise TimeoutError(f"ComfyUI took longer than {timeout}s")
