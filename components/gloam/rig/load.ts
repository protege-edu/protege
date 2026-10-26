import type * as PixiNS from "pixi.js";
import { glowCanvas } from "@/components/cinema/textures";
import type { RigSpec } from "@/lib/gloam-rig/spec";
import { GloamActor } from "./GloamActor";

/** Load a rig file's paintings and build the actor. */
export async function loadActor(PIXI: typeof PixiNS, spec: RigSpec): Promise<GloamActor> {
  const srcs = [spec.body.src, spec.lantern.lit, spec.lantern.dark, spec.arms.l.src, spec.arms.r.src, spec.legs.l.src, spec.legs.r.src];
  const [body, lit, dark, armL, armR, legL, legR] = await Promise.all(srcs.map((src) => PIXI.Assets.load<PixiNS.Texture>(src)));
  const glow = PIXI.Texture.from(glowCanvas(256));
  return new GloamActor(PIXI, spec, { body, lit, dark, glow, arms: [armL, armR], legs: [legL, legR] });
}
