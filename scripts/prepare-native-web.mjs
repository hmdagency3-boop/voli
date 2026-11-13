// Packs the single-page build (VITE_NATIVE_APP=1 vite build) into dist/native for Capacitor:
// the shell page becomes index.html, and hosting-only files are left out.
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";

const from = "dist/client";
const to = "dist/native";
if (!existsSync(`${from}/_shell.html`)) {
  console.error("dist/client/_shell.html is missing: run `VITE_NATIVE_APP=1 vite build` first.");
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
renameSync(`${to}/_shell.html`, `${to}/index.html`);
rmSync(`${to}/_headers`, { force: true });
console.log("Interface packed into dist/native for the Android app.");
