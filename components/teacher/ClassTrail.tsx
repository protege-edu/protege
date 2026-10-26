"use client";

/**
 * The class trail: the lesson's path with one shrine per idea, and every student as a small lantern
 * standing where their Gloam is (at the first idea it doesn't get yet). Ember = stuck there.
 * A glance shows where the class is bunched up. The table below holds the same facts, for screen readers.
 */
interface Student {
  id: string;
  nickname: string;
  understanding: Record<string, number>;
  stuck: string[];
  messages: number;
  finished: boolean;
}

export function ClassTrail({ concepts, students }: { concepts: { id: string; name: string }[]; students: Student[] }) {
  const n = concepts.length;
  const W = 1000;
  const H = 170;
  const xAt = (i: number) => 70 + (i * (W - 140)) / n; // shrines at 0..n-1, the overlook (finished) at n
  const yAt = (x: number) => 100 + Math.sin(x / 140) * 10;
  const path = Array.from({ length: 81 }, (_, k) => {
    const x = 40 + (k / 80) * (W - 80);
    return `${k ? "L" : "M"}${x.toFixed(0)} ${yAt(x).toFixed(1)}`;
  }).join(" ");

  // where each student's Gloam waits
  const at = (s: Student) => {
    if (s.finished) return n;
    const i = concepts.findIndex((c) => (s.understanding[c.id] ?? 0) < 3);
    return i === -1 ? n : i;
  };
  const groups = new Map<number, Student[]>();
  for (const s of students.filter((x) => x.messages > 0)) groups.set(at(s), [...(groups.get(at(s)) ?? []), s]);
  const lit = (c: { id: string }) => students.filter((s) => (s.understanding[c.id] ?? 0) === 3).length;
  const summary = [...groups.entries()].map(([i, g]) => `${g.length} at ${i >= n ? "the end" : concepts[i].name}`).join(", ");

  return (
    <figure className="mt-8">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Class trail: ${summary || "nobody has started yet"}.`}>
        <path d={path} fill="none" stroke="var(--t-line)" strokeWidth={10} strokeLinecap="round" />
        <path d={path} fill="none" stroke="var(--t-panel)" strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" />
        {concepts.map((c, i) => {
          const x = xAt(i);
          const y = yAt(x);
          const count = lit(c);
          return (
            <g key={c.id}>
              {/* the shrine: a stone with this idea's candle; brighter the more students lit it */}
              {count > 0 && <circle cx={x} cy={y - 24} r={10 + Math.min(14, count * 2)} fill="var(--color-lantern)" opacity={0.18} />}
              <path d={`M${x - 15} ${y + 8} Q ${x - 16} ${y - 10} ${x - 9} ${y - 14} L ${x + 9} ${y - 14} Q ${x + 16} ${y - 10} ${x + 15} ${y + 8} Z`} fill="#6f8279" />
              <rect x={x - 3.5} y={y - 30} width={7} height={16} rx={2} fill={count ? "#f3e5c7" : "#cfd6cf"} stroke="#8d9a93" strokeWidth={0.8} />
              {count > 0 && <path d={`M${x} ${y - 44} C ${x + 5} ${y - 37}, ${x + 4.5} ${y - 32}, ${x} ${y - 31} C ${x - 4.5} ${y - 32}, ${x - 5} ${y - 37}, ${x} ${y - 44} Z`} fill="var(--color-lantern)" />}
              <text x={x} y={y + 34} textAnchor="middle" className="fill-[var(--t-ink)] text-[15px] font-bold">
                {c.name}
              </text>
              <text x={x} y={y + 52} textAnchor="middle" className="fill-[var(--t-ink-dim)] text-[13px]">
                {count} lit
              </text>
            </g>
          );
        })}
        {[...groups.entries()].map(([i, g]) => {
          const x = i >= n ? W - 50 : xAt(i) - 42;
          const y = yAt(x);
          return g.map((s, k) => {
            // stack students waiting at the same place, two columns
            const lx = x - (k % 3) * 17;
            const ly = y - 14 - Math.floor(k / 3) * 17;
            // only flag "stuck" where they're stuck: on the idea their Gloam is waiting at
            const stuck = i < n && s.stuck.includes(concepts[i].id);
            return (
              <g key={s.id}>
                <title>{`${s.nickname}${s.finished ? ": taught Gloam everything" : stuck ? ": stuck" : ""}`}</title>
                {s.finished && <circle cx={lx} cy={ly} r={11} fill="var(--color-lantern)" opacity={0.3} />}
                <circle cx={lx} cy={ly} r={7} fill={s.finished ? "var(--color-lantern)" : "#e2661d"} stroke="#16302a" strokeWidth={1.4} />
                {stuck && <circle cx={lx + 6} cy={ly + 5} r={3.6} fill="var(--color-ember)" stroke="var(--t-panel)" strokeWidth={1.2} />}
              </g>
            );
          });
        })}
        <text x={W - 50} y={yAt(W - 50) + 34} textAnchor="middle" className="fill-[var(--t-ink-dim)] text-[13px]">
          the end
        </text>
      </svg>
      <figcaption className="mt-1 text-sm text-ink-dim">
        Each orange dot is a student&apos;s Gloam, waiting at the first idea it doesn&apos;t get yet. A red spot means they&apos;re stuck on that idea. Hover a dot to see who it is.
      </figcaption>
    </figure>
  );
}
