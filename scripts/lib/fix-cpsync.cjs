/* eslint-disable @typescript-eslint/no-require-imports -- a plain CommonJS file Node loads with --require */
/**
 * Node 25 on Windows: fs.cpSync silently copies NOTHING when either folder's path has a letter like "é"
 * (this project lives in "Protégé"). OpenNext uses cpSync to build the Cloudflare Worker, so the build
 * breaks. Loaded only for that build (package.json: cf:build), this swaps in a plain copy for those paths.
 * Cloudflare's own build servers and macOS/Linux don't need it.
 */
const fs = require("node:fs");
const path = require("node:path");

const original = fs.cpSync;
const accented = (p) => /[^\x00-\x7f]/.test(String(p));

function copy(src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return;
  const stat = opts.dereference ? fs.statSync(src) : fs.lstatSync(src);
  if (stat.isDirectory()) {
    if (!opts.recursive) throw Object.assign(new Error(`${src} is a directory (not copied)`), { code: "ERR_FS_EISDIR" });
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) copy(path.join(src, name), path.join(dest, name), opts);
  } else if (stat.isSymbolicLink()) {
    if (fs.existsSync(dest)) fs.rmSync(dest, { force: true });
    fs.symlinkSync(fs.readlinkSync(src), dest);
  } else {
    if (fs.existsSync(dest)) {
      if (opts.errorOnExist && opts.force === false) throw Object.assign(new Error(`${dest} already exists`), { code: "ERR_FS_CP_EEXIST" });
      if (opts.force === false) return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.cpSync = function cpSync(src, dest, opts = {}) {
  if (process.platform !== "win32" || (!accented(src) && !accented(dest))) return original.call(fs, src, dest, opts);
  copy(String(src), String(dest), opts);
};
