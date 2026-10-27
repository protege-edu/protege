import fs from "node:fs";

/** Someone who wants to know how a download is going (the terminal, or the setup page) */
export interface Reporter {
  /** a step starting: "Downloading Gloam's read-aloud voice" */
  say(message: string): void;
  /** bytes so far of the current file (total = 0 when the server doesn't say) */
  progress(got: number, total: number): void;
}

/** Prints to the terminal: a line per step, and 10% marks */
export const terminal: Reporter = (() => {
  let shown = -1;
  return {
    say(message) {
      if (shown >= 0) console.log("");
      shown = -1;
      console.log(message);
    },
    progress(got, total) {
      const pct = total ? Math.floor((got / total) * 100) : -1;
      if (pct >= 0 && pct !== shown && pct % 10 === 0) {
        shown = pct;
        process.stdout.write(`  ${pct}%`);
      }
    },
  };
})();

/** Download a file (to a .part file first, so a broken download never looks finished) */
export async function download(url: string, to: string, report: Reporter = terminal) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Couldn't download ${url} (${res.status})`);
  const total = Number(res.headers.get("content-length") ?? 0);
  const out = fs.createWriteStream(to + ".part");
  let got = 0;
  let last = 0;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    // wait for the disk when it falls behind (a 1.6 GB file shouldn't sit in memory)
    if (!out.write(chunk)) await new Promise<void>((r) => out.once("drain", () => r()));
    got += chunk.length;
    if (got - last > 256 * 1024 || got === total) {
      last = got;
      report.progress(got, total);
    }
  }
  await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())));
  fs.renameSync(to + ".part", to);
  report.progress(got, got);
}
