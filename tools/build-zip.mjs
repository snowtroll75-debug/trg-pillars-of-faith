#!/usr/bin/env node
/**
 * build-zip — the shippable module: module.json, scripts/, module/,
 * packs/ (compiled), packs-source/ (reviewable), tools/ (the harness),
 * README. Never node_modules. Output: ../trg-pillars-of-faith-<version>.zip
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const outDir = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : path.dirname(ROOT);
const out = path.join(outDir, `${manifest.id}-${manifest.version}.zip`);
for (const required of ["module.json", "scripts/pillars-of-faith.mjs", "module/registration.mjs", "packs/pof-races/CURRENT", "packs/pof-classes/CURRENT", "packs/pof-aspects/CURRENT", "packs/pof-alchemical/CURRENT", "tools/verify-foundation.mjs", "tools/verify-classes.mjs", "tools/verify-feats.mjs", "tools/verify-grimoire.mjs", "tools/verify-equipment.mjs", "tools/verify-automation.mjs"]) {
  if (!fs.existsSync(path.join(ROOT, required))) throw new Error(`build-zip: ${required} is missing`);
}
fs.rmSync(out, { force: true });
execFileSync("zip", ["-qr", out, path.basename(ROOT), "-x", `${path.basename(ROOT)}/node_modules/*`, `${path.basename(ROOT)}/node_modules`, "*/.DS_Store", "*/packs/*/LOCK"], { cwd: path.dirname(ROOT) });
console.log(`build-zip: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
