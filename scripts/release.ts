/**
 * Build the download a teacher runs: one folder (zipped) with Protégé built for production, its own
 * copy of Node, and "Start Protégé" to double-click. Nothing else to install but Ollama, which the
 * launcher helps with the first time.
 *
 *   npm run release          → release/Protege-<windows|mac>.zip, and the installer:
 *                              Protege-Setup.exe (Windows, needs Inno Setup) or Protege.dmg (Mac)
 *
 * Builds into .next-release (never .next), so a running dev server isn't disturbed. Run it on each
 * kind of computer you want a download for (GitHub Actions does Windows and Mac: .github/workflows).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import JSZip from "jszip";
import pkg from "../package.json";

const root = process.cwd();
const os = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "mac" : "linux";
const name = `Protege-${pkg.version}-${os}-${process.arch}`;
const out = path.join(root, "release", name);
const dist = path.join(root, ".next-release");
const step = (s: string) => console.log(`… ${s}`);
/** Copy a folder, file by file (Node's own fs.cpSync crashes on Windows with Node 25) */
function copy(from: string, to: string, skip?: RegExp) {
  if (!fs.statSync(from).isDirectory()) return fs.copyFileSync(from, to);
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip?.test(e.name)) continue;
    const [src, dst] = [path.join(from, e.name), path.join(to, e.name)];
    if (e.isDirectory() || (e.isSymbolicLink() && fs.statSync(src).isDirectory())) copy(src, dst, skip);
    else fs.copyFileSync(src, dst);
  }
}

async function main() {
  step("building Protégé for production (a few minutes)");
  const b = spawnSync("npx next build", { stdio: "inherit", shell: true, env: { ...process.env, PROTEGE_RELEASE: "1", NEXT_TELEMETRY_DISABLED: "1" } });
  if (b.status !== 0) throw new Error("The build failed (see above).");

  step(`putting the download together in release/${name}`);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  // the standalone server (it brings only the libraries it needs), plus its pictures, styles and the database steps
  const standalone = path.join(dist, "standalone");
  const serverDir = fs.existsSync(path.join(standalone, "server.js")) ? standalone : findServer(standalone);
  copy(serverDir, path.join(out, "app"));
  copy(path.join(dist, "static"), path.join(out, "app", ".next-release", "static"));
  // the hashed names Next.js gives native libraries (better-sqlite3-<hash>) are links in the build folder that the
  // standalone copy leaves out: put a real copy of each library under its hashed name (links don't survive a zip)
  const hashed = path.join(dist, "node_modules");
  if (fs.existsSync(hashed)) {
    for (const e of fs.readdirSync(hashed)) {
      const real = path.basename(fs.realpathSync(path.join(hashed, e)));
      copy(path.join(out, "app", "node_modules", real), path.join(out, "app", ".next-release", "node_modules", e));
    }
  }
  // all of the compiled server code (the standalone trace misses its shared chunks with a custom build folder)
  copy(path.join(dist, "server"), path.join(out, "app", ".next-release", "server"), /\.map$|\.nft\.json$/);
  copy(path.join(root, "public"), path.join(out, "app", "public"));
  copy(path.join(root, "drizzle"), path.join(out, "app", "drizzle"));

  // privacy guard: a download must never carry anyone's data
  const leaks = (function find(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? find(path.join(dir, e.name)) : /\.(db|sqlite)(-wal|-shm)?$/i.test(e.name) ? [path.join(dir, e.name)] : []));
  })(out);
  if (leaks.length) throw new Error(`Stopped: the release would contain a database:\n${leaks.join("\n")}`);

  step("bundling the launcher");
  await build({
    entryPoints: [path.join(root, "scripts", "launch.ts")],
    outfile: path.join(out, "launch.js"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    alias: { "@": root },
    define: { PROTEGE_VERSION: JSON.stringify(pkg.version) },
    logLevel: "warning",
  });

  // the jobs for whoever runs Protégé, beside the server (so they use its database library)
  await build({
    entryPoints: [path.join(root, "scripts", "admin.ts")],
    outfile: path.join(out, "app", "admin.js"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    alias: { "@": root, "server-only": path.join(root, "scripts", "lib", "empty.ts") },
    external: ["better-sqlite3"],
    logLevel: "warning",
  });

  step(`adding Node ${process.version} (MIT licence)`);
  const nodeDir = path.join(out, "node");
  fs.mkdirSync(nodeDir);
  fs.copyFileSync(process.execPath, path.join(nodeDir, path.basename(process.execPath)));
  // (a copy doesn't always keep "this is a program" on Mac and Linux)
  if (os !== "windows") fs.chmodSync(path.join(nodeDir, path.basename(process.execPath)), 0o755);
  const license = await fetch(`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`).then((r) => (r.ok ? r.text() : null));
  if (license) fs.writeFileSync(path.join(nodeDir, "LICENSE"), license);

  step("adding the start buttons and the read-me");
  const node = os === "windows" ? "node\\node.exe" : "./node/node";
  const starters: [string, string][] =
    os === "windows"
      ? [
          ["Start Protégé.cmd", `@echo off\r\ntitle Protégé\r\ncd /d "%~dp0"\r\n${node} launch.js %*\r\nif errorlevel 1 pause\r\n`],
          ["Start Protégé online.cmd", `@echo off\r\ntitle Protégé (online)\r\ncd /d "%~dp0"\r\n${node} launch.js --tunnel\r\nif errorlevel 1 pause\r\n`],
          ["Set up voices.cmd", `@echo off\r\ntitle Protégé voices\r\ncd /d "%~dp0"\r\n${node} launch.js --setup-voice\r\npause\r\n`],
        ]
      : [
          ["Start Protégé.command", `#!/bin/sh\ncd "$(dirname "$0")"\n${node} launch.js "$@"\n`],
          ["Start Protégé online.command", `#!/bin/sh\ncd "$(dirname "$0")"\n${node} launch.js --tunnel\n`],
          ["Set up voices.command", `#!/bin/sh\ncd "$(dirname "$0")"\n${node} launch.js --setup-voice\n`],
        ];
  starters.push(
    os === "windows"
      ? ["Restore a backup.cmd", `@echo off\r\ntitle Protégé backups\r\ncd /d "%~dp0"\r\n${node} launch.js --restore\r\npause\r\n`]
      : ["Restore a backup.command", `#!/bin/sh\ncd "$(dirname "$0")"\n${node} launch.js --restore\n`],
  );
  for (const [file, text] of starters) fs.writeFileSync(path.join(out, file), text, { mode: 0o755 });
  for (const f of ["LICENSE", "THIRD-PARTY-NOTICES.md"]) fs.copyFileSync(path.join(root, f), path.join(out, f));
  fs.copyFileSync(path.join(root, "release-files", "READ-ME-FIRST.txt"), path.join(out, "READ ME FIRST.txt"));
  fs.copyFileSync(path.join(root, "release-files", "protege.env.example"), path.join(out, "protege.env.example"));

  step("zipping");
  const zip = new JSZip();
  const add = (dir: string, inZip: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) add(full, `${inZip}/${entry.name}`);
      else zip.file(`${inZip}/${entry.name}`, fs.readFileSync(full), { unixPermissions: fs.statSync(full).mode });
    }
  };
  add(out, name);
  // fixed names, so the website can always link to the newest one (…/releases/latest/download/<name>)
  const zipFile = path.join(root, "release", `Protege-${os}.zip`);
  await new Promise<void>((resolve, reject) =>
    zip
      .generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "DEFLATE", compressionOptions: { level: 6 }, platform: os === "windows" ? "DOS" : "UNIX" })
      .pipe(fs.createWriteStream(zipFile))
      .on("finish", resolve)
      .on("error", reject),
  );
  console.log(`\n✓ ${path.relative(root, zipFile)} (${(fs.statSync(zipFile).size / 1e6).toFixed(0)} MB)`);

  if (os === "windows") windowsInstaller(out);
  if (os === "mac") macApp(out);
}

const sizeOf = (f: string) => `${(fs.statSync(f).size / 1e6).toFixed(0)} MB`;
const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} failed (see above).`);
};

/** Protege-Setup.exe: the one-screen installer (Inno Setup, free; release-files/windows/protege.iss) */
function windowsInstaller(folder: string) {
  const iscc = [
    process.env.ISCC,
    path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Inno Setup 6", "ISCC.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "", "Inno Setup 6", "ISCC.exe"),
    path.join(process.env.ProgramFiles ?? "", "Inno Setup 6", "ISCC.exe"),
  ].find((p) => p && fs.existsSync(p));
  if (!iscc) {
    if (process.env.CI) throw new Error("Inno Setup isn't installed, so the installer can't be built.");
    return console.log("· Skipped the installer: install Inno Setup 6 (free) to build Protege-Setup.exe.");
  }
  step("building the installer (Inno Setup)");
  run(iscc, ["/Q", `/DAppVersion=${pkg.version}`, `/DSourceDir=${folder}`, `/DOutputDir=${path.join(root, "release")}`, path.join(root, "release-files", "windows", "protege.iss")]);
  const exe = path.join(root, "release", "Protege-Setup.exe");
  console.log(`✓ ${path.relative(root, exe)} (${sizeOf(exe)})`);
}

/**
 * Protégé.app in Protege.dmg: drag it to Applications, double-click it. Apple's own tools build it (on a Mac).
 * It's signed "ad hoc" (free): without paying Apple, the first open needs System Settings → Privacy & Security
 * → Open Anyway, once. The website shows how.
 */
function macApp(folder: string) {
  step("building Protégé.app and Protege.dmg");
  const stage = path.join(root, "release", "dmg");
  fs.rmSync(stage, { recursive: true, force: true });
  const app = path.join(stage, "Protégé.app");
  const contents = path.join(app, "Contents");
  copy(folder, path.join(contents, "Resources", "protege"));
  fs.chmodSync(path.join(contents, "Resources", "protege", "node", "node"), 0o755);
  fs.mkdirSync(path.join(contents, "MacOS"), { recursive: true });
  // the app runs the launcher with the Node inside it (exec: quitting the app stops Protégé)
  fs.writeFileSync(path.join(contents, "MacOS", "Protege"), `#!/bin/sh\ncd "$(dirname "$0")/../Resources/protege"\nexec ./node/node launch.js "$@"\n`, { mode: 0o755 });
  fs.writeFileSync(
    path.join(contents, "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Protégé</string>
  <key>CFBundleDisplayName</key><string>Protégé</string>
  <key>CFBundleIdentifier</key><string>dev.pages.protege-edu</string>
  <key>CFBundleExecutable</key><string>Protege</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${pkg.version}</string>
  <key>CFBundleVersion</key><string>${pkg.version}</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
`,
  );
  // the icon: every size Apple wants, from one picture (sips and iconutil come with every Mac)
  const iconset = path.join(stage, "icon.iconset");
  fs.mkdirSync(iconset);
  const icon = path.join(root, "release-files", "mac", "icon-1024.png");
  for (const s of [16, 32, 128, 256, 512]) {
    run("sips", ["-z", String(s), String(s), icon, "--out", path.join(iconset, `icon_${s}x${s}.png`)]);
    run("sips", ["-z", String(s * 2), String(s * 2), icon, "--out", path.join(iconset, `icon_${s}x${s}@2x.png`)]);
  }
  run("iconutil", ["-c", "icns", iconset, "-o", path.join(contents, "Resources", "icon.icns")]);
  fs.rmSync(iconset, { recursive: true });
  run("codesign", ["--force", "--deep", "--sign", "-", app]);
  fs.symlinkSync("/Applications", path.join(stage, "Applications"));
  const dmg = path.join(root, "release", "Protege.dmg");
  run("hdiutil", ["create", "-volname", "Protégé", "-srcfolder", stage, "-ov", "-format", "UDZO", dmg]);
  fs.rmSync(stage, { recursive: true, force: true });
  console.log(`✓ ${path.relative(root, dmg)} (${sizeOf(dmg)})`);
}

/** Next.js puts the server under the project's own path when the project sits inside a bigger folder */
function findServer(dir: string): string {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "node_modules") continue;
    const sub = path.join(dir, entry.name);
    if (fs.existsSync(path.join(sub, "server.js"))) return sub;
    const deeper = findServer(sub);
    if (deeper) return deeper;
  }
  return "";
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
