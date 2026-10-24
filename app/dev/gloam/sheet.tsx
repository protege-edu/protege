"use client";

import { GloamPainterly } from "@/components/gloam/GloamPainterly";
import type { GloamMood } from "@/components/gloam/poses";

const MOODS: GloamMood[] = ["asleep", "proud", "confused", "curious", "skeptical", "sheepish", "excited", "eureka", "thinking", "listening", "redirect"];
const LEVELS = [0, 0.4, 1];

export function CharacterSheet() {
  return (
    <main style={{ background: "#0d1512", minHeight: "100vh", padding: 24, color: "#cfd6cc", fontFamily: "monospace" }}>
      {LEVELS.map((b) => (
        <section key={b} style={{ marginBottom: 24 }}>
          <p>lantern {b}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            {MOODS.map((mood) => (
              <figure key={mood} style={{ margin: 0 }}>
                <GloamPainterly mood={mood} brightness={b} className="w-full" />
                <figcaption style={{ textAlign: "center", fontSize: 12 }}>{mood}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
