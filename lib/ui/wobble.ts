/**
 * Hand-cut shapes. Every panel and button in Protégé is drawn as a path whose edges wobble a little,
 * like paper cut with scissors, instead of a perfect CSS rectangle. The path is built for the element's
 * real size, so it never stretches, and it's seeded, so the same button always has the same edge.
 */

/** Small, fast, seeded random numbers (the same seed always gives the same edge) */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Opts {
  /** Corner radius in px */
  radius?: number;
  /** How far the edge wanders, in px */
  wobble?: number;
  /** Distance between edge points, in px */
  step?: number;
  /** Grow (+) or shrink (-) the shape, e.g. for a focus ring around it */
  inset?: number;
  seed?: number;
}

/**
 * A rounded rectangle with a hand-cut edge, as an SVG path for a w×h box.
 * Points are spaced along the outline and pushed in/out by smooth noise; corners stay rounded.
 */
export function wobblyRect(w: number, h: number, opts: Opts = {}): string {
  const { radius = 10, wobble = 1.3, step = 18, inset = 0, seed = 7 } = opts;
  if (w <= 0 || h <= 0) return "";
  const x0 = -inset;
  const y0 = -inset;
  const W = w + inset * 2;
  const H = h + inset * 2;
  const r = Math.max(0, Math.min(radius + inset, W / 2, H / 2));
  const rand = rng(seed);

  // Walk the outline: 4 straight edges + 4 quarter-circle corners
  const pts: [number, number, number, number][] = []; // x, y, normal x, normal y
  const line = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, nx, ny]);
  };
  const arc = (cx: number, cy: number, a0: number) => {
    const n = Math.max(2, Math.round((r * Math.PI) / 2 / step) + 1);
    for (let i = 0; i < n; i++) {
      const a = a0 + ((Math.PI / 2) * i) / n;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)]);
    }
  };
  line(x0 + r, y0, x0 + W - r, y0, 0, -1);
  arc(x0 + W - r, y0 + r, -Math.PI / 2);
  line(x0 + W, y0 + r, x0 + W, y0 + H - r, 1, 0);
  arc(x0 + W - r, y0 + H - r, 0);
  line(x0 + W - r, y0 + H, x0 + r, y0 + H, 0, 1);
  arc(x0 + r, y0 + H - r, Math.PI / 2);
  line(x0, y0 + H - r, x0, y0 + r, -1, 0);
  arc(x0 + r, y0 + r, Math.PI);

  // Smooth noise: random targets, eased between neighbours, so the edge waves instead of jitters
  const raw = pts.map(() => rand() * 2 - 1);
  const smooth = raw.map((v, i) => (raw[(i - 1 + raw.length) % raw.length] + v * 2 + raw[(i + 1) % raw.length]) / 4);
  const moved = pts.map(([x, y, nx, ny], i) => [x + nx * smooth[i] * wobble, y + ny * smooth[i] * wobble] as const);

  // Closed curve through the points (midpoint quadratic smoothing)
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  const f = (v: number) => v.toFixed(1);
  const start = mid(moved[moved.length - 1], moved[0]);
  let d = `M${f(start[0])} ${f(start[1])}`;
  for (let i = 0; i < moved.length; i++) {
    const p = moved[i];
    const m = mid(p, moved[(i + 1) % moved.length]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return `${d}Z`;
}

/** A speech-panel tail: a slightly crooked triangle from the panel edge toward a point */
export function tail(baseX: number, baseY: number, tipX: number, tipY: number, width = 22, seed = 3): string {
  const rand = rng(seed);
  const dx = tipX - baseX;
  const dy = tipY - baseY;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular to the tail direction
  const px = (-dy / len) * (width / 2);
  const py = (dx / len) * (width / 2);
  const bend = (rand() - 0.5) * 6;
  const f = (v: number) => v.toFixed(1);
  return `M${f(baseX + px)} ${f(baseY + py)}Q${f(baseX + dx * 0.55 + px * 0.2 + bend)} ${f(baseY + dy * 0.55 + py * 0.2)} ${f(tipX)} ${f(tipY)}Q${f(baseX + dx * 0.5 - px * 0.35)} ${f(baseY + dy * 0.5 - py * 0.35 + bend)} ${f(baseX - px)} ${f(baseY - py)}Z`;
}
