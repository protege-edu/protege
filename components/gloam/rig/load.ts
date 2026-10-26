import type * as PixiNS from "pixi.js";
import { glowCanvas } from "@/components/cinema/textures";
import type { RigSpec } from "@/lib/gloam-rig/spec";
import { GloamActor } from "./GloamActor";

/** Load a rig file's paintings and build the actor. */
export async function loadActor(PIXI: typeof PixiNS, spec: RigSpec): Promise<GloamActor> {
  const [body, lit, dark] = await Promise.all([PIXI.Assets.load(spec.body.src), PIXI.Assets.load(spec.lantern.lit), PIXI.Assets.load(spec.lantern.dark)]);
  const glow = PIXI.Texture.from(glowCanvas(256));
  return new GloamActor(PIXI, spec, { body, lit, dark, glow });
}
