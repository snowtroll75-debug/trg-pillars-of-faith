#!/usr/bin/env node
/**
 * Build the module's compendium packs from tools/content/*.mjs.
 *
 *   node tools/build-packs.mjs            write packs-source/ JSON and compile packs/
 *   node tools/build-packs.mjs --json     write packs-source/ only
 *
 * The JSON under packs-source/ is the reviewable form (one file per
 * document, deterministic ids, stable ordering) and is what the harness
 * reads. The LevelDB under packs/ is what Foundry reads. Both are
 * derived; neither is hand-edited.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PACKS } from "./content/foundation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonOnly = process.argv.includes("--json");

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const declared = new Map(manifest.packs.map((p) => [p.name, p]));

/** A document with its LevelDB keys, and its embedded documents'. */
function keyedDocument(doc, type) {
  const effectsOf = (owner, prefix) => (owner.effects ?? []).map((e) => ({ ...e, _key: `${prefix}${e._id}` }));
  if (type === "Actor") {
    return {
      ...doc,
      _key: `!actors!${doc._id}`,
      items: (doc.items ?? []).map((i) => ({ ...i, _key: `!actors.items!${doc._id}.${i._id}`, effects: effectsOf(i, `!actors.items.effects!${doc._id}.${i._id}.`) })),
      effects: effectsOf(doc, `!actors.effects!${doc._id}.`)
    };
  }
  if (type === "JournalEntry") {
    return { ...doc, _key: `!journal!${doc._id}`, pages: (doc.pages ?? []).map((pg) => ({ ...pg, _key: `!journal.pages!${doc._id}.${pg._id}` })) };
  }
  return { ...doc, _key: `!items!${doc._id}`, effects: effectsOf(doc, `!items.effects!${doc._id}.`) };
}

let total = 0;
for (const pack of PACKS) {
  const entry = declared.get(pack.name);
  if (!entry) throw new Error(`module.json does not declare pack "${pack.name}"`);
  if ((entry.type ?? "Item") !== (pack.type ?? "Item")) throw new Error(`module.json pack "${pack.name}" must be of type ${pack.type ?? "Item"}`);
  if (entry.flags?.["trg-prime"]?.extends !== pack.extends) {
    throw new Error(`module.json pack "${pack.name}" must declare flags.trg-prime.extends = "${pack.extends}"`);
  }
  const srcDir = path.join(ROOT, "packs-source", pack.name);
  fs.rmSync(srcDir, { recursive: true, force: true });
  fs.mkdirSync(srcDir, { recursive: true });

  const seen = new Set();
  for (const doc of pack.docs) {
    if (seen.has(doc._id)) throw new Error(`duplicate id ${doc._id} in ${pack.name}`);
    seen.add(doc._id);
    const file = `${doc.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}_${doc._id}.json`;
    // The CLI packs by `_key`, the LevelDB key Foundry uses for the
    // document and for each embedded document. Items (and their effects)
    // since 0.1.0; Actors, with their items, and JournalEntries, with their
    // pages, since 0.10.0 (Chapter 8's haunts and the GM's guide).
    const keyed = keyedDocument(doc, pack.type ?? "Item");
    fs.writeFileSync(path.join(srcDir, file), `${JSON.stringify(keyed, null, 2)}\n`);
  }
  total += pack.docs.length;
  console.log(`${pack.name}: ${pack.docs.length} document(s) → packs-source/${pack.name}`);

  if (!jsonOnly) {
    const { compilePack } = await import("@foundryvtt/foundryvtt-cli");
    const dest = path.join(ROOT, "packs", pack.name);
    fs.rmSync(dest, { recursive: true, force: true });
    await compilePack(srcDir, dest, { log: false });
    console.log(`  compiled → packs/${pack.name}`);
  }
}
console.log(`build-packs: ${total} documents across ${PACKS.length} packs.`);
