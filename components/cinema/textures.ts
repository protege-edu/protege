/**
 * Small textures the cinematic scene draws itself (no image files needed):
 * soft glows, the organic "light spill" mask, tileable fog and film grain.
 * Made once on a canvas when the scene starts.
 */

// Value noise that wraps around (so fog can tile forever without seams)
function makeNoise(period: number, seed: number) {
  const grid = new Float32Array(period * period);
  let s = seed;
  for (let i = 0; i < grid.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    grid[i] = s / 4294967296;
  }
  const at = (x: number, y: number) => grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * tx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * tx;
    return a + (b - a) * ty;
  };
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * f, y * f) * amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** A soft round glow, white in the middle. Tint it in the scene. */
export function glowCanvas(size = 256) {
  const [c, g] = canvas(size, size);
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.14)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/**
 * The shape of lantern light spreading over the land: bright in the middle, with a soft,
 * uneven, painterly edge (not a perfect circle, light never is). Used as an alpha mask.
 */
export function lightSpillCanvas(size = 512) {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  const noise = makeNoise(16, 7);
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - r) / r;
      // light pools wider than tall: it falls across the ground
      const dy = ((y - r) / r) * 1.35;
      const d = Math.sqrt(dx * dx + dy * dy);
      const n = fbm(noise, (x / size) * 6, (y / size) * 6);
      const edge = d + (n - 0.5) * 0.45;
      const a = Math.max(0, Math.min(1, (1 - edge) / 0.55));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * a * (3 - 2 * a) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Wispy fog that tiles left-to-right forever */
/** A soft left edge: transparent on the left, fading in over the first part (used as a mask) */
export function fadeInCanvas(w = 256, h = 4, over = 0.4) {
  const [c, g] = canvas(w, h);
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(over, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  return c;
}

export function fogCanvas(w = 512, h = 256) {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const period = 8;
  const noise = makeNoise(period, 11);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(noise, (x / w) * period, (y / h) * (period / 2), 5);
      // fade out at the top and bottom of the band
      const band = Math.sin((y / h) * Math.PI);
      const a = Math.max(0, n - 0.38) * 2.2 * band;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Film grain: tiny random speckles, tiles */
export function grainCanvas(size = 192) {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  let s = 99;
  for (let i = 0; i < size * size; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = s / 4294967296;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v > 0.5 ? 255 : 0;
    img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Darkens the corners, like a lens */
export function vignetteCanvas(w = 512, h = 512) {
  const [c, g] = canvas(w, h);
  const grad = g.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.25, w / 2, h * 0.55, Math.max(w, h) * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.75)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  return c;
}
