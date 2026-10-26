/**
 * Tiny physics for Gloam's rig. Plain maths, no drawing, so it's testable and works with any art.
 *   Spring:   a value that chases a target with a bit of overshoot (eyes, brows, arms, squash...)
 *   Stalk:    the curly stalk as a chain of points that bends, lags and bounces when Gloam moves
 *   Pendulum: the lantern swinging from the tip of the stalk
 */

/** A damped spring. stiffness ~ how fast, damping ~ how little it wobbles. */
export class Spring {
  v = 0;
  constructor(
    public x: number,
    public stiffness = 120,
    public damping = 14,
  ) {}
  step(target: number, dt: number) {
    // semi-implicit Euler, split into small steps so big frames stay stable
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = (target - this.x) * this.stiffness - this.v * this.damping;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }
  kick(velocity: number) {
    this.v += velocity;
  }
}

export interface Pt {
  x: number;
  y: number;
}

/**
 * The stalk: points from the base (on Gloam's head) to the tip (where the lantern hangs).
 * Each point remembers its resting place (the painted curl) relative to the base, and is pulled
 * back toward it, while inertia makes it lag behind when Gloam hops, leans or walks.
 */
export class Stalk {
  pts: Pt[];
  prev: Pt[];
  /** false = snap straight to the resting curl on the next step (first frame, or after a jump) */
  settled = false;
  constructor(
    /** resting shape, relative to the base, base first (in px, y down) */
    public rest: Pt[],
    public stiffness = 0.12,
    public drag = 0.9,
  ) {
    this.pts = rest.map((p) => ({ ...p }));
    this.prev = rest.map((p) => ({ ...p }));
  }
  /** base: where the base is now; angle: how much the head is rotated (rad) */
  step(base: Pt, angle: number, dt: number, sway = 0) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const k = 1 - Math.pow(1 - this.stiffness, dt * 60);
    const n = this.pts.length;
    if (!this.settled) {
      for (let i = 0; i < n; i++) {
        const r = this.rest[i];
        this.pts[i] = { x: base.x + r.x * c - r.y * s, y: base.y + r.x * s + r.y * c };
        this.prev[i] = { ...this.pts[i] };
      }
      this.settled = true;
    }
    for (let i = 0; i < n; i++) {
      // where this point "wants" to be: the rest curl, rotated with the head, plus a gentle breeze
      const r = this.rest[i];
      const f = i / (n - 1);
      const wx = base.x + r.x * c - r.y * s + sway * f * f;
      const wy = base.y + r.x * s + r.y * c;
      if (i === 0) {
        this.prev[0] = { x: wx, y: wy };
        this.pts[0] = { x: wx, y: wy };
        continue;
      }
      const p = this.pts[i];
      const vx = (p.x - this.prev[i].x) * this.drag;
      const vy = (p.y - this.prev[i].y) * this.drag;
      this.prev[i] = { ...p };
      // stiffer near the base, looser near the tip (so the tip whips a little)
      const kk = k * (1 - f * 0.55);
      p.x += vx + (wx - p.x) * kk;
      p.y += vy + (wy - p.y) * kk;
    }
    // keep segment lengths close to the rest lengths (no stretching)
    for (let it = 0; it < 2; it++) {
      for (let i = 1; i < n; i++) {
        const a = this.pts[i - 1];
        const b = this.pts[i];
        const ra = this.rest[i - 1];
        const rb = this.rest[i];
        const want = Math.hypot(rb.x - ra.x, rb.y - ra.y);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const corr = (d - want) / d;
        b.x -= dx * corr * (i === 1 ? 1 : 0.6);
        b.y -= dy * corr * (i === 1 ? 1 : 0.6);
        if (i > 1) {
          a.x += dx * corr * 0.4;
          a.y += dy * corr * 0.4;
        }
      }
    }
    return this.pts;
  }
  tip() {
    return this.pts[this.pts.length - 1];
  }
}

/** The lantern: a pendulum hanging from a moving point. Swings when its anchor accelerates. */
export class Pendulum {
  angle = 0;
  vel = 0;
  private last: Pt | null = null;
  private lastV: Pt = { x: 0, y: 0 };
  constructor(
    public length: number,
    public damping = 1.6,
  ) {}
  step(anchor: Pt, dt: number) {
    if (dt <= 0) return this.angle;
    const v = this.last ? { x: (anchor.x - this.last.x) / dt, y: (anchor.y - this.last.y) / dt } : { x: 0, y: 0 };
    const acc = { x: (v.x - this.lastV.x) / dt, y: (v.y - this.lastV.y) / dt };
    this.last = { ...anchor };
    this.lastV = v;
    const g = 2200; // px/s² feels right at Gloam's scale
    // the anchor accelerating sideways pushes the lantern the other way
    const ax = Math.max(-6000, Math.min(6000, acc.x));
    const ay = Math.max(-6000, Math.min(6000, acc.y));
    const torque = (-(g + ay) * Math.sin(this.angle) - ax * Math.cos(this.angle)) / this.length;
    this.vel += torque * dt;
    this.vel *= Math.exp(-this.damping * dt);
    this.angle = Math.max(-1.2, Math.min(1.2, this.angle + this.vel * dt));
    return this.angle;
  }
  kick(v: number) {
    this.vel += v;
  }
  /** forget the anchor's motion (after a jump), so it doesn't fling */
  reset() {
    this.last = null;
    this.lastV = { x: 0, y: 0 };
  }
}
