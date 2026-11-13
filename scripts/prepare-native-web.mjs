// Packs the single-page build (VITE_NATIVE_APP=1 vite build) into dist/native for Capacitor:
// the shell page becomes index.html, and hosting-only files are left out.
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";

// The build writes to dist/client here and to .output/public on other machines (GitHub).
const from = ["dist/client", ".output/public"].find((dir) => existsSync(`${dir}/_shell.html`));
const to = "dist/native";
if (!from) {
  console.error("No _shell.html found: run `VITE_NATIVE_APP=1 vite build` first.");
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
renameSync(`${to}/_shell.html`, `${to}/index.html`);
rmSync(`${to}/_headers`, { force: true });
console.log("Interface packed into dist/native for the Android app.");
